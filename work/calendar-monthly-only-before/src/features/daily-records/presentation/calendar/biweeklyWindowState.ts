import {
  initialBiweekStart,
  nextBiweekStart,
  prevBiweekStart,
  startOfMonth,
  toIsoDate,
} from "../../../../core/utils/date";

export interface BiweeklyWindowState {
  windowStartIso: string;
  selectedIso: string | null;
}

export type WindowAction =
  | { type: "next" }
  | { type: "prev" }
  | { type: "today"; today: Date }
  | { type: "select"; iso: string }
  | { type: "showMonth"; monthDate: Date };

export function createInitialBiweeklyWindowState(today: Date): BiweeklyWindowState {
  return {
    windowStartIso: initialBiweekStart(today),
    selectedIso: toIsoDate(today),
  };
}

export function biweeklyWindowReducer(
  state: BiweeklyWindowState,
  action: WindowAction,
): BiweeklyWindowState {
  switch (action.type) {
    case "next":
      return {
        ...state,
        windowStartIso: nextBiweekStart(state.windowStartIso),
      };
    case "prev":
      return {
        ...state,
        windowStartIso: prevBiweekStart(state.windowStartIso),
      };
    case "today": {
      const todayIso = toIsoDate(action.today);
      return {
        windowStartIso: initialBiweekStart(action.today),
        selectedIso: todayIso,
      };
    }
    case "select":
      return {
        ...state,
        selectedIso: action.iso,
      };
    case "showMonth": {
      const monthStart = startOfMonth(action.monthDate);
      return {
        windowStartIso: initialBiweekStart(monthStart),
        selectedIso: toIsoDate(monthStart),
      };
    }
    default:
      return state;
  }
}
