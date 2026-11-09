import { addMonths, buildMonthGrid, monthKey } from "../../../../core/utils/date";
import { DailyRecord } from "../../domain/types";

export interface BoundaryLoadPlan {
  needsPrev: boolean;
  needsNext: boolean;
  boundaryIsos: string[];
}

interface MonthlyOverviewLike {
  records: DailyRecord[];
}

export type MonthlyRecordsLoader = (month: Date) => Promise<MonthlyOverviewLike>;

export interface BoundaryAwareRecords {
  recordsByIso: Map<string, DailyRecord>;
  plan: BoundaryLoadPlan;
}

export function planBoundaryLoad(visibleMonth: Date): BoundaryLoadPlan {
  const grid = buildMonthGrid(visibleMonth);
  const boundaryIsos = grid
    .filter((cell) => !cell.isCurrentMonth)
    .map((cell) => cell.iso);
  const visibleMonthKey = monthKey(visibleMonth);

  const needsPrev = boundaryIsos.some((iso) => iso.slice(0, 7) < visibleMonthKey);
  const needsNext = boundaryIsos.some((iso) => iso.slice(0, 7) > visibleMonthKey);

  return {
    needsPrev,
    needsNext,
    boundaryIsos,
  };
}

export function mergeBoundaryRecords(
  visible: DailyRecord[],
  adjacent: DailyRecord[],
  boundaryIsos: string[],
): Map<string, DailyRecord> {
  const nextMap = new Map(visible.map((record) => [record.date, record]));
  const allowed = new Set(boundaryIsos);

  for (const record of adjacent) {
    if (allowed.has(record.date)) {
      nextMap.set(record.date, record);
    }
  }

  return nextMap;
}

export async function loadMonthlyBoundaryAwareRecords(
  visibleMonth: Date,
  loadMonth: MonthlyRecordsLoader,
): Promise<BoundaryAwareRecords> {
  const plan = planBoundaryLoad(visibleMonth);
  const pending = [loadMonth(visibleMonth)];

  if (plan.needsPrev) {
    pending.push(loadMonth(addMonths(visibleMonth, -1)));
  }
  if (plan.needsNext) {
    pending.push(loadMonth(addMonths(visibleMonth, 1)));
  }

  const [visibleResult, ...adjacentResults] = await Promise.all(pending);
  const adjacentRecords = adjacentResults.flatMap((result) => result.records);

  return {
    recordsByIso: mergeBoundaryRecords(
      visibleResult.records,
      adjacentRecords,
      plan.boundaryIsos,
    ),
    plan,
  };
}
