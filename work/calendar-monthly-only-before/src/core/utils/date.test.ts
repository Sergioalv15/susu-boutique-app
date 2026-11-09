import { describe, expect, it } from "vitest";
import {
  addMonths,
  biweekWindowDays,
  buildMonthGrid,
  daysInMonthCount,
  initialBiweekStart,
  isIsoTodayLocal,
  isValidIsoDate,
  monthKeysForWindow,
  nextBiweekStart,
  parseIsoDate,
  parseYearMonth,
  prevBiweekStart,
  toIsoDate,
  weekdayIndexMondayFirst,
} from "./date";

describe("biweekly date helpers", () => {
  it("returns exactly 14 consecutive iso dates for a window", () => {
    const days = biweekWindowDays("2026-01-28");

    expect(days).toHaveLength(14);
    expect(days[0]).toBe("2026-01-28");
    expect(days[13]).toBe("2026-02-10");
  });

  it("moves forward and backward by exact biweekly windows", () => {
    const start = "2026-02-10";

    expect(nextBiweekStart(start)).toBe("2026-02-24");
    expect(prevBiweekStart(start)).toBe("2026-01-27");
    expect(prevBiweekStart(nextBiweekStart(start))).toBe(start);
  });

  it("returns one or two month keys depending on the window span", () => {
    expect(monthKeysForWindow("2026-01-28")).toEqual(["2026-01", "2026-02"]);
    expect(monthKeysForWindow("2026-02-01")).toEqual(["2026-02"]);
  });

  it("anchors initial window to the Monday of the week containing today", () => {
    const startIso = initialBiweekStart(new Date(2026, 1, 10));

    expect(startIso).toBe("2026-02-09");
    expect(biweekWindowDays(startIso)).toContain("2026-02-10");
  });
});

describe("monthly calendar date helpers", () => {
  it("uses Monday as weekday index zero", () => {
    expect(weekdayIndexMondayFirst(new Date(2026, 1, 2))).toBe(0);
    expect(weekdayIndexMondayFirst(new Date(2026, 1, 1))).toBe(6);
  });

  it("handles month arithmetic including December/January transitions", () => {
    expect(toIsoDate(addMonths(new Date(2026, 11, 1), 1))).toBe("2027-01-01");
    expect(toIsoDate(addMonths(new Date(2026, 0, 1), -1))).toBe("2025-12-01");
  });

  it("returns proper days count for leap and non-leap February", () => {
    expect(daysInMonthCount(new Date(2026, 1, 1))).toBe(28);
    expect(daysInMonthCount(new Date(2028, 1, 1))).toBe(29);
  });

  it("builds complete month grid for month starting on Monday", () => {
    const cells = buildMonthGrid(new Date(2026, 5, 1));

    expect(cells).toHaveLength(35);
    expect(cells[0].iso).toBe("2026-06-01");
    expect(cells[34].iso).toBe("2026-07-05");
  });

  it("builds complete month grid for month starting on Sunday including previous month days", () => {
    const cells = buildMonthGrid(new Date(2026, 10, 1));

    expect(cells[0].iso).toBe("2026-10-26");
    expect(cells[6].iso).toBe("2026-11-01");
    expect(cells).toHaveLength(42);
  });

  it("creates six-row month grids when required", () => {
    const cells = buildMonthGrid(new Date(2026, 2, 1));

    expect(cells).toHaveLength(42);
    expect(cells[0].iso).toBe("2026-02-23");
    expect(cells[41].iso).toBe("2026-04-05");
  });

  it("preserves local date keys without UTC drift", () => {
    const local = parseIsoDate("2026-08-04");

    expect(toIsoDate(local)).toBe("2026-08-04");
    expect(isIsoTodayLocal("2026-08-04", new Date(2026, 7, 4, 23, 59, 59))).toBe(true);
    expect(isIsoTodayLocal("2026-08-05", new Date(2026, 7, 4, 23, 59, 59))).toBe(false);
  });
});

describe("isValidIsoDate", () => {
  it("accepts valid calendar dates", () => {
    expect(isValidIsoDate("2026-08-04")).toBe(true);
    expect(isValidIsoDate("2028-02-29")).toBe(true);
    expect(isValidIsoDate("1900-01-01")).toBe(true);
  });

  it("rejects structurally valid but impossible dates", () => {
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2027-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-00-10")).toBe(false);
  });

  it("rejects malformed values", () => {
    expect(isValidIsoDate("")).toBe(false);
    expect(isValidIsoDate("06-08-2026")).toBe(false);
    expect(isValidIsoDate("2026-08")).toBe(false);
    expect(isValidIsoDate("2026-8-4")).toBe(false);
    expect(isValidIsoDate("2026-08-04T10:00:00")).toBe(false);
  });
});

describe("parseYearMonth", () => {
  it("parses valid year-month values without UTC shifts", () => {
    const parsed = parseYearMonth("2026-03");
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(2);
    expect(parsed?.getDate()).toBe(1);
  });

  it("handles January and December transitions", () => {
    expect(parseYearMonth("2026-01")?.getMonth()).toBe(0);
    expect(parseYearMonth("2025-12")?.getFullYear()).toBe(2025);
    expect(parseYearMonth("2025-12")?.getMonth()).toBe(11);
  });

  it("rejects invalid year-month values", () => {
    expect(parseYearMonth("2026-13")).toBeNull();
    expect(parseYearMonth("2026-00")).toBeNull();
    expect(parseYearMonth("2026")).toBeNull();
    expect(parseYearMonth("2026-03-05")).toBeNull();
    expect(parseYearMonth("")).toBeNull();
  });
});
