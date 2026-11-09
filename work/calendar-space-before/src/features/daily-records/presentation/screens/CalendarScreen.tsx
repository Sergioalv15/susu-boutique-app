import {
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useTheme } from "../../../../core/theme/ThemeProvider";
import {
  isSameMonth,
  monthKey,
  parseIsoDate,
  toIsoDate,
} from "../../../../core/utils/date";
import {
  createInitialMonthlyCalendarState,
  monthlyCalendarReducer,
} from "../calendar/monthlyCalendarState";
import {
  createInitialBiweeklyWindowState,
  biweeklyWindowReducer,
} from "../calendar/biweeklyWindowState";
import { MonthlyCalendar } from "../components/MonthlyCalendar";
import { BiweeklyWindow } from "../components/BiweeklyWindow";
import {
  CalendarViewMode,
  CalendarViewModeToggle,
} from "../components/CalendarViewModeToggle";
import { useMonthlyCalendarRecords } from "../hooks/useMonthlyCalendarRecords";
import { useBiweeklyRecords } from "../hooks/useBiweeklyRecords";
import { useCalendarHolidays } from "../../../holidays/presentation/hooks/useCalendarHolidays";
import {
  buildDayRouteFromIso,
  buildInvestmentPurchaseRouteFromIso,
} from "../calendar/dayRoute";
import {
  createInitialMonthParamConsumeState,
  decideMonthParamApplication,
} from "../calendar/monthParam";
import { SafeAreaView } from "react-native-safe-area-context";

export function CalendarScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ month?: string }>();
  const today = useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("monthly");
  const [calendarState, dispatch] = useReducer(
    monthlyCalendarReducer,
    today,
    createInitialMonthlyCalendarState,
  );
  const [biweeklyState, dispatchBiweekly] = useReducer(
    biweeklyWindowReducer,
    today,
    createInitialBiweeklyWindowState,
  );

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "monthly" ? "biweekly" : "monthly"));
  }, []);

  const calendarStateRef = useRef(calendarState);
  calendarStateRef.current = calendarState;
  const biweeklyStateRef = useRef(biweeklyState);
  biweeklyStateRef.current = biweeklyState;
  const monthParamStateRef = useRef(createInitialMonthParamConsumeState());

  useFocusEffect(
    useCallback(() => {
      const decision = decideMonthParamApplication(
        monthParamStateRef.current,
        params.month,
      );
      monthParamStateRef.current = decision.next;

      if (!decision.apply || !decision.target) {
        return;
      }

      const target = decision.target;
      if (!isSameMonth(calendarStateRef.current.visibleMonth, target)) {
        dispatch({ type: "showMonth", date: target });
      }

      if (
        monthKey(parseIsoDate(biweeklyStateRef.current.windowStartIso)) !==
        monthKey(target)
      ) {
        dispatchBiweekly({ type: "showMonth", monthDate: target });
      }

      router.setParams({ month: undefined });
    }, [params.month, router]),
  );

  const monthlyRecords = useMonthlyCalendarRecords(calendarState.visibleMonth);
  const biweeklyRecords = useBiweeklyRecords(biweeklyState.windowStartIso);
  const { holidaysByIso } = useCalendarHolidays(calendarState.visibleMonth);

  const activeError =
    viewMode === "monthly" ? monthlyRecords.error : biweeklyRecords.error;
  const activeRefresh =
    viewMode === "monthly" ? monthlyRecords.refresh : biweeklyRecords.refresh;

  const activeSelectedIso =
    viewMode === "monthly"
      ? calendarState.selectedDateIso
      : biweeklyState.selectedIso;
  const targetDateIso = activeSelectedIso ?? toIsoDate(today);
  const actionDateLabel = parseIsoDate(targetDateIso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const horizontalPadding = Math.min(
    theme.spacing.lg,
    Math.max(theme.spacing.md, width * 0.06),
  );

  if (activeError) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[
          styles.safeArea,
          { backgroundColor: theme.colors.calendarBackground },
        ]}
      >
        <View style={styles.errorState} accessibilityLiveRegion="polite">
          <Text style={[styles.error, { color: theme.colors.danger }]}>
            {activeError}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.retryButton,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.sm,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              },
              pressed ? styles.buttonPressed : null,
            ]}
            onPress={() => void activeRefresh()}
          >
              <Text style={[styles.retryButtonText, { color: theme.colors.onPrimary }]}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[
        styles.safeArea,
        { backgroundColor: theme.colors.calendarBackground },
      ]}
    >
      <View
        style={[
          styles.screenContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.md,
            gap: theme.spacing.sm,
          },
        ]}
      >
        <View style={styles.pageHeader}>
          <Text
            style={[
              styles.pageTitle,
              { color: theme.colors.text, fontFamily: theme.typography.serifFamily },
            ]}
          >
            Calendario
          </Text>
          <CalendarViewModeToggle mode={viewMode} onToggle={handleToggleViewMode} />
        </View>
        {viewMode === "monthly" ? (
          <MonthlyCalendar
            visibleMonth={calendarState.visibleMonth}
            selectedDateIso={calendarState.selectedDateIso}
            recordsByIso={monthlyRecords.recordsByIso}
            holidaysByIso={holidaysByIso}
            showInitialLoadingOverlay={monthlyRecords.loading}
            onPreviousMonth={() => dispatch({ type: "previousMonth" })}
            onNextMonth={() => dispatch({ type: "nextMonth" })}
            onShowToday={() => dispatch({ type: "showMonth", date: new Date() })}
            onSelectDate={(iso) => dispatch({ type: "selectDate", iso })}
          />
        ) : (
          <BiweeklyWindow
            windowStartIso={biweeklyState.windowStartIso}
            selectedIso={biweeklyState.selectedIso}
            recordsByIso={biweeklyRecords.recordsByIso}
            onPrevious={() => dispatchBiweekly({ type: "prev" })}
            onNext={() => dispatchBiweekly({ type: "next" })}
            onToday={() => dispatchBiweekly({ type: "today", today: new Date() })}
            onSelectDay={(iso) => dispatchBiweekly({ type: "select", iso })}
          />
        )}

        <View style={styles.dayActions}>
          <Text
            style={[styles.dayActionsLabel, { color: theme.colors.calendarMutedText }]}
          >
            Acciones para {actionDateLabel}
          </Text>
          <View style={styles.dayActionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Registrar día para ${targetDateIso}`}
              style={({ pressed }) => [
                styles.dayActionButton,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.sm,
                  borderColor: theme.colors.primary,
                },
                pressed ? styles.buttonPressed : null,
              ]}
              onPress={() => router.push(buildDayRouteFromIso(targetDateIso))}
            >
              <Text style={[styles.dayActionText, { color: theme.colors.onPrimary }]}>Registrar día</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Registrar inversión para ${targetDateIso}`}
              style={({ pressed }) => [
                styles.dayActionButton,
                {
                  borderRadius: theme.radius.sm,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                },
                pressed ? styles.buttonPressed : null,
              ]}
              onPress={() =>
                router.push(buildInvestmentPurchaseRouteFromIso(targetDateIso))
              }
            >
              <Text style={[styles.dayActionText, { color: theme.colors.primary }]}>Registrar inversión</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenContent: {
    flex: 1,
  },
  pageHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    flexShrink: 1,
  },
  error: {
    fontWeight: "600",
    textAlign: "center",
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  retryButton: {},
  retryButtonText: {
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.65,
  },
  dayActions: {
    marginTop: 2,
    gap: 6,
  },
  dayActionsLabel: {
    fontSize: 12,
  },
  dayActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dayActionButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dayActionText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
