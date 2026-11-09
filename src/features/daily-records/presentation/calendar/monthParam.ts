import { parseYearMonth } from "../../../../core/utils/date";

export interface MonthParamConsumeState {
  consumed: boolean;
}

export function createInitialMonthParamConsumeState(): MonthParamConsumeState {
  return { consumed: false };
}

export interface MonthParamDecision {
  apply: boolean;
  target: Date | null;
  next: MonthParamConsumeState;
}

export function decideMonthParamApplication(
  state: MonthParamConsumeState,
  param: string | null | undefined,
): MonthParamDecision {
  if (typeof param !== "string" || param.length === 0) {
    return { apply: false, target: null, next: { consumed: false } };
  }

  const target = parseYearMonth(param);
  if (!target) {
    return { apply: false, target: null, next: state };
  }

  if (state.consumed) {
    return { apply: false, target: null, next: state };
  }

  return { apply: true, target, next: { consumed: true } };
}