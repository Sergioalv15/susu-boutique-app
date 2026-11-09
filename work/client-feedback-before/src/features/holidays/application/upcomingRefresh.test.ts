import { describe, expect, it } from "vitest";
import { refreshUpcomingHolidays } from "./upcomingRefresh";
import { Holiday, HolidayScope } from "../domain/types";

const national = (date: string, name: string): Holiday => ({
  date,
  name,
  scope: "nacional" as HolidayScope,
});

const now = new Date(2026, 7, 20);

describe("refreshUpcomingHolidays", () => {
  it("first launch: syncs, publishes after persistence, then queries and returns upcoming holidays", async () => {
    const calls: string[] = [];
    let cacheHolidays: Holiday[] = [];

    const result = await refreshUpcomingHolidays(
      {
        syncSilently: async () => {
          calls.push("sync");
          cacheHolidays = [national("2026-08-25", "Dentro")];
          return { synced: true, error: null };
        },
        getAll: async () => {
          calls.push("query");
          return cacheHolidays;
        },
      },
      now,
      14,
      3,
      () => calls.push("publish")
    );

    expect(calls).toEqual(["sync", "publish", "query"]);
    expect(result.error).toBeNull();
    expect(result.holidays.map((h) => h.name)).toEqual(["Dentro"]);
  });

  it("failure with cached data: reports the error and keeps cached holidays", async () => {
    const cachedHolidays = [national("2026-08-25", "Dentro")];

    const result = await refreshUpcomingHolidays(
      {
        syncSilently: async () => ({ synced: false, error: "Network down" }),
        getAll: async () => cachedHolidays,
      },
      now,
      14,
      3
    );

    expect(result.error).toBe("Network down");
    expect(result.holidays.map((h) => h.name)).toEqual(["Dentro"]);
  });

  it("recovery/retry: a later successful sync publishes and surfaces the fresh list", async () => {
    let shouldFail = true;
    let cacheHolidays: Holiday[] = [];

    const first = await refreshUpcomingHolidays(
      {
        syncSilently: async () => {
          if (shouldFail) {
            return { synced: false, error: "Network down" };
          }
          cacheHolidays = [national("2026-08-25", "Dentro")];
          return { synced: true, error: null };
        },
        getAll: async () => cacheHolidays,
      },
      now,
      14,
      3
    );

    expect(first.error).toBe("Network down");
    expect(first.holidays).toEqual([]);

    shouldFail = false;
    const published: string[] = [];

    const second = await refreshUpcomingHolidays(
      {
        syncSilently: async () => {
          if (shouldFail) {
            return { synced: false, error: "Network down" };
          }
          cacheHolidays = [national("2026-08-25", "Dentro")];
          return { synced: true, error: null };
        },
        getAll: async () => cacheHolidays,
      },
      now,
      14,
      3,
      () => published.push("publish")
    );

    expect(second.error).toBeNull();
    expect(second.holidays.map((h) => h.name)).toEqual(["Dentro"]);
    expect(published).toEqual(["publish"]);
  });

  it("does not publish when the sync was skipped because data is fresh", async () => {
    const published: string[] = [];

    const result = await refreshUpcomingHolidays(
      {
        syncSilently: async () => ({ synced: false, error: null }),
        getAll: async () => [national("2026-08-25", "Dentro")],
      },
      now,
      14,
      3,
      () => published.push("publish")
    );

    expect(result.error).toBeNull();
    expect(published).toEqual([]);
  });
});