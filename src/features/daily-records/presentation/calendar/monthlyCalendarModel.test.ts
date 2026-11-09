import { describe, expect, it } from "vitest";
import {
  buildMonthLabel,
  buildMonthlyCalendarCells,
  buildMonthlyCalendarWeeks,
  chunkWeeks,
  countMonthRecords,
  deriveCellEconomicSignal,
  hasMondayFirstWeekdayColumnMapping,
  MONTHLY_CELL_MIN_HEIGHT,
  MONTHLY_CALENDAR_COLUMN_COUNT,
  WEEKDAY_LABELS_MONDAY_FIRST,
} from "./monthlyCalendarModel";

describe("monthlyCalendarModel", () => {
  it("keeps weekday headers in Monday-first order", () => {
    expect(WEEKDAY_LABELS_MONDAY_FIRST).toEqual(["L", "M", "X", "J", "V", "S", "D"]);
    expect(MONTHLY_CALENDAR_COLUMN_COUNT).toBe(WEEKDAY_LABELS_MONDAY_FIRST.length);
  });

  it("builds cells with record/no-record distinction and adjacent month days", () => {
    const records = new Map([
[
        "2026-11-01",
        {
          date: "2026-11-01",
          totalSold: 120,
          additionalExpenses: 10,
          profitPercent: 0.3,
          notes: "ok",
        },
      ],
    ]);

    const cells = buildMonthlyCalendarCells(new Date(2026, 10, 1), records, new Date(2026, 10, 1));

    expect(cells).toHaveLength(42);
    expect(cells[0].iso).toBe("2026-10-26");
    expect(cells[0].isCurrentMonth).toBe(false);

    const novemberFirst = cells.find((cell) => cell.iso === "2026-11-01");
    const novemberSecond = cells.find((cell) => cell.iso === "2026-11-02");

    expect(novemberFirst?.status).toBe("filled");
    expect(novemberFirst?.isToday).toBe(true);
    expect(novemberSecond?.status).toBe("empty");
  });

  it("fills month grid with adjacent month days at both start and end", () => {
    const cells = buildMonthlyCalendarCells(new Date(2026, 9, 1), new Map(), new Date(2026, 9, 1));

    expect(cells[0].iso).toBe("2026-09-28");
    expect(cells[6].iso).toBe("2026-10-04");
    expect(cells[cells.length - 1].iso).toBe("2026-11-01");
  });

  it("builds a four-row grid when the month fills exact weeks", () => {
    const cells = buildMonthlyCalendarCells(new Date(2021, 1, 1), new Map());

    expect(cells).toHaveLength(28);
    expect(cells[0].iso).toBe("2021-02-01");
    expect(cells[cells.length - 1].iso).toBe("2021-02-28");
  });

  it("counts only records from the visible month", () => {
    const records = new Map([
      [
        "2026-11-01",
        {
          date: "2026-11-01",
          totalSold: 100,
          additionalExpenses: 5,
          profitPercent: 0.3,
          notes: "in",
        },
      ],
      [
        "2026-10-31",
        {
          date: "2026-10-31",
          totalSold: 100,
          additionalExpenses: 5,
          profitPercent: 0.3,
          notes: "out",
        },
      ],
    ]);

    expect(countMonthRecords(new Date(2026, 10, 1), records)).toBe(1);
  });

  it("builds dominant uppercase month abbreviation label", () => {
    expect(buildMonthLabel(new Date(2026, 7, 1))).toBe("AGO");
  });

  it("derives compact economic signal only for current-month records", () => {
    const positive = deriveCellEconomicSignal(
      {
        date: "2026-11-03",
        totalSold: 160,
        additionalExpenses: 10,
        profitPercent: 0.3,
        notes: "positive",
      },
      true,
    );
    const negative = deriveCellEconomicSignal(
      {
        date: "2026-11-04",
        totalSold: 80,
        additionalExpenses: 40,
        profitPercent: 0.3,
        notes: "negative",
      },
      true,
    );
    const neutral = deriveCellEconomicSignal(
      {
        date: "2026-11-05",
        totalSold: 100,
        additionalExpenses: 30,
        profitPercent: 0.3,
        notes: "neutral",
      },
      true,
    );
    const adjacent = deriveCellEconomicSignal(
      {
        date: "2026-10-31",
        totalSold: 120,
        additionalExpenses: 0,
        profitPercent: 0.3,
        notes: "adjacent",
      },
      false,
    );

    expect(positive).toBe("positive");
    expect(negative).toBe("negative");
    expect(neutral).toBe("neutral");
    expect(adjacent).toBe("none");
    expect(deriveCellEconomicSignal(undefined, true)).toBe("none");
  });

  it("exposes minimum monthly cell touch target contract", () => {
    expect(MONTHLY_CELL_MIN_HEIGHT).toBeGreaterThanOrEqual(44);
  });

  it("adds economic signal to built cells", () => {
    const records = new Map([
      [
        "2026-11-01",
        {
          date: "2026-11-01",
          totalSold: 100,
          additionalExpenses: 40,
          profitPercent: 0.3,
          notes: "in-month",
        },
      ],
      [
        "2026-10-31",
        {
          date: "2026-10-31",
          totalSold: 180,
          additionalExpenses: 20,
          profitPercent: 0.3,
          notes: "adjacent",
        },
      ],
    ]);

    const cells = buildMonthlyCalendarCells(new Date(2026, 10, 1), records, new Date(2026, 10, 1));
    const inMonthCell = cells.find((cell) => cell.iso === "2026-11-01");
    const adjacentCell = cells.find((cell) => cell.iso === "2026-10-31");

    expect(inMonthCell?.economicSignal).toBe("negative");
    expect(adjacentCell?.economicSignal).toBe("none");
  });

  it("chunks every calendar week to exactly seven cells", () => {
    const weeks = buildMonthlyCalendarWeeks(new Date(2026, 10, 1), new Map(), new Date(2026, 10, 1));

    expect(weeks.length).toBe(6);
    expect(weeks.every((week) => week.length === MONTHLY_CALENDAR_COLUMN_COUNT)).toBe(true);
  });

  it("preserves Monday-first sequence while chunking visual weeks", () => {
    const cells = buildMonthlyCalendarCells(new Date(2026, 9, 1), new Map(), new Date(2026, 9, 1));
    const weeks = buildMonthlyCalendarWeeks(new Date(2026, 9, 1), new Map(), new Date(2026, 9, 1));

    expect(weeks.flat().map((cell) => cell.iso)).toEqual(cells.map((cell) => cell.iso));
    expect(weeks[0][0].iso).toBe("2026-09-28");
    expect(weeks[0][6].iso).toBe("2026-10-04");
  });

  it("ensures every visual week cell stays under its real weekday column", () => {
    const weeks = buildMonthlyCalendarWeeks(new Date(2026, 9, 1), new Map(), new Date(2026, 9, 1));

    expect(weeks.every((week) => hasMondayFirstWeekdayColumnMapping(week))).toBe(true);
  });

  it("matches the explicit August 2026 first-row weekday-column contract", () => {
    const weeks = buildMonthlyCalendarWeeks(new Date(2026, 7, 1), new Map(), new Date(2026, 7, 1));
    const firstWeekIsos = weeks[0].map((cell) => cell.iso);

    expect(firstWeekIsos).toEqual([
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
    expect(hasMondayFirstWeekdayColumnMapping(weeks[0])).toBe(true);
    expect(weeks.every((week) => week.length === MONTHLY_CALENDAR_COLUMN_COUNT)).toBe(true);
    expect(weeks.every((week) => hasMondayFirstWeekdayColumnMapping(week))).toBe(true);
  });

  it("keeps weekday-column mapping correct across another month boundary", () => {
    const weeks = buildMonthlyCalendarWeeks(new Date(2027, 0, 1), new Map(), new Date(2027, 0, 1));
    const firstWeekIsos = weeks[0].map((cell) => cell.iso);

    expect(firstWeekIsos).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
    expect(hasMondayFirstWeekdayColumnMapping(weeks[0])).toBe(true);
  });

  it("throws when trying to chunk into incomplete weeks", () => {
    expect(() => chunkWeeks([1, 2, 3], WEEKDAY_LABELS_MONDAY_FIRST.length)).toThrow(
      "Expected cells length to be divisible by 7",
    );
  });
});
