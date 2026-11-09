import { describe, expect, it } from "vitest";
import { loadCalendarHolidaysWithYearCoverage } from "./calendarHolidaysLoad";
import { Holiday } from "../domain/types";

const national = (date: string, name: string): Holiday => ({
  date,
  name,
  scope: "nacional" as const,
});

const may2028Range = { start: "2028-05-01", end: "2028-05-31" };

describe("loadCalendarHolidaysWithYearCoverage", () => {
  it("returns cached month holidays without requesting the year", async () => {
    const requestedYears: number[] = [];

    const result = await loadCalendarHolidaysWithYearCoverage(
      {
        listBetween: async () => [national("2028-05-01", "Día del Trabajo")],
        syncYears: async (years) => {
          requestedYears.push(...years);
          return { synced: false, error: null };
        },
      },
      2028,
      may2028Range.start,
      may2028Range.end
    );

    expect(result.holidays.map((h) => h.date)).toEqual(["2028-05-01"]);
    expect(result.yearRequested).toBe(false);
    expect(result.error).toBeNull();
    expect(requestedYears).toEqual([]);
  });

  it("obtains a visible year absent from cache via the existing service and re-queries the month", async () => {
    let store: Holiday[] = [];
    const requestedYears: number[] = [];

    const result = await loadCalendarHolidaysWithYearCoverage(
      {
        listBetween: async () => {
          if (store.length === 0) {
            return [];
          }
          return store.filter(
            (h) => h.date >= may2028Range.start && h.date <= may2028Range.end,
          );
        },
        syncYears: async (years) => {
          requestedYears.push(...years);
          store = [national("2028-05-01", "Día del Trabajo")];
          return { synced: true, error: null };
        },
      },
      2028,
      may2028Range.start,
      may2028Range.end
    );

    expect(requestedYears).toEqual([2028]);
    expect(result.yearRequested).toBe(true);
    expect(result.error).toBeNull();
    expect(result.holidays.map((h) => h.date)).toEqual(["2028-05-01"]);
  });

  it("does not sync when the visible year already has cached holidays but the month is empty", async () => {
    const requestedYears: number[] = [];
    const may2026 = { start: "2026-05-01", end: "2026-05-31" };

    const result = await loadCalendarHolidaysWithYearCoverage(
      {
        listBetween: async (start, end) => {
          if (start === "2026-01-01" && end === "2026-12-31") {
            return [national("2026-03-19", "San José")];
          }
          return [];
        },
        syncYears: async (years) => {
          requestedYears.push(...years);
          return { synced: true, error: null };
        },
      },
      2026,
      may2026.start,
      may2026.end
    );

    expect(result.holidays).toEqual([]);
    expect(result.yearRequested).toBe(false);
    expect(requestedYears).toEqual([]);
  });

  it("exposes the sync failure while still returning whatever the month query holds", async () => {
    const result = await loadCalendarHolidaysWithYearCoverage(
      {
        listBetween: async () => [],
        syncYears: async () => ({ synced: false, error: "Network down" }),
      },
      2029,
      "2029-05-01",
      "2029-05-31"
    );

    expect(result.yearRequested).toBe(true);
    expect(result.error).toBe("Network down");
    expect(result.holidays).toEqual([]);
  });
});