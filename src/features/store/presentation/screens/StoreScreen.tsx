import { useCallback, useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../../../../ui/components/Screen';
import { FadeIn } from '../../../../ui/components/FadeIn';
import { useTheme } from '../../../../core/theme/ThemeProvider';
import { StoreDashboardSummary, StockMovement, StoreStockItem } from '../../domain/types';
import { isLowStock, LOW_STOCK_THRESHOLD } from '../../domain/lowStockAlert';
import { storeService } from '../../infrastructure/container';
import { formatEuros, InventoryCostDetails, StoreCard, StoreMessage } from '../components/StoreComponents';
import { StoreDashboard } from '../components/StoreDashboard';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

function productLabel(item: StoreStockItem): string {
  return item.name ? `${item.name} · ${formatEuros(item.priceCents)}` : `Grupo ${formatEuros(item.priceCents)}`;
}

function confirmAction(message: string, action: () => void): void {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) action();
    return;
  }
  Alert.alert('Confirmar', message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Anular', style: 'destructive', onPress: action },
  ]);
}

export function StoreScreen() {
  const { theme } = useTheme();
  const [stockItems, setStockItems] = useState<StoreStockItem[]>([]);
  const [dashboard, setDashboard] = useState<StoreDashboardSummary | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySaleId, setBusySaleId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextStock, nextDashboard, nextMovements] = await Promise.all([
        storeService.listStockItems(),
        storeService.getDashboardSummary(),
        storeService.listRecentMovements(20),
      ]);
      setStockItems(nextStock);
      setDashboard(nextDashboard);
      setMovements(nextMovements);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const categories = [...new Map(stockItems.map((item) => [item.categoryId, item.categoryName])).entries()];
  const lowStockItems = stockItems.filter((item) => isLowStock(item.stockUnits))
    .sort((left, right) => left.stockUnits - right.stockUnits);
  const recentSales = movements.filter((movement) =>
    movement.movementType === 'venta' && movement.saleId != null && !movement.saleVoided).slice(0, 8);

  const voidSale = (saleId: number) => confirmAction(
    `¿Anular la venta #${saleId}? Las unidades volverán al stock.`,
    () => void (async () => {
      setBusySaleId(saleId);
      setError(null);
      try {
        await storeService.voidSale(saleId);
        await refresh();
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        setBusySaleId(null);
      }
    })(),
  );

  return (
    <Screen keyboardAware contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.serifFamily }]}>Tienda</Text>
        <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>Catálogo actual y ventas recientes</Text>
      </View>

      {error ? <StoreMessage message={error} error /> : null}
      {loading ? <Text style={[styles.status, { color: theme.colors.mutedText }]}>Cargando stock…</Text> : null}

      {!loading ? (
        <FadeIn>
          <View style={styles.sectionList}>
            {dashboard ? <StoreDashboard stock={stockItems} sales={dashboard} /> : null}

            {lowStockItems.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.danger }]}>Stock bajo (≤ {LOW_STOCK_THRESHOLD})</Text>
                {lowStockItems.map((item) => (
                  <StoreMessage key={`low-${item.id}`} message={`${productLabel(item)} · ${item.stockUnits} ${item.stockUnits === 1 ? 'unidad' : 'unidades'}`} />
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Joyas disponibles</Text>
              {categories.length === 0 ? <StoreMessage message="Todavía no hay joyas en el catálogo." /> : null}
              {categories.map(([categoryId, categoryName]) => (
                <View key={categoryId} style={styles.section}>
                  <Text style={[styles.categoryName, { color: theme.colors.primary }]}>{categoryName}</Text>
                  <View style={styles.groupGrid}>
                    {stockItems.filter((item) => item.categoryId === categoryId).map((item) => (
                      <StoreCard key={item.id} accessibilityLabel={`${productLabel(item)}, ${item.stockUnits} unidades`}>
                        <ImagePreview photoDataUrl={item.photoDataUrl} style={styles.groupPhoto} />
                        <View style={styles.groupCardCopy}>
                          <Text style={[styles.groupTitle, { color: theme.colors.text }]}>{productLabel(item)}</Text>
                          <Text style={[styles.caption, { color: theme.colors.mutedText }]}>
                            {item.stockUnits} {item.stockUnits === 1 ? 'unidad' : 'unidades'}
                            {isLowStock(item.stockUnits) ? ' · Stock bajo' : ''}
                          </Text>
                          <InventoryCostDetails item={item} />
                        </View>
                      </StoreCard>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Últimas ventas</Text>
              {recentSales.length === 0 ? <StoreMessage message="No hay ventas recientes." /> : null}
              {recentSales.map((movement) => (
                <View key={movement.id} style={[styles.saleRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
                  <View style={styles.flex}>
                    <Text style={[styles.saleTitle, { color: theme.colors.text }]}>
                      Venta #{movement.saleId} · {movement.productName || movement.categoryName}
                    </Text>
                    <Text style={[styles.caption, { color: theme.colors.mutedText }]}>
                      {Math.abs(movement.unitsDelta)} {Math.abs(movement.unitsDelta) === 1 ? 'unidad' : 'unidades'} · {formatEuros(movement.chargedTotalCents ?? movement.priceCents * Math.abs(movement.unitsDelta))}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Anular venta ${movement.saleId}`}
                    disabled={busySaleId === movement.saleId}
                    onPress={() => voidSale(movement.saleId!)}
                    style={({ pressed }) => [styles.voidButton, { borderColor: theme.colors.border }, pressed ? styles.pressed : null]}
                  >
                    <Text style={[styles.voidText, { color: theme.colors.danger }]}>Anular venta #{movement.saleId}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </FadeIn>
      ) : null}
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
        <Feather name="image" size={26} color={theme.colors.mutedText} />
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
  sectionList: {
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '600',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
  },
  caption: {
    fontSize: 14,
    lineHeight: 19,
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
  },  groupPhoto: {
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
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  saleTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  voidButton: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  voidText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
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
