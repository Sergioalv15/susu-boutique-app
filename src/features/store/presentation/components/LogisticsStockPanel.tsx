import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../../core/theme/ThemeProvider';
import { parseSalePrice } from '../../domain/salePricing';
import { parsePurchaseCost } from '../../domain/stockCost';
import { StoreCategory, StoreStockItem } from '../../domain/types';
import { storeService } from '../../infrastructure/container';
import { formatEuros, InventoryCostDetails, StoreCard, StoreMessage } from './StoreComponents';

interface Props {
  items: StoreStockItem[];
  categories: StoreCategory[];
  onChanged: () => void | Promise<void>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

function positive(value: string): number {
  if (!/^\d+$/.test(value.trim())) throw new Error('Introduce una cantidad entera mayor que cero.');
  const result = Number(value.trim());
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error('Introduce una cantidad entera mayor que cero.');
  return result;
}

async function pickPhoto(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Necesitamos permiso para elegir la foto.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.65,
    base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.base64) throw new Error('No se pudo leer la imagen. Prueba con otra.');
  return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
}

export function LogisticsStockPanel({ items, categories, onChanged }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [costs, setCosts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newUnits, setNewUnits] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newPhoto, setNewPhoto] = useState<string | null>(null);

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radius.md },
  ];

  const run = async (id: number | 'new', action: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await action();
      await onChanged();
      setNotice(success);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  };

  const costFor = (id: number): number | null => {
    const text = (costs[id] ?? '').trim();
    if (!text) return null;
    const cost = parsePurchaseCost(text);
    if (cost === null) throw new Error('Introduce un coste válido con hasta dos decimales.');
    return cost;
  };

  const saveCorrection = (item: StoreStockItem) => {
    const priceCents = parseSalePrice(editPrice);
    if (priceCents === null) {
      setError('Introduce un precio de venta válido.');
      return;
    }
    void run(item.id, async () => {
      await storeService.updateProduct({ priceGroupId: item.id, name: editName, priceCents });
      setEditingId(null);
    }, 'Joya corregida.');
  };

  const createJewel = () => {
    const categoryId = newCategoryId ?? categories[0]?.id ?? null;
    if (categoryId == null) {
      setError('Crea primero un tipo de joya.');
      return;
    }
    const priceCents = parseSalePrice(newPrice);
    const costCents = parsePurchaseCost(newCost);
    if (priceCents === null || costCents === null || !newName.trim() || !newPhoto) {
      setError('Completa nombre, precio, coste y foto de la joya.');
      return;
    }
    void run('new', async () => {
      const units = positive(newUnits);
      await storeService.addStock({ categoryId, name: newName, priceCents, units,
        unitCostCents: costCents, photoDataUrl: newPhoto });
      setNewName('');
      setNewPrice('');
      setNewUnits('');
      setNewCost('');
      setNewPhoto(null);
    }, 'Joya creada.');
  };

  return (
    <View style={styles.panel}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Stock por joya</Text>
      <Text style={[styles.caption, { color: theme.colors.mutedText }]}>
        Agrega, quita, corrige o vende unidades de cada joya. Las joyas con el mismo precio son independientes.
      </Text>
      {error ? <StoreMessage message={error} error /> : null}
      {notice ? <StoreMessage message={notice} /> : null}

      {items.map((item) => (
        <StoreCard key={item.id} accessibilityLabel={`Gestionar ${item.name || productLabel(item)}`}>
          <View style={styles.row}>
            <View style={[styles.photo, { backgroundColor: theme.colors.card }]}>
              {item.photoDataUrl ? <Image source={{ uri: item.photoDataUrl }} style={styles.image} resizeMode="cover" /> : <Feather name="image" size={22} color={theme.colors.mutedText} />}
            </View>
            <View style={styles.details}>
              <Text style={[styles.name, { color: theme.colors.text }]}>{item.name || productLabel(item)}</Text>
              <Text style={[styles.caption, { color: theme.colors.mutedText }]}>
                {item.categoryName} · {formatEuros(item.priceCents)} · {item.stockUnits} {item.stockUnits === 1 ? 'unidad' : 'unidades'}
              </Text>
              <InventoryCostDetails item={item} />
            </View>
          </View>

          <View style={styles.inputs}>
            <TextInput
              accessibilityLabel={`Cantidad de ${item.name || productLabel(item)}`}
              keyboardType="number-pad"
              placeholder="Cant."
              placeholderTextColor={theme.colors.mutedText}
              value={quantities[item.id] ?? '1'}
              onChangeText={(text) => setQuantities((previous) => ({ ...previous, [item.id]: text }))}
              style={[inputStyle, styles.quantityInput]}
            />
            <TextInput
              accessibilityLabel={`Coste de ${item.name || productLabel(item)}`}
              keyboardType="decimal-pad"
              placeholder="Coste €"
              placeholderTextColor={theme.colors.mutedText}
              value={costs[item.id] ?? ''}
              onChangeText={(text) => setCosts((previous) => ({ ...previous, [item.id]: text }))}
              style={[inputStyle, styles.costInput]}
            />
            <Action label="+ Agregar" disabled={busyId === item.id} onPress={() => {
              const units = positive(quantities[item.id] ?? '1');
              const unitCostCents = costFor(item.id);
              void run(item.id, () => storeService.receiveStock({ priceGroupId: item.id, units,
                supplierId: null, note: '', unitCostCents }), 'Unidades agregadas.');
            }} />
            <Action label="− Quitar" disabled={busyId === item.id || item.stockUnits === 0} onPress={() => {
              const units = positive(quantities[item.id] ?? '1');
              void run(item.id, () => storeService.removeStock({ priceGroupId: item.id, units,
                note: 'Corrección desde Logística' }), 'Unidades quitadas.');
            }} />
            <Action label="Foto" disabled={busyId === item.id} onPress={() => void (async () => {
              try {
                const photoDataUrl = await pickPhoto();
                if (!photoDataUrl) return;
                await run(item.id, () => storeService.updateProductPhoto({ priceGroupId: item.id, photoDataUrl }), 'Foto actualizada.');
              } catch (cause) {
                setError(errorMessage(cause));
              }
            })()} />
            <Action label="Corregir" disabled={busyId === item.id} onPress={() => {
              setEditingId(editingId === item.id ? null : item.id);
              setEditName(item.name ?? '');
              setEditPrice((item.priceCents / 100).toFixed(2));
            }} />
            <Action label="Vender" disabled={busyId === item.id} onPress={() =>
              router.push(`/?group=${item.id}` as never)} />
          </View>

          {editingId === item.id ? (
            <View style={styles.editForm}>
              <TextInput accessibilityLabel={`Nombre de ${productLabel(item)}`} value={editName}
                onChangeText={setEditName} maxLength={60} placeholder="Nombre de la joya"
                placeholderTextColor={theme.colors.mutedText} style={inputStyle} />
              <TextInput accessibilityLabel={`Precio de ${editName || productLabel(item)}`} value={editPrice}
                onChangeText={setEditPrice} keyboardType="decimal-pad" placeholder="Precio en euros"
                placeholderTextColor={theme.colors.mutedText} style={inputStyle} />
              <Action label="Guardar" disabled={busyId === item.id} onPress={() => saveCorrection(item)} />
              <Action label="Cancelar" onPress={() => setEditingId(null)} />
            </View>
          ) : null}
        </StoreCard>
      ))}

      <View style={[styles.newJewel, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Nueva joya</Text>
        <TextInput accessibilityLabel="Nombre de la nueva joya" value={newName} onChangeText={setNewName}
          maxLength={60} placeholder="Ej. Collar de perlas" placeholderTextColor={theme.colors.mutedText} style={inputStyle} />
        <TextInput accessibilityLabel="Precio de venta de la nueva joya" value={newPrice} onChangeText={setNewPrice}
          keyboardType="decimal-pad" placeholder="Precio en euros" placeholderTextColor={theme.colors.mutedText} style={inputStyle} />
        <View style={styles.inputs}>
          <TextInput accessibilityLabel="Unidades iniciales" value={newUnits} onChangeText={setNewUnits}
            keyboardType="number-pad" placeholder="Unidades" placeholderTextColor={theme.colors.mutedText} style={[inputStyle, styles.quantityInput]} />
          <TextInput accessibilityLabel="Coste por unidad" value={newCost} onChangeText={setNewCost}
            keyboardType="decimal-pad" placeholder="Coste €" placeholderTextColor={theme.colors.mutedText} style={[inputStyle, styles.costInput]} />
          <Pressable accessibilityRole="button" onPress={() => void (async () => {
            try {
              const photo = await pickPhoto();
              if (photo) setNewPhoto(photo);
            } catch (cause) {
              setError(errorMessage(cause));
            }
          })()} style={[styles.action, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>{newPhoto ? 'Cambiar foto' : 'Elegir foto'}</Text>
          </Pressable>
          <Action label="Crear joya" disabled={busyId === 'new'} onPress={createJewel} />
        </View>
        <Text style={[styles.caption, { color: theme.colors.mutedText }]}>
          {categories.length > 0 ? `Tipo: ${categories.find((category) => category.id === (newCategoryId ?? categories[0]?.id))?.name ?? ''}` : 'No hay tipos de joya.'}
        </Text>
        {categories.length > 1 ? (
          <View style={styles.inputs}>
            {categories.map((category) => (
              <Action key={category.id} label={category.name}
                disabled={busyId === 'new'}
                onPress={() => setNewCategoryId(category.id)} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function productLabel(item: StoreStockItem): string {
  return item.name || `Joya ${formatEuros(item.priceCents)}`;
}

function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action,
        { borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={[styles.actionText, { color: theme.colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  details: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  inputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  quantityInput: {
    width: 78,
  },
  costInput: {
    width: 92,
  },
  action: {
    minHeight: 42,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  editForm: {
    gap: 8,
    marginTop: 10,
  },
  newJewel: {
    gap: 10,
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
