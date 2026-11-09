import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PrimaryButton } from '../../../../ui/components/PrimaryButton';
import { Screen } from '../../../../ui/components/Screen';
import { useTheme } from '../../../../core/theme/ThemeProvider';
import { SaleReceipt, StoreCategory, StorePriceGroup, TodaySalesSummary } from '../../domain/types';
import { storeService } from '../../infrastructure/container';
import { formatEuros, QuantityStepper, StoreCard, StoreMessage } from '../components/StoreComponents';

type SaleStep = 'category' | 'price-group' | 'quantity';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

export function SaleScreen() {
  const { theme } = useTheme();
  const [step, setStep] = useState<SaleStep>('category');
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [priceGroups, setPriceGroups] = useState<StorePriceGroup[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null);
  const [selectedPriceGroup, setSelectedPriceGroup] = useState<StorePriceGroup | null>(null);
  const [unitsSold, setUnitsSold] = useState(0);
  const [summary, setSummary] = useState<TodaySalesSummary>({ totalCents: 0, unitsSold: 0 });
  const [lastReceipt, setLastReceipt] = useState<SaleReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextCategories, today] = await Promise.all([
        storeService.listCategories(),
        storeService.getTodaySummary(),
      ]);
      setCategories(nextCategories);
      setSummary(today);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    void storeService.getTodaySummary().then((today) => {
      if (mounted) setSummary(today);
    }).catch((cause) => {
      if (mounted) setError(errorMessage(cause));
    });

    if (selectedCategory) {
      void storeService.listPriceGroups(selectedCategory.id).then((groups) => {
        if (!mounted) return;
        setPriceGroups(groups);
        if (selectedPriceGroup) {
          const refreshed = groups.find((group) => group.id === selectedPriceGroup.id);
          if (refreshed) {
            setSelectedPriceGroup(refreshed);
            setUnitsSold((current) => Math.min(current, refreshed.stockUnits));
          } else if (step === 'quantity') {
            setSelectedPriceGroup(null);
            setUnitsSold(0);
            setStep('price-group');
          }
        }
      }).catch((cause) => {
        if (mounted) setError(errorMessage(cause));
      });
    }

    return () => {
      mounted = false;
    };
  }, [selectedCategory?.id, selectedPriceGroup?.id, step]));

  const chooseCategory = async (category: StoreCategory) => {
    setError(null);
    setLastReceipt(null);
    setLoading(true);
    try {
      const groups = await storeService.listPriceGroups(category.id);
      setSelectedCategory(category);
      setPriceGroups(groups);
      setStep('price-group');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const choosePriceGroup = (priceGroup: StorePriceGroup) => {
    setSelectedPriceGroup(priceGroup);
    setUnitsSold(0);
    setError(null);
    setStep('quantity');
  };

  const goBack = () => {
    setError(null);
    if (step === 'quantity') {
      setStep('price-group');
      return;
    }
    setStep('category');
    setSelectedCategory(null);
    setPriceGroups([]);
  };

  const completeSale = async () => {
    if (!selectedPriceGroup || unitsSold < 1 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const receipt = await storeService.completeSale({
        priceGroupId: selectedPriceGroup.id,
        units: unitsSold,
      });
      setLastReceipt(receipt);
      setSummary(await storeService.getTodaySummary());
      setSelectedCategory(null);
      setSelectedPriceGroup(null);
      setPriceGroups([]);
      setUnitsSold(0);
      setStep('category');
    } catch (cause) {
      setError(errorMessage(cause));
      if (selectedCategory) {
        const currentGroups = await storeService.listPriceGroups(selectedCategory.id).catch(() => null);
        const refreshed = currentGroups?.find((group) => group.id === selectedPriceGroup.id);
        if (refreshed) {
          setSelectedPriceGroup(refreshed);
          setUnitsSold((current) => Math.min(current, refreshed.stockUnits));
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen topInset contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {step !== 'category' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={goBack} style={styles.backButton}>
            <Text style={[styles.backLabel, { color: theme.colors.primary }]}>‹ Volver</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.serifFamily }]}>Venta</Text>
        {step === 'category' ? (
          <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>Hoy · {formatEuros(summary.totalCents)} · {summary.unitsSold} unidades</Text>
        ) : null}
      </View>

      {lastReceipt && step === 'category' ? (
        <View style={[styles.successBanner, { backgroundColor: theme.colors.card, borderRadius: theme.radius.md }]}>
          <Text style={[styles.successTitle, { color: theme.colors.text }]}>Venta registrada</Text>
          <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>
            {lastReceipt.unitsSold} unidades · {formatEuros(lastReceipt.totalCents)}
          </Text>
        </View>
      ) : null}

      {error ? <StoreMessage message={error} error /> : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : null}

      {!loading && step === 'category' ? (
        <View style={styles.list}>
          <Text style={[styles.prompt, { color: theme.colors.text }]}>Elegí una categoría</Text>
          {categories.length === 0 ? (
            <StoreMessage message="Todavía no hay categorías. Agregalas desde Tienda." />
          ) : categories.map((category) => (
            <StoreCard
              key={category.id}
              onPress={() => void chooseCategory(category)}
              accessibilityLabel={`Elegir ${category.name}`}
            >
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{category.name}</Text>
            </StoreCard>
          ))}
        </View>
      ) : null}

      {!loading && step === 'price-group' ? (
        <View style={styles.list}>
          <Text style={[styles.prompt, { color: theme.colors.text }]}>{selectedCategory?.name}</Text>
          {priceGroups.length === 0 ? (
            <StoreMessage message="Esta categoría todavía no tiene grupos de precio. Configuralos desde Tienda." />
          ) : priceGroups.map((group) => (
            <StoreCard
              key={group.id}
              onPress={() => choosePriceGroup(group)}
              disabled={group.stockUnits === 0}
              accessibilityLabel={`Grupo ${formatEuros(group.priceCents)}, ${group.stockUnits} unidades disponibles`}
            >
              <View style={styles.groupRow}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Grupo {formatEuros(group.priceCents)}</Text>
                  <Text style={[styles.cardHint, { color: theme.colors.mutedText }]}>
                    {group.stockUnits > 0 ? `${group.stockUnits} unidades disponibles` : 'Sin stock'}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: theme.colors.mutedText }]}>›</Text>
              </View>
            </StoreCard>
          ))}
        </View>
      ) : null}

      {!loading && step === 'quantity' && selectedPriceGroup ? (
        <View style={styles.quantityScreen}>
          <Text style={[styles.prompt, { color: theme.colors.text }]}>{selectedCategory?.name}</Text>
          <Text style={[styles.selectedPrice, { color: theme.colors.primary }]}>
            Grupo {formatEuros(selectedPriceGroup.priceCents)}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>Unidades vendidas</Text>
          <QuantityStepper value={unitsSold} onChange={setUnitsSold} max={selectedPriceGroup.stockUnits} label="unidad" />
          <View style={[styles.remaining, { borderColor: theme.colors.border }]}>
            <Text style={[styles.remainingLabel, { color: theme.colors.mutedText }]}>Unidades restantes</Text>
            <Text style={[styles.remainingValue, { color: theme.colors.text }]}>
              {selectedPriceGroup.stockUnits - unitsSold}
            </Text>
          </View>
          <PrimaryButton
            title="LISTO"
            onPress={() => void completeSale()}
            busy={busy}
            disabled={unitsSold === 0}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: 20,
    paddingBottom: 28,
  },
  header: {
    gap: 4,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
  },
  subtitle: {
    fontSize: 14,
  },
  prompt: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  list: {
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardHint: {
    fontSize: 13,
    marginTop: 3,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chevron: {
    fontSize: 28,
    lineHeight: 30,
  },
  loading: {
    paddingVertical: 32,
  },
  successBanner: {
    padding: 14,
    gap: 3,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  quantityScreen: {
    gap: 16,
  },
  selectedPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  remaining: {
    minHeight: 88,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  remainingLabel: {
    fontSize: 14,
  },
  remainingValue: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
