import {
  buildMonthGrid,
  daysInMonthCount,
  isIsoTodayLocal,
  monthKey,
  parseIsoDate,
  weekdayIndexMondayFirst,
} from "../../../../core/utils/date";
import { computeDailyProfit } from "../../domain/calculators";
import { DailyRecord } from "../../domain/types";
import { DayCellStatus, deriveDayCellStatus } from "./dayCellStatus";

export const WEEKDAY_LABELS_MONDAY_FIRST = ["L", "M", "X", "J", "V", "S", "D"];
export const MONTHLY_CALENDAR_COLUMN_COUNT = WEEKDAY_LABELS_MONDAY_FIRST.length;
export const MONTHLY_CELL_MIN_HEIGHT = 44;

export type CellEconomicSignal = "none" | "positive" | "negative" | "neutral";

export interface MonthlyCalendarCellModel {
  iso: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  status: DayCellStatus;
  economicSignal: CellEconomicSignal;
}

export function chunkWeeks<T>(cells: readonly T[], weekSize = 7): T[][] {
  if (cells.length % weekSize !== 0) {
    throw new Error(
      `Expected cells length to be divisible by ${weekSize}, received ${cells.length}`,
    );
  }

  const weeks: T[][] = [];

  for (let index = 0; index < cells.length; index += weekSize) {
    weeks.push(cells.slice(index, index + weekSize));
  }

  return weeks;
}

export interface WeeklyIsoCellLike {
  iso: string;
}

export function hasMondayFirstWeekdayColumnMapping(
  week: readonly WeeklyIsoCellLike[],
): boolean {
  return week.every(
    (cell, columnIndex) =>
      weekdayIndexMondayFirst(parseIsoDate(cell.iso)) === columnIndex,
  );
}

export function deriveCellEconomicSignal(
  record: DailyRecord | undefined,
  isCurrentMonth: boolean,
): CellEconomicSignal {
  if (!record || !isCurrentMonth) {
    return "none";
  }

  const isLossDay = record.additionalExpenses > record.totalSold * record.profitPercent;
  if (isLossDay) {
    return "negative";
  }

  const { netProfit } = computeDailyProfit(record);
  if (netProfit > 0) {
    return "positive";
  }

  return "neutral";
}

export function buildMonthLabel(date: Date): string {
  return date
    .toLocaleDateString("es-ES", {
      month: "short",
    })
    .replace(".", "")
    .toUpperCase();
}

export function buildMonthlyCalendarCells(
  visibleMonth: Date,
  recordsByIso: Map<string, DailyRecord>,
  now = new Date(),
): MonthlyCalendarCellModel[] {
  return buildMonthGrid(visibleMonth).map((cell) => {
    const record = recordsByIso.get(cell.iso);

    return {
      iso: cell.iso,
      dayNumber: cell.date.getDate(),
      isCurrentMonth: cell.isCurrentMonth,
      isToday: isIsoTodayLocal(cell.iso, now),
      status: deriveDayCellStatus(record),
      economicSignal: deriveCellEconomicSignal(record, cell.isCurrentMonth),
    };
  });
}

export function buildMonthlyCalendarWeeks(
  visibleMonth: Date,
  recordsByIso: Map<string, DailyRecord>,
  now = new Date(),
): MonthlyCalendarCellModel[][] {
  return chunkWeeks(
    buildMonthlyCalendarCells(visibleMonth, recordsByIso, now),
    MONTHLY_CALENDAR_COLUMN_COUNT,
  );
}

export function countMonthRecords(
  visibleMonth: Date,
  recordsByIso: Map<string, DailyRecord>,
): number {
  const key = monthKey(visibleMonth);
  let total = 0;

  for (const iso of recordsByIso.keys()) {
    if (iso.startsWith(key)) {
      total += 1;
    }
  }

  return total;
}
