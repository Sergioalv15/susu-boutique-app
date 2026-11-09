import { describe, expect, it } from "vitest";
import {
  buildMonthlyCalendarLoadStartState,
  createInitialMonthlyCalendarRecordsState,
  shouldSurfaceMonthlyCalendarError,
  upsertMonthlyCalendarCache,
} from "./monthlyCalendarRecordsState";

function createRecord(date: string) {
  return {
    date,
    totalSold: 100,
    additionalExpenses: 10,
    profitPercent: 0.3,
    notes: "record",
  };
}

describe("monthlyCalendarRecordsState", () => {
  it("starts with blocking loading only before first usable data", () => {
    const initial = createInitialMonthlyCalendarRecordsState();

    expect(initial.loading).toBe(true);
    expect(initial.refreshing).toBe(false);
    expect(initial.recordsByIso.size).toBe(0);
  });

  it("keeps month transition non-blocking after first successful load", () => {
    const nextMonthStart = buildMonthlyCalendarLoadStartState(true);

    expect(nextMonthStart.loading).toBe(false);
    expect(nextMonthStart.refreshing).toBe(true);
    expect(nextMonthStart.error).toBeNull();
    expect(nextMonthStart.recordsByIso.size).toBe(0);
  });

  it("uses visible-month cache as stale data while revalidating", () => {
    const cached = new Map([["2026-11-10", createRecord("2026-11-10")]]);
    const start = buildMonthlyCalendarLoadStartState(true, cached);

    expect(start.loading).toBe(false);
    expect(start.refreshing).toBe(true);
    expect(start.recordsByIso.get("2026-11-10")?.notes).toBe("record");
  });

  it("surfaces error only when first load has no cached month", () => {
    expect(shouldSurfaceMonthlyCalendarError(false, undefined)).toBe(true);
    expect(shouldSurfaceMonthlyCalendarError(false, new Map())).toBe(false);
    expect(shouldSurfaceMonthlyCalendarError(true, undefined)).toBe(false);
  });

  it("keeps month cache bounded and evicts oldest months first", () => {
    let cache = new Map<string, Map<string, ReturnType<typeof createRecord>>>();

    cache = upsertMonthlyCalendarCache(cache, "2026-08", new Map([["2026-08-01", createRecord("2026-08-01")]]), 3);
    cache = upsertMonthlyCalendarCache(cache, "2026-09", new Map([["2026-09-01", createRecord("2026-09-01")]]), 3);
    cache = upsertMonthlyCalendarCache(cache, "2026-10", new Map([["2026-10-01", createRecord("2026-10-01")]]), 3);
    cache = upsertMonthlyCalendarCache(cache, "2026-11", new Map([["2026-11-01", createRecord("2026-11-01")]]), 3);

    expect(cache.has("2026-08")).toBe(false);
    expect(cache.has("2026-09")).toBe(true);
    expect(cache.has("2026-10")).toBe(true);
    expect(cache.has("2026-11")).toBe(true);
  });
});
