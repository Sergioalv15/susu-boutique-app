import { describe, expect, it } from "vitest";
import { HolidaySyncService } from "./HolidaySyncService";
import { Holiday } from "../domain/types";
import { HolidayApi } from "../infrastructure/HolidayApiService";
import { HolidayRepository } from "./HolidayRepository";

function createFakeApi(fetchFn: (years: number[]) => Promise<Holiday[]>) {
  const calls: number[][] = [];
  const api: HolidayApi = {
    fetchNationalHolidays: async (years) => {
      calls.push(years);
      return fetchFn(years);
    },
  };
  return { api, calls };
}

describe("HolidaySyncService.syncSilently", () => {
  it("fetches current and next national years on first sync and records lastSync", async () => {
    const { api, calls } = createFakeApi(async () => [
      { date: "2026-01-01", name: "Año Nuevo", scope: "nacional" },
    ]);
    const repository: HolidayRepository = {
      upsertMany: async () => undefined,
      listBetween: async () => [],
      getAll: async () => [],
      getLastSync: async () => null,
      setLastSync: async () => undefined,
      applySync: async () => true,
    };
    const service = new HolidaySyncService(repository, api);

    const result = await service.syncSilently(new Date(2026, 4, 1));

    expect(result.synced).toBe(true);
    expect(result.error).toBeNull();
    expect(calls).toEqual([[2026, 2027]]);
  });

  it("reports a failed network fetch as an error result instead of throwing", async () => {
    const { api } = createFakeApi(async () => {
      throw new Error("Network down");
    });
    const repository: HolidayRepository = {
      upsertMany: async () => undefined,
      listBetween: async () => [],
      getAll: async () => [],
      getLastSync: async () => null,
      setLastSync: async () => undefined,
      applySync: async () => true,
    };
    const service = new HolidaySyncService(repository, api);

    const result = await service.syncSilently(new Date(2026, 4, 1));

    expect(result.synced).toBe(false);
    expect(result.error).toContain("Network down");
  });

  it("deduplicates concurrent syncs so the API fetch runs once", async () => {
    let fetchCount = 0;
    const { api } = createFakeApi(async (years) => {
      fetchCount += 1;
      return years.map(
        (year): Holiday => ({ date: `${year}-01-01`, name: "Año Nuevo", scope: "nacional" }),
      );
    });
    const repository: HolidayRepository = {
      upsertMany: async () => undefined,
      listBetween: async () => [],
      getAll: async () => [],
      getLastSync: async () => null,
      setLastSync: async () => undefined,
      applySync: async () => true,
    };
    const service = new HolidaySyncService(repository, api);

    const [first, second] = await Promise.all([
      service.syncSilently(new Date(2026, 4, 1)),
      service.syncSilently(new Date(2026, 4, 1)),
    ]);

    expect(first.synced).toBe(true);
    expect(second.synced).toBe(true);
    expect(fetchCount).toBe(1);
  });

  it("allows a retry after a failed sync to fetch again", async () => {
    let shouldFail = true;
    const { api, calls } = createFakeApi(async () => {
      if (shouldFail) {
        throw new Error("Network down");
      }
      return [{ date: "2026-01-01", name: "Año Nuevo", scope: "nacional" }];
    });
    const repository: HolidayRepository = {
      upsertMany: async () => undefined,
      listBetween: async () => [],
      getAll: async () => [],
      getLastSync: async () => null,
      setLastSync: async () => undefined,
      applySync: async () => true,
    };
    const service = new HolidaySyncService(repository, api);

    const failed = await service.syncSilently(new Date(2026, 4, 1));
    shouldFail = false;
    const recovered = await service.syncSilently(new Date(2026, 4, 1));

    expect(failed.synced).toBe(false);
    expect(recovered.synced).toBe(true);
    expect(calls).toHaveLength(2);
  });
});

describe("HolidaySyncService.syncYears", () => {
  it("fetches and stores an explicit year without touching lastSync", async () => {
    const { api, calls } = createFakeApi(async () => [
      { date: "2030-01-01", name: "Año Nuevo", scope: "nacional" },
    ]);
    const lastSyncWrites: string[] = [];
    const upserted: Holiday[][] = [];
    const repository: HolidayRepository = {
      upsertMany: async (holidays) => {
        upserted.push(holidays);
      },
      listBetween: async () => [],
      getAll: async () => [],
      getLastSync: async () => "2026-01-01T00:00:00Z",
      setLastSync: async (timestamp) => {
        lastSyncWrites.push(timestamp);
      },
      applySync: async (holidays) => {
        upserted.push(holidays);
        return true;
      },
    };
    const service = new HolidaySyncService(repository, api);

    const result = await service.syncYears([2030]);

    expect(result.synced).toBe(true);
    expect(result.error).toBeNull();
    expect(calls).toEqual([[2030]]);
    expect(upserted).toHaveLength(1);
    expect(upserted[0][0].name).toBe("Año Nuevo");
    expect(lastSyncWrites).toEqual([]);
  });

  it("discards a response when the database generation changed during the fetch", async () => {
    const { api } = createFakeApi(async () => [
      { date: "2031-01-01", name: "Año Nuevo", scope: "nacional" },
    ]);
    let receivedGeneration: number | null = null;
    const repository: HolidayRepository = {
      upsertMany: async () => undefined,
      listBetween: async () => [],
      getAll: async () => [],
      getLastSync: async () => null,
      setLastSync: async () => undefined,
      applySync: async (_holidays, _timestamp, generation) => {
        receivedGeneration = generation;
        return false;
      },
    };
    const service = new HolidaySyncService(repository, api);

    const result = await service.syncYears([2031]);

    expect(result).toEqual({ synced: false, error: null });
    expect(receivedGeneration).toBe(0);
  });
});
