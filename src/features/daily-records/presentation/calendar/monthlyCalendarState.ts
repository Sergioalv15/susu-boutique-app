import {
  addMonths,
  isSameMonth,
  parseIsoDate,
  startOfMonth,
  toIsoDate,
} from "../../../../core/utils/date";

export interface MonthlyCalendarState {
  visibleMonth: Date;
  selectedDateIso: string | null;
  todayIso: string;
}

type MonthlyCalendarAction =
  | { type: "previousMonth" }
  | { type: "nextMonth" }
  | { type: "showMonth"; date: Date }
  | { type: "selectDate"; iso: string };

function resolveSelectionForVisibleMonth(visibleMonth: Date, today: Date): string | null {
  return isSameMonth(visibleMonth, today) ? toIsoDate(today) : null;
}

export function createInitialMonthlyCalendarState(today: Date): MonthlyCalendarState {
  const visibleMonth = startOfMonth(today);

  return {
    visibleMonth,
    selectedDateIso: toIsoDate(today),
    todayIso: toIsoDate(today),
  };
}

export function monthlyCalendarReducer(
  state: MonthlyCalendarState,
  action: MonthlyCalendarAction,
): MonthlyCalendarState {
  if (action.type === "showMonth") {
    const visibleMonth = startOfMonth(action.date);
    const today = parseIsoDate(state.todayIso);

    return {
      ...state,
      visibleMonth,
      selectedDateIso: resolveSelectionForVisibleMonth(visibleMonth, today),
    };
  }

  if (action.type === "previousMonth") {
    const visibleMonth = addMonths(state.visibleMonth, -1);
    const today = parseIsoDate(state.todayIso);

    return {
      ...state,
      visibleMonth,
      selectedDateIso: resolveSelectionForVisibleMonth(visibleMonth, today),
    };
  }

  if (action.type === "selectDate") {
    return {
      ...state,
      selectedDateIso: action.iso,
    };
  }

  const visibleMonth = addMonths(state.visibleMonth, 1);
  const today = parseIsoDate(state.todayIso);

  return {
    ...state,
    visibleMonth,
    selectedDateIso: resolveSelectionForVisibleMonth(visibleMonth, today),
  };
}
