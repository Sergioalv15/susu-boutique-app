import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  biweekWindowDays,
  isIsoTodayLocal,
  parseIsoDate,
} from "../../../../core/utils/date";
import { useTheme } from "../../../../core/theme/ThemeProvider";
import { DailyRecord } from "../../domain/types";
import { computeDailyProfit } from "../../domain/calculators";
import { formatCurrency } from "../../../../core/utils/currency";
import {
  buildBiweeklyRangeAnnouncement,
  buildDayAccessibilityHint,
  buildDayAccessibilityLabel,
} from "../calendar/calendarA11y";
import { deriveDayCellStatus } from "../calendar/dayCellStatus";
import { buildDayRouteFromIso } from "../calendar/dayRoute";

interface Props {
  windowStartIso: string;
  selectedIso: string | null;
  recordsByIso: Map<string, DailyRecord>;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectDay: (iso: string) => void;
}

function formatRangeTitle(startIso: string, endIso: string): string {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);

  const startLabel = start.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
  });
  const endLabel = end.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
  });

  return `${startLabel} - ${endLabel}`;
}

function weekdayLabel(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("es-ES", { weekday: "short" });
}

function dayNumber(iso: string): string {
  return String(parseIsoDate(iso).getDate());
}

const WEEK_COLUMN_COUNT = 7;

export function BiweeklyWindow({
  windowStartIso,
  selectedIso,
  recordsByIso,
  onPrevious,
  onNext,
  onToday,
  onSelectDay,
}: Props) {
  const { theme } = useTheme();
  const windowDays = biweekWindowDays(windowStartIso);
  const windowEndIso = windowDays[windowDays.length - 1];
  const weekOneDays = windowDays.slice(0, WEEK_COLUMN_COUNT);
  const weekTwoDays = windowDays.slice(WEEK_COLUMN_COUNT);

  const renderWeek = (days: string[]) => (
    <View style={styles.weekGrid}>
      {days.map((iso) => {
        const record = recordsByIso.get(iso);
        const status = deriveDayCellStatus(record);
        const isSelected = selectedIso === iso;
        const isToday = isIsoTodayLocal(iso);
        const profit = record ? computeDailyProfit(record) : null;

        return (
          <View style={styles.dayColumn} key={iso}>
            <Text
              style={[
                styles.weekday,
                isToday ? styles.todayWeekday : null,
                { color: theme.colors.mutedText },
              ]}
            >
              {weekdayLabel(iso)}
            </Text>
            <Link href={buildDayRouteFromIso(iso)} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={buildDayAccessibilityLabel(
                  iso,
                  status,
                  isSelected,
                )}
                accessibilityHint={buildDayAccessibilityHint(status)}
                onPress={() => onSelectDay(iso)}
                style={[
                styles.dayNumberBadge,
                {
                  borderRadius: theme.radius.md,
                  borderColor: isSelected
                    ? theme.colors.primary
                      : theme.colors.background,
                  backgroundColor: isSelected ? theme.colors.card : theme.colors.background,
                },
                ]}
              >
                <View
                  style={[
                    styles.dayNumberCircle,
                    isToday
                      ? {
                          backgroundColor: theme.colors.primary,
                        }
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isToday
                        ? {
                            color: theme.colors.onPrimary,
                            fontWeight: "700",
                          }
                        : { color: theme.colors.text },
                    ]}
                  >
                    {dayNumber(iso)}
                  </Text>
                </View>
              </Pressable>
            </Link>
            {record && profit && (
              <View style={styles.daySummary}>
                <View style={styles.summaryMetric}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: theme.colors.mutedText },
                    ]}
                    numberOfLines={1}
                  >
                    Venta
                  </Text>
                  <Text
                    style={[styles.summaryValue, { color: theme.colors.text }]}
                    numberOfLines={1}
                  >
                    {formatCurrency(record.totalSold)}
                  </Text>
                </View>
                <View style={styles.summaryMetric}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: theme.colors.mutedText },
                    ]}
                    numberOfLines={1}
                  >
                    Neto
                  </Text>
                  <Text
                    style={[styles.summaryValue, { color: profit.netProfit < 0 ? theme.colors.danger : theme.colors.success }]}
                    numberOfLines={1}
                  >
                    {formatCurrency(profit.netProfit)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontFamily: theme.typography.serifFamily },
          ]}
        >
          Calendario quincenal
        </Text>
        <Text style={[styles.rangeLabel, { color: theme.colors.mutedText }] }>
          {formatRangeTitle(windowStartIso, windowEndIso)}
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.rangeAnnouncement, { color: theme.colors.mutedText }]}
        >
          {buildBiweeklyRangeAnnouncement(windowStartIso, windowEndIso)}
        </Text>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          style={[
            styles.controlButton,
            {
              borderRadius: theme.radius.sm,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            },
          ]}
          onPress={onPrevious}
        >
          <Text style={[styles.controlText, { color: theme.colors.text }]}>Anterior</Text>
        </Pressable>
        <Pressable
          style={[
            styles.controlButton,
            {
              borderRadius: theme.radius.sm,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            },
          ]}
          onPress={onToday}
        >
          <Text style={[styles.controlText, { color: theme.colors.text }]}>Hoy</Text>
        </Pressable>
        <Pressable
          style={[
            styles.controlButton,
            {
              borderRadius: theme.radius.sm,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            },
          ]}
          onPress={onNext}
        >
          <Text style={[styles.controlText, { color: theme.colors.text }]}>Siguiente</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {renderWeek(weekOneDays)}
          {renderWeek(weekTwoDays)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    gap: 12,
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: 18,
  },
  rangeLabel: {
    fontSize: 13,
  },
  rangeAnnouncement: {
    fontSize: 11,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 6,
  },
  controlButton: {
    flex: 1,
    borderWidth: 1,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  controlText: {
    fontWeight: "600",
    fontSize: 12,
  },
  scrollArea: {
    flex: 1,
  },
  listContent: {
    flexGrow: 0,
    gap: 12,
    paddingBottom: 4,
  },
  grid: {
    gap: 12,
  },
  weekGrid: {
    minHeight: 124,
    flexDirection: "row",
    gap: 4,
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  weekday: {
    fontSize: 11,
    textTransform: "capitalize",
  },
  todayWeekday: {
    fontWeight: "700",
  },
  dayNumberBadge: {
    width: "100%",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dayNumberCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  daySummary: {
    width: "100%",
    gap: 2,
  },
  summaryMetric: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    opacity: 0.8,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: "700",
    width: "100%",
    textAlign: "center",
  },
});
