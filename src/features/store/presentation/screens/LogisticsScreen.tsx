import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { PrimaryButton } from '../../../../ui/components/PrimaryButton';
import { Screen } from '../../../../ui/components/Screen';
import { useTheme } from '../../../../core/theme/ThemeProvider';
import { useSuppliers } from '../../../suppliers/presentation/hooks/useSuppliers';
import { StoreCategory, StorePriceGroup, StockMovement } from '../../domain/types';
import { storeService } from '../../infrastructure/container';
import { formatEuros, StoreCard, StoreMessage } from '../components/StoreComponents';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo guardar el movimiento.';
}

function movementLabel(movement: StockMovement): string {
  if (movement.movementType === 'entrada') return 'Entrada';
  if (movement.movementType === 'venta') return 'Venta';
  return 'Ajuste';
}

function movementDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString('es-ES');
  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function LogisticsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const suppliersState = useSuppliers();
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [priceGroups, setPriceGroups] = useState<StorePriceGroup[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedPriceGroupId, setSelectedPriceGroupId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [units, setUnits] = useState('');
  const [note, setNote] = useState('');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextCategories, nextMovements] = await Promise.all([
        storeService.listCategories(),
        storeService.listRecentMovements(25),
      ]);
      setCategories(nextCategories);
      setMovements(nextMovements);
      setSelectedCategoryId((current) => current ?? nextCategories[0]?.id ?? null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadGroups = useCallback(async (categoryId: number) => {
    try {
      const nextGroups = await storeService.listPriceGroups(categoryId);
      setPriceGroups(nextGroups);
      setSelectedPriceGroupId((current) =>
        nextGroups.some((group) => group.id === current) ? current : nextGroups[0]?.id ?? null,
      );
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    if (selectedCategoryId === null) {
      setPriceGroups([]);
      setSelectedPriceGroupId(null);
      return;
    }
    void loadGroups(selectedCategoryId);
  }, [loadGroups, selectedCategoryId]);

  useFocusEffect(useCallback(() => {
    if (!selectedCategoryId) return;
    let mounted = true;
    void Promise.all([
      storeService.listPriceGroups(selectedCategoryId),
      storeService.listRecentMovements(25),
    ]).then(([nextGroups, nextMovements]) => {
      if (!mounted) return;
      setPriceGroups(nextGroups);
      setMovements(nextMovements);
    }).catch((cause) => {
      if (mounted) setError(errorMessage(cause));
    });
    return () => {
      mounted = false;
    };
  }, [selectedCategoryId]));

  const addStock = async () => {
    const quantity = Number(units.trim());
    if (!selectedPriceGroupId) {
      setError('Elegí un grupo de precio.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError('Ingresá una cantidad entera mayor que cero.');
      return;
    }
    if (busy) return;

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await storeService.receiveStock({
        priceGroupId: selectedPriceGroupId,
        units: quantity,
        supplierId,
        note,
      });
      setPriceGroups((current) => current.map((group) => group.id === updated.id ? updated : group));
      setUnits('');
      setNote('');
      setSuccess(`${quantity} ${quantity === 1 ? 'unidad añadida' : 'unidades añadidas'}. Stock actual: ${updated.stockUnits}.`);
      setMovements(await storeService.listRecentMovements(25));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      color: theme.colors.text,
    },
  ];

  return (
    <Screen topInset keyboardAware contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.serifFamily }]}>Logística</Text>
        <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>Entradas y movimientos de stock</Text>
      </View>

      {error ? <StoreMessage message={error} error /> : null}
      {success ? <StoreMessage message={success} /> : null}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Registrar entrada</Text>
        {loading ? <Text style={[styles.helpText, { color: theme.colors.mutedText }]}>Cargando…</Text> : null}

        <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Categoría</Text>
        <View style={styles.optionList}>
          {categories.map((category) => (
            <StoreCard
              key={category.id}
              onPress={() => setSelectedCategoryId(category.id)}
              selected={selectedCategoryId === category.id}
              accessibilityLabel={`Categoría ${category.name}`}
            >
              <Text style={[styles.optionText, { color: theme.colors.text }]}>{category.name}</Text>
            </StoreCard>
          ))}
        </View>

        {selectedCategoryId !== null ? (
          <>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Grupo de precio</Text>
            {priceGroups.length === 0 ? (
              <StoreMessage message="Creá un grupo de precio en Tienda antes de registrar entradas." />
            ) : (
              <View style={styles.optionList}>
                {priceGroups.map((group) => (
                  <StoreCard
                    key={group.id}
                    onPress={() => setSelectedPriceGroupId(group.id)}
                    selected={selectedPriceGroupId === group.id}
                  >
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>
                      {formatEuros(group.priceCents)} · {group.stockUnits} disponibles
                    </Text>
                  </StoreCard>
                ))}
              </View>
            )}
          </>
        ) : null}

        <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Unidades recibidas</Text>
        <TextInput
          accessibilityLabel="Unidades recibidas"
          value={units}
          onChangeText={setUnits}
          keyboardType="number-pad"
          placeholder="Cantidad"
          placeholderTextColor={theme.colors.mutedText}
          style={inputStyle}
        />

        <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Proveedor (opcional)</Text>
        {suppliersState.suppliers.length > 0 ? (
          <View style={styles.optionList}>
            <StoreCard onPress={() => setSupplierId(null)} selected={supplierId === null}>
              <Text style={[styles.optionText, { color: theme.colors.text }]}>Sin proveedor</Text>
            </StoreCard>
            {suppliersState.suppliers.map((supplier) => (
              <StoreCard
                key={supplier.id}
                onPress={() => setSupplierId(supplier.id)}
                selected={supplierId === supplier.id}
              >
                <Text style={[styles.optionText, { color: theme.colors.text }]}>{supplier.name}</Text>
              </StoreCard>
            ))}
          </View>
        ) : (
          <View style={styles.providerEmpty}>
            <Text style={[styles.helpText, { color: theme.colors.mutedText }]}>Podés registrar la entrada sin proveedor.</Text>
          </View>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.push('/suppliers' as never)}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>Gestionar proveedores</Text>
        </Pressable>

        <TextInput
          accessibilityLabel="Nota de la entrada"
          value={note}
          onChangeText={setNote}
          placeholder="Nota (opcional)"
          placeholderTextColor={theme.colors.mutedText}
          style={inputStyle}
        />
        <PrimaryButton
          title="Registrar entrada"
          onPress={() => void addStock()}
          busy={busy}
          disabled={!selectedPriceGroupId || !units.trim()}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Movimientos recientes</Text>
        {movements.length === 0 ? (
          <StoreMessage message="Todavía no hay movimientos de stock." />
        ) : movements.map((movement) => (
          <View key={movement.id} style={[styles.movementRow, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.movementMain}>
              <Text style={[styles.movementTitle, { color: theme.colors.text }]}>
                {movement.categoryName} · {formatEuros(movement.priceCents)}
              </Text>
              <Text style={[styles.helpText, { color: theme.colors.mutedText }]}>
                {movementLabel(movement)}{movement.supplierName ? ` · ${movement.supplierName}` : ''}
                {movement.note ? ` · ${movement.note}` : ''}
              </Text>
              <Text style={[styles.helpText, { color: theme.colors.mutedText }]}>{movementDateLabel(movement.createdAt)}</Text>
            </View>
            <Text style={[styles.movementUnits, { color: movement.unitsDelta > 0 ? theme.colors.success : theme.colors.text }]}>
              {movement.unitsDelta > 0 ? '+' : ''}{movement.unitsDelta}
            </Text>
          </View>
        ))}
      </View>

      {suppliersState.error ? <StoreMessage message={suppliersState.error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: 22,
    paddingBottom: 32,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 32,
  },
  subtitle: {
    fontSize: 14,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  optionList: {
    gap: 8,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  providerEmpty: {
    gap: 6,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
  movementRow: {
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  movementMain: {
    flex: 1,
    gap: 3,
  },
  movementTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  movementUnits: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
