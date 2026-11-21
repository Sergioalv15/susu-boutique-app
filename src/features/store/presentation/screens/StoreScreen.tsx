import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { PrimaryButton } from '../../../../ui/components/PrimaryButton';
import { Screen } from '../../../../ui/components/Screen';
import { FadeIn } from '../../../../ui/components/FadeIn';
import { useTheme } from '../../../../core/theme/ThemeProvider';
import { StockCostSubgroup, StoreCategory, StoreDashboardSummary, StorePriceGroup, StoreStockItem } from '../../domain/types';
import { isLowStock, LOW_STOCK_THRESHOLD } from '../../domain/lowStockAlert';
import { stockAdministrationService, storeService } from '../../infrastructure/container';
import { parsePurchaseCost } from '../../domain/stockCost';
import { parseSalePrice } from '../../domain/salePricing';
import { formatEuros, InventoryCostDetails, StoreCard, StockCostSubgroupList, StoreMessage } from '../components/StoreComponents';
import { StoreDashboard } from '../components/StoreDashboard';
import { CategoryNameForm, PriceGroupForm, SubgroupCostForm, SubgroupRemovalForm } from '../components/StockManagementForms';

const PRICE_PRESETS = [300, 500, 700] as const;

type StoreView = 'stock' | 'category' | 'group' | 'add-stock';
type PriceChoice = (typeof PRICE_PRESETS)[number] | 'custom' | null;
type SubgroupOperation = { kind: 'correct-cost' | 'remove-units'; subgroup: StockCostSubgroup } | null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

function confirmStockMutation(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Confirmar', style: 'destructive', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

function groupLabel(group: StorePriceGroup): string {
  return `Grupo ${formatEuros(group.priceCents)}`;
}

function lowStockLabel(group: StoreStockItem): string {
  return group.stockUnits === 0
    ? `Sin stock de ${group.categoryName.toLowerCase()}`
    : `Quedan ${group.stockUnits} ${group.categoryName.toLowerCase()}`;
}

function LowStockNotice({ item, onPress }: { item: StoreStockItem; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Aviso de stock bajo: ${lowStockLabel(item)}. Reponer.`}
      onPress={onPress}
      style={[styles.lowStockNotice, { backgroundColor: theme.colors.card, borderColor: theme.colors.danger, borderRadius: theme.radius.md }]}
    >
      <Feather name="alert-circle" size={20} color={theme.colors.danger} />
      <View style={styles.flex}>
        <Text style={[styles.lowStockTitle, { color: theme.colors.danger }]}>Importante · {lowStockLabel(item)}</Text>
        <Text style={[styles.caption, { color: theme.colors.mutedText }]}>{groupLabel(item)} · Reponer stock</Text>
      </View>
      <Text style={[styles.chevron, { color: theme.colors.mutedText }]}>›</Text>
    </Pressable>
  );
}

function AddTypeButton({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Agregar otro tipo de joya"
      onPress={onPress}
      style={[styles.addTypeButton, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}
    >
      <Feather name="plus" size={16} color={theme.colors.primary} />
      <Text style={[styles.addTypeText, { color: theme.colors.primary }]}>Agregar otro tipo</Text>
    </Pressable>
  );
}

function NewTypeForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (category: StoreCategory) => void;
}) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await storeService.createCategory({ name }));
      setName('');
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <TextInput
        accessibilityLabel="Nombre del nuevo tipo de joya"
        value={name}
        onChangeText={setName}
        placeholder="Ej. Tobilleras"
        placeholderTextColor={theme.colors.mutedText}
        maxLength={40}
        style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radius.md }]}
      />
      {error ? <StoreMessage message={error} error /> : null}
      <PrimaryButton title="Guardar tipo" onPress={() => void save()} busy={busy} disabled={!name.trim()} />
      <Pressable accessibilityRole="button" onPress={onCancel}>
        <Text style={[styles.cancelText, { color: theme.colors.mutedText }]}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

export function StoreScreen() {
  const { theme } = useTheme();
  const [view, setView] = useState<StoreView>('stock');
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [stockItems, setStockItems] = useState<StoreStockItem[]>([]);
  const [dashboard, setDashboard] = useState<StoreDashboardSummary | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedPriceGroupId, setSelectedPriceGroupId] = useState<number | null>(null);
  const [costSubgroups, setCostSubgroups] = useState<StockCostSubgroup[]>([]);
  const [costSubgroupsLoading, setCostSubgroupsLoading] = useState(false);
  const [costSubgroupsError, setCostSubgroupsError] = useState<string | null>(null);
  const [costSubgroupsReloadKey, setCostSubgroupsReloadKey] = useState(0);
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [priceChoice, setPriceChoice] = useState<PriceChoice>(null);
  const [customPrice, setCustomPrice] = useState('');
  const [units, setUnits] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [selectedPhotoDataUrl, setSelectedPhotoDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const stockLocked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [editingPriceGroup, setEditingPriceGroup] = useState(false);
  const [subgroupOperation, setSubgroupOperation] = useState<SubgroupOperation>(null);

  useEffect(() => {
    setShowTypeForm(false);
    setEditingCategory(false);
    setEditingPriceGroup(false);
    setSubgroupOperation(null);
  }, [view]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextCategories, nextStockItems, nextDashboard] = await Promise.all([
        storeService.listCategories(),
        storeService.listStockItems(),
        storeService.getDashboardSummary(),
      ]);
      setCategories(nextCategories);
      setStockItems(nextStockItems);
      setDashboard(nextDashboard);
      return nextStockItems;
    } catch (cause) {
      setError(getErrorMessage(cause));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
    if (view === 'group' && selectedPriceGroupId !== null) {
      setCostSubgroupsReloadKey((current) => current + 1);
    }
  }, [refresh, view, selectedPriceGroupId]));

  useEffect(() => {
    if (view !== 'group' || selectedPriceGroupId === null) {
      setCostSubgroups([]);
      setCostSubgroupsError(null);
      setCostSubgroupsLoading(false);
      return;
    }

    let active = true;
    setCostSubgroupsLoading(true);
    setCostSubgroupsError(null);
    void storeService.listStockCostSubgroups(selectedPriceGroupId)
      .then((subgroups) => { if (active) setCostSubgroups(subgroups); })
      .catch((cause) => {
        if (active) {
          setCostSubgroups([]);
          setCostSubgroupsError(getErrorMessage(cause));
        }
      })
      .finally(() => { if (active) setCostSubgroupsLoading(false); });

    return () => { active = false; };
  }, [view, selectedPriceGroupId, costSubgroupsReloadKey]);

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;
  const selectedPriceGroup = stockItems.find((item) => item.id === selectedPriceGroupId) ?? null;
  const categoryGroups = selectedCategoryId === null
    ? []
    : stockItems.filter((item) => item.categoryId === selectedCategoryId);
  const selectedCostCents = parsePurchaseCost(purchaseCost);
  const selectedPriceCents = priceChoice === 'custom'
    ? parseSalePrice(customPrice)
    : priceChoice;
  const existingFormGroup = stockItems.find((item) =>
    item.categoryId === formCategoryId && item.priceCents === selectedPriceCents,
  ) ?? null;
  const previewPhoto = selectedPhotoDataUrl ?? existingFormGroup?.photoDataUrl ?? '';
  const examplePhoto = selectedPhotoDataUrl ?? existingFormGroup?.photoDataUrl ?? '';
  const lowStockItems = stockItems
    .filter((item) => isLowStock(item.stockUnits))
    .sort((left, right) => left.stockUnits - right.stockUnits);
  const openCategory = (category: StoreCategory) => {
    setSelectedCategoryId(category.id);
    setSelectedPriceGroupId(null);
    setNotice(null);
    setError(null);
    setView('category');
  };

  const openGroup = (item: StoreStockItem) => {
    setSelectedCategoryId(item.categoryId);
    setSelectedPriceGroupId(item.id);
    setNotice(null);
    setError(null);
    setView('group');
  };

  const openAddStock = (categoryId?: number, group?: StorePriceGroup | null) => {
    const nextCategoryId = categoryId ?? selectedCategoryId ?? categories[0]?.id ?? null;
    setFormCategoryId(nextCategoryId);
    if (group) {
      if (PRICE_PRESETS.includes(group.priceCents as (typeof PRICE_PRESETS)[number])) {
        setPriceChoice(group.priceCents as (typeof PRICE_PRESETS)[number]);
        setCustomPrice('');
      } else {
        setPriceChoice('custom');
        setCustomPrice((group.priceCents / 100).toFixed(2));
      }
    } else {
      setPriceChoice(null);
      setCustomPrice('');
    }
    setUnits('');
    setPurchaseCost('');
    setSelectedPhotoDataUrl(null);
    setNotice(null);
    setError(null);
    setView('add-stock');
  };

  const pickExamplePhoto = async () => {
    setError(null);
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Necesitamos permiso para elegir la foto de referencia.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.65,
        base64: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.base64) {
        setError('No se pudo leer la imagen. Prueba con otra imagen.');
        return;
      }
      if (asset.base64.length > 4_000_000) {
        setError('La imagen es demasiado grande. Elige una imagen más ligera.');
        return;
      }
      setSelectedPhotoDataUrl(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  };

  const saveStock = async () => {
    const quantity = /^\d+$/.test(units.trim()) ? Number(units.trim()) : NaN;
    const costCents = parsePurchaseCost(purchaseCost);
    if (!formCategoryId) {
      setError('Elige el tipo de joya.');
      return;
    }
    if (!selectedPriceCents) {
      setError('Elige un grupo de precio.');
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setError('Introduce una cantidad entera mayor que cero.');
      return;
    }
    if (costCents === null) {
      setError('Introduce el coste de compra por unidad, con hasta dos decimales. Cero es válido.');
      return;
    }
    if (!examplePhoto) {
      setError('Elige una imagen de ejemplo para este grupo de precio.');
      return;
    }
    if (stockLocked.current) return;
    stockLocked.current = true;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const group = await storeService.addStock({
        categoryId: formCategoryId,
        priceCents: selectedPriceCents,
        units: quantity,
        unitCostCents: costCents,
        photoDataUrl: selectedPhotoDataUrl,
      });
      const items = await refresh();
      const savedGroup = items?.find((item) => item.id === group.id);
      setSelectedCategoryId(group.categoryId);
      setSelectedPriceGroupId(group.id);
      setNotice(`${quantity} ${quantity === 1 ? 'unidad añadida' : 'unidades añadidas'} · Quedan ${group.stockUnits}.`);
      setView(savedGroup ? 'group' : 'stock');
      setUnits('');
      setPurchaseCost('');
      setSelectedPhotoDataUrl(null);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      stockLocked.current = false;
      setBusy(false);
    }
  };

  const handleTypeSaved = (category: StoreCategory) => {
    setShowTypeForm(false);
    setError(null);
    setNotice(`Tipo de joya "${category.name}" agregado.`);
    setFormCategoryId(category.id);
    setPriceChoice(null);
    setCustomPrice('');
    setSelectedPhotoDataUrl(null);
    void refresh();
  };

  const saveCategoryName = async (name: string) => {
    if (!selectedCategory || stockLocked.current) return;
    stockLocked.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await stockAdministrationService.updateCategory(selectedCategory.id, name);
      setEditingCategory(false);
      setNotice(`Tipo de joya actualizado: ${updated.name}.`);
      await refresh();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      stockLocked.current = false;
      setBusy(false);
    }
  };

  const deleteSelectedCategory = async () => {
    if (!selectedCategory || stockLocked.current) return;
    const groups = stockItems.filter((item) => item.categoryId === selectedCategory.id);
    const unitsToRetire = groups.reduce((sum, group) => sum + group.stockUnits, 0);
    stockLocked.current = true;
    try {
      const confirmed = await confirmStockMutation(
        'Eliminar tipo de joya',
        `Se archivarán ${groups.length} grupos y se retirarán ${unitsToRetire} unidades restantes mediante ajustes. El historial de ventas y movimientos se conservará.`,
      );
      if (!confirmed) return;
      setBusy(true);
      setError(null);
      setNotice(null);
      const result = await stockAdministrationService.deleteCategory(selectedCategory.id);
      setSelectedCategoryId(null);
      setSelectedPriceGroupId(null);
      setView('stock');
      setNotice(result.status === 'archived'
        ? `Tipo archivado; ${result.adjustedUnits} unidades retiradas con ajustes.`
        : 'Tipo de joya eliminado.');
      await refresh();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      stockLocked.current = false;
      setBusy(false);
    }
  };

  const savePriceGroupPrice = async (value: string, photoDataUrl: string | null) => {
    if (!selectedPriceGroup || stockLocked.current) return;
    const priceCents = parseSalePrice(value);
    if (priceCents === null) {
      setError('Introduce un precio de venta mayor que cero, con hasta dos decimales.');
      return;
    }

    stockLocked.current = true;
    try {
      if (priceCents !== selectedPriceGroup.priceCents) {
        const confirmed = await confirmStockMutation(
          'Cambiar precio del grupo',
          'Se conservará el grupo anterior para el historial. El stock restante y sus subgrupos de coste se trasladarán al nuevo precio.',
        );
        if (!confirmed) return;
      }
      setBusy(true);
      setError(null);
      setNotice(null);
      const result = await stockAdministrationService.updatePriceGroup({
        priceGroupId: selectedPriceGroup.id,
        priceCents,
        sortOrder: selectedPriceGroup.sortOrder,
        photoDataUrl,
      });
      setEditingPriceGroup(false);
      setSelectedPhotoDataUrl(null);
      await refresh();
      setSelectedCategoryId(result.categoryId);
      setSelectedPriceGroupId(result.id);
      setCostSubgroupsReloadKey((current) => current + 1);
      setView('group');
      setNotice(result.status === 'versioned'
        ? 'Nuevo grupo creado; el anterior se conserva en el historial y el stock se trasladó.'
        : 'Grupo actualizado.');
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      stockLocked.current = false;
      setBusy(false);
    }
  };

  const deleteSelectedPriceGroup = async () => {
    if (!selectedPriceGroup || stockLocked.current) return;
    stockLocked.current = true;
    try {
      const confirmed = await confirmStockMutation(
        'Eliminar grupo de precio',
        `Se retirarán ${selectedPriceGroup.stockUnits} unidades restantes mediante ajustes y el grupo se archivará si tiene historial. Las ventas anteriores se conservarán.`,
      );
      if (!confirmed) return;
      setBusy(true);
      setError(null);
      setNotice(null);
      const result = await stockAdministrationService.deletePriceGroup(selectedPriceGroup.id);
      setSelectedPriceGroupId(null);
      setView('category');
      setNotice(result.status === 'archived'
        ? `Grupo archivado; ${result.adjustedUnits} unidades retiradas con ajustes.`
        : 'Grupo de precio eliminado.');
      await refresh();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      stockLocked.current = false;
      setBusy(false);
    }
  };

  const saveSubgroupCost = async (value: string, unknown: boolean) => {
    if (!selectedPriceGroup || subgroupOperation?.kind !== 'correct-cost' || stockLocked.current) return;
    const unitCostCents = unknown ? null : parsePurchaseCost(value);
    if (!unknown && unitCostCents === null) {
      setError('Introduce un coste válido o elige coste desconocido.');
      return;
    }
    const subgroup = subgroupOperation.subgroup;
    if (subgroup.unitCostCents === unitCostCents) {
      setError('El subgrupo ya tiene ese coste.');
      return;
    }

    stockLocked.current = true;
    try {
      const confirmed = await confirmStockMutation(
        'Corregir coste del subgrupo',
        `Se reclasificarán sus ${subgroup.remainingUnits} unidades restantes. Las ventas registradas no cambiarán y se crearán movimientos de ajuste.`,
      );
      if (!confirmed) return;
      setBusy(true);
      setError(null);
      setNotice(null);
      const result = await stockAdministrationService.correctSubgroupCost({
        priceGroupId: selectedPriceGroup.id,
        subgroupId: subgroup.subgroupId,
        unitCostCents,
      });
      setSubgroupOperation(null);
      setNotice(`${result.unitsMoved} unidades reclasificadas en un subgrupo de coste ${unitCostCents === null ? 'desconocido' : formatEuros(unitCostCents)}.`);
      await refresh();
      setCostSubgroupsReloadKey((current) => current + 1);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      stockLocked.current = false;
      setBusy(false);
    }
  };

  const saveSubgroupRemoval = async (unitsText: string, note: string) => {
    if (!selectedPriceGroup || subgroupOperation?.kind !== 'remove-units' || stockLocked.current) return;
    const unitsToRemove = /^\d+$/.test(unitsText.trim()) ? Number(unitsText.trim()) : NaN;
    const subgroup = subgroupOperation.subgroup;
    if (!Number.isSafeInteger(unitsToRemove) || unitsToRemove <= 0 || unitsToRemove > subgroup.remainingUnits) {
      setError('Introduce una cantidad entera que no supere las unidades del subgrupo.');
      return;
    }
    if (!note.trim()) {
      setError('Escribe el motivo del ajuste.');
      return;
    }

    stockLocked.current = true;
    try {
      const confirmed = await confirmStockMutation(
        'Retirar unidades del subgrupo',
        `Se retirarán ${unitsToRemove} unidades de este subgrupo y quedará un movimiento de ajuste en el historial.`,
      );
      if (!confirmed) return;
      setBusy(true);
      setError(null);
      setNotice(null);
      await stockAdministrationService.removeSubgroupUnits({
        priceGroupId: selectedPriceGroup.id,
        subgroupId: subgroup.subgroupId,
        units: unitsToRemove,
        note,
      });
      setSubgroupOperation(null);
      setNotice(`${unitsToRemove} unidades retiradas con un ajuste.`);
      await refresh();
      setCostSubgroupsReloadKey((current) => current + 1);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      stockLocked.current = false;
      setBusy(false);
    }
  };

  const goBack = () => {
    setError(null);
    if (view === 'add-stock') {
      setView(selectedPriceGroupId ? 'group' : selectedCategoryId ? 'category' : 'stock');
      return;
    }
    if (view === 'group') {
      setSelectedPriceGroupId(null);
      setView('category');
      return;
    }
    setSelectedCategoryId(null);
    setSelectedPriceGroupId(null);
    setView('stock');
  };

  const formInputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      color: theme.colors.text,
    },
  ];

  return (
    <Screen keyboardAware contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {view !== 'stock' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={goBack}>
            <Text style={[styles.backLabel, { color: theme.colors.primary }]}>‹ Volver</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.serifFamily }]}>
          {view === 'stock' ? 'Tienda' : view === 'category' ? selectedCategory?.name : view === 'group' ? groupLabel(selectedPriceGroup!) : 'Agregar stock'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>
          {view === 'stock' ? 'Stock, ventas y beneficios' : view === 'category' ? 'Grupos de precio' : view === 'group' ? selectedCategory?.name : 'Tipo de joya · Precio · Cantidad · Foto'}
        </Text>
      </View>

      {error ? <StoreMessage message={error} error /> : null}
      {notice ? <StoreMessage message={notice} /> : null}
      {loading ? <Text style={[styles.status, { color: theme.colors.mutedText }]}>Cargando stock…</Text> : null}

      <FadeIn key={view}>
      {!loading && view === 'stock' ? (
        <View style={styles.sectionList}>
          {dashboard ? <StoreDashboard stock={stockItems} sales={dashboard} /> : null}
          {lowStockItems.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.danger }]}>Importante · stock bajo (≤ {LOW_STOCK_THRESHOLD})</Text>
              {lowStockItems.map((item) => (
                <LowStockNotice key={`low-${item.id}`} item={item} onPress={() => openGroup(item)} />
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Stock por tipo de joya</Text>
            {categories.length === 0 ? (
              <StoreMessage message="No hay tipos de joya configurados." />
            ) : (
              <View style={styles.categoryGrid}>
                {categories.map((category) => {
                  const groups = stockItems.filter((item) => item.categoryId === category.id);
                  const totalUnits = groups.reduce((total, group) => total + group.stockUnits, 0);
                  return (
                    <StoreCard
                      key={category.id}
                      onPress={() => openCategory(category)}
                      accessibilityLabel={`Ver stock de ${category.name}`}
                    >
                      <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>{category.name}</Text>
                      <Text style={[styles.caption, { color: theme.colors.mutedText }]}>
                        {totalUnits} {totalUnits === 1 ? 'unidad' : 'unidades'} · {groups.length} {groups.length === 1 ? 'grupo' : 'grupos'}
                      </Text>
                    </StoreCard>
                  );
                })}
              </View>
            )}
            {showTypeForm ? (
              <NewTypeForm onCancel={() => setShowTypeForm(false)} onSaved={handleTypeSaved} />
            ) : (
              <AddTypeButton onPress={() => setShowTypeForm(true)} />
            )}
          </View>
          <PrimaryButton title="Agregar stock" onPress={() => openAddStock()} />
        </View>
      ) : null}

      {!loading && view === 'category' ? (
        <View style={styles.sectionList}>
          {categoryGroups.length === 0 ? (
            <StoreMessage message="Todavía no hay grupos de precio para este tipo de joya." />
          ) : (
            <View style={styles.groupGrid}>
              {categoryGroups.map((group) => (
                <StoreCard
                  key={group.id}
                  onPress={() => openGroup(group)}
                  accessibilityLabel={`${groupLabel(group)}, ${group.stockUnits} unidades`}
                  style={styles.groupCard}
                >
                  <ImagePreview photoDataUrl={group.photoDataUrl} style={styles.groupPhoto} />
                  <View style={styles.groupCardCopy}>
                    <Text style={[styles.groupTitle, { color: theme.colors.text }]}>{groupLabel(group)}</Text>
                    <Text style={[styles.caption, { color: theme.colors.mutedText }]}>
                      {group.stockUnits} {group.stockUnits === 1 ? 'unidad' : 'unidades'}
                    </Text>
                    <InventoryCostDetails item={group} />
                    {isLowStock(group.stockUnits) ? (
                      <Text style={[styles.lowStockCaption, { color: theme.colors.danger }]}>Stock bajo</Text>
                    ) : null}
                  </View>
                </StoreCard>
              ))}
            </View>
          )}
          {selectedCategory ? <View style={styles.managementActions}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setEditingCategory(true)} style={styles.managementAction}>
              <Text style={{ color: theme.colors.primary }}>Editar tipo</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void deleteSelectedCategory()} style={styles.managementAction}>
              <Text style={{ color: theme.colors.danger }}>Eliminar tipo</Text>
            </Pressable>
          </View> : null}
          {editingCategory && selectedCategory ? <CategoryNameForm
            key={`category-${selectedCategory.id}`}
            initialName={selectedCategory.name}
            busy={busy}
            onSave={(name) => void saveCategoryName(name)}
            onCancel={() => setEditingCategory(false)}
          /> : null}
          <PrimaryButton title="Agregar stock" onPress={() => openAddStock(selectedCategoryId ?? undefined)} />
        </View>
      ) : null}

      {!loading && view === 'group' && selectedPriceGroup ? (
        <View style={styles.detail}>
          <ImagePreview photoDataUrl={selectedPriceGroup.photoDataUrl} style={styles.detailPhoto} />
          <Text style={[styles.detailPrice, { color: theme.colors.primary }]}>{groupLabel(selectedPriceGroup)}</Text>
          <View style={[styles.detailStock, { borderColor: theme.colors.border }]}>
            <Text style={[styles.caption, { color: theme.colors.mutedText }]}>Unidades disponibles</Text>
            <Text style={[styles.stockNumber, { color: theme.colors.text }]}>{selectedPriceGroup.stockUnits}</Text>
          </View>
          <InventoryCostDetails item={selectedPriceGroup} />
          <StockCostSubgroupList
            title="Subgrupos por coste de compra"
            subgroups={costSubgroups}
            isOwner
            loading={costSubgroupsLoading}
            error={costSubgroupsError}
            onCorrectCost={(subgroup) => {
              setError(null);
              setSubgroupOperation({ kind: 'correct-cost', subgroup });
            }}
            onRemoveUnits={(subgroup) => {
              setError(null);
              setSubgroupOperation({ kind: 'remove-units', subgroup });
            }}
          />
          {subgroupOperation?.kind === 'correct-cost' ? <SubgroupCostForm
            key={`cost-${subgroupOperation.subgroup.subgroupId}`}
            subgroup={subgroupOperation.subgroup}
            busy={busy}
            onSave={(value, unknown) => void saveSubgroupCost(value, unknown)}
            onCancel={() => setSubgroupOperation(null)}
          /> : null}
          {subgroupOperation?.kind === 'remove-units' ? <SubgroupRemovalForm
            key={`remove-${subgroupOperation.subgroup.subgroupId}`}
            subgroup={subgroupOperation.subgroup}
            busy={busy}
            onSave={(quantity, note) => void saveSubgroupRemoval(quantity, note)}
            onCancel={() => setSubgroupOperation(null)}
          /> : null}
          <View style={styles.managementActions}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setSelectedPhotoDataUrl(null); setEditingPriceGroup(true); }} style={styles.managementAction}>
              <Text style={[styles.managementActionText, { color: theme.colors.primary }]}>Editar precio</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void deleteSelectedPriceGroup()} style={styles.managementAction}>
              <Text style={[styles.managementActionText, { color: theme.colors.danger }]}>Eliminar grupo</Text>
            </Pressable>
          </View>
          {editingPriceGroup ? <PriceGroupForm
            key={`price-${selectedPriceGroup.id}`}
            priceCents={selectedPriceGroup.priceCents}
            currentPhotoDataUrl={selectedPriceGroup.photoDataUrl}
            selectedPhotoDataUrl={selectedPhotoDataUrl}
            busy={busy}
            onPickPhoto={() => void pickExamplePhoto()}
            onSave={(value, photoDataUrl) => void savePriceGroupPrice(value, photoDataUrl)}
            onCancel={() => { setEditingPriceGroup(false); setSelectedPhotoDataUrl(null); }}
          /> : null}
          {isLowStock(selectedPriceGroup.stockUnits) ? (
            <LowStockNotice
              item={selectedPriceGroup}
              onPress={() => openAddStock(selectedPriceGroup.categoryId, selectedPriceGroup)}
            />
          ) : null}
          <PrimaryButton title="Agregar stock a este grupo" onPress={() => openAddStock(selectedPriceGroup.categoryId, selectedPriceGroup)} />
        </View>
      ) : null}

      {!loading && view === 'add-stock' ? (
        <View style={styles.sectionList}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tipo de joya</Text>
            <View style={styles.optionList}>
              {categories.map((category) => (
                <StoreCard
                  key={category.id}
                  onPress={() => {
                    setFormCategoryId(category.id);
                    setPriceChoice(null);
                    setCustomPrice('');
                    setSelectedPhotoDataUrl(null);
                  }}
                  selected={formCategoryId === category.id}
                >
                  <Text style={[styles.optionText, { color: theme.colors.text }]}>{category.name}</Text>
                </StoreCard>
              ))}
            </View>
            {showTypeForm ? (
              <NewTypeForm onCancel={() => setShowTypeForm(false)} onSaved={handleTypeSaved} />
            ) : (
              <AddTypeButton onPress={() => setShowTypeForm(true)} />
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Grupo de precio</Text>
            <View style={styles.priceOptions}>
              {PRICE_PRESETS.map((priceCents) => (
                <StoreCard
                  key={priceCents}
                  onPress={() => {
                    setPriceChoice(priceCents);
                    setCustomPrice('');
                    setSelectedPhotoDataUrl(null);
                  }}
                  selected={priceChoice === priceCents}
                  style={styles.priceOption}
                >
                  <Text style={[styles.optionText, { color: theme.colors.text }]}>{formatEuros(priceCents)}</Text>
                </StoreCard>
              ))}
              <StoreCard
                onPress={() => {
                  setPriceChoice('custom');
                  setSelectedPhotoDataUrl(null);
                }}
                selected={priceChoice === 'custom'}
                style={styles.priceOption}
              >
                <Text style={[styles.optionText, { color: theme.colors.text }]}>Otro precio</Text>
              </StoreCard>
            </View>
            {priceChoice === 'custom' ? (
              <TextInput
                accessibilityLabel="Otro precio en euros"
                value={customPrice}
                onChangeText={setCustomPrice}
                keyboardType="decimal-pad"
                placeholder="Precio en euros"
                placeholderTextColor={theme.colors.mutedText}
                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radius.md }]}
              />
            ) : null}
          </View>

          {existingFormGroup ? (
            <StoreMessage message={`Este grupo ya existe: sus unidades se sumarán al stock actual (${existingFormGroup.stockUnits}). Si cambia el coste de compra, se añadirá un subgrupo distinto.`} />
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Coste de compra por unidad (€)</Text>
            <TextInput accessibilityLabel="Coste de compra por unidad en euros" value={purchaseCost} onChangeText={setPurchaseCost}
              keyboardType="decimal-pad" placeholder="Ej. 1,50 · Cero si fue gratis" placeholderTextColor={theme.colors.mutedText} style={formInputStyle} />
            <Text style={[styles.caption, { color: theme.colors.mutedText }]}>Lo que pagaste al comprar cada joya. Separado del precio de venta.</Text>
            {selectedCostCents !== null && selectedPriceCents ? <Text style={{ color: selectedPriceCents < selectedCostCents! ? theme.colors.danger : theme.colors.text }}>
              {selectedPriceCents < selectedCostCents! ? 'Pérdida bruta prevista' : 'Beneficio bruto previsto'} por unidad · {formatEuros(Math.abs(selectedPriceCents - selectedCostCents!))} a precio base
            </Text> : null}
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Cantidad</Text>
            <TextInput
              accessibilityLabel="Cantidad de unidades"
              value={units}
              onChangeText={setUnits}
              keyboardType="number-pad"
              placeholder="Unidades recibidas"
              placeholderTextColor={theme.colors.mutedText}
              style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radius.md }]}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Foto de ejemplo</Text>
            <Text style={[styles.caption, { color: theme.colors.mutedText }]}>Una foto por grupo de precio; no una foto por unidad.</Text>
            {previewPhoto ? (
              <View style={styles.photoField}>
                <Image source={{ uri: previewPhoto }} style={styles.formPhoto} resizeMode="cover" />
                <Pressable accessibilityRole="button" onPress={() => void pickExamplePhoto()}>
                  <Text style={[styles.photoLink, { color: theme.colors.primary }]}>
                    {selectedPhotoDataUrl ? 'Cambiar foto' : 'Actualizar foto de ejemplo'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Elegir foto de ejemplo"
                onPress={() => void pickExamplePhoto()}
                style={[styles.photoPicker, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}
              >
                <Feather name="image" size={24} color={theme.colors.mutedText} />
                <Text style={[styles.photoLink, { color: theme.colors.primary }]}>Elegir foto de ejemplo</Text>
              </Pressable>
            )}
          </View>

          <PrimaryButton
            title="Guardar stock"
            onPress={() => void saveStock()}
            busy={busy}
            disabled={!formCategoryId || !selectedPriceCents || !units.trim() || !previewPhoto || selectedCostCents === null}
          />
          <Pressable accessibilityRole="button" onPress={goBack}>
            <Text style={[styles.cancelText, { color: theme.colors.mutedText }]}>Cancelar</Text>
          </Pressable>
        </View>
      ) : null}
      </FadeIn>
    </Screen>
  );
}

function ImagePreview({ photoDataUrl, style }: { photoDataUrl: string; style: object }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.card }, style]}>
      {photoDataUrl ? (
        <Image source={{ uri: photoDataUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <Feather name="image" size={28} color={theme.colors.mutedText} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    gap: 20,
    paddingBottom: 32,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 34,
  },
  subtitle: {
    fontSize: 15,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 4,
  },
  sectionList: {
    gap: 18,
  },
  section: {
    gap: 10,
  },
  managementActions: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  managementAction: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#D8CEC2',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  managementActionText: {
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryTitle: {
    fontSize: 19,
    fontWeight: '600',
  },
  caption: {
    fontSize: 14,
    lineHeight: 19,
  },
  lowStockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    padding: 12,
  },
  lowStockTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  lowStockCaption: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  flex: {
    flex: 1,
  },
  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  groupCard: {
    width: '48%',
    minHeight: 190,
    alignItems: 'stretch',
    overflow: 'hidden',
    padding: 0,
  },
  groupPhoto: {
    width: '100%',
    height: 112,
  },
  groupCardCopy: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  groupTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 26,
  },
  detail: {
    alignItems: 'center',
    gap: 16,
  },
  detailPhoto: {
    width: '100%',
    maxWidth: 360,
    height: 300,
    borderRadius: 12,
  },
  detailPrice: {
    fontSize: 26,
    fontWeight: '700',
  },
  detailStock: {
    alignItems: 'center',
    gap: 4,
    padding: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  stockNumber: {
    fontSize: 30,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  optionList: {
    gap: 8,
  },
  priceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceOption: {
    minWidth: 82,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addTypeButton: {
    minHeight: 52,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  addTypeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 17,
  },
  photoPicker: {
    minHeight: 120,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  photoField: {
    gap: 8,
  },
  formPhoto: {
    width: 160,
    height: 160,
    borderRadius: 10,
  },
  photoLink: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelText: {
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 15,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  status: {
    fontSize: 15,
    paddingVertical: 16,
  },
});
