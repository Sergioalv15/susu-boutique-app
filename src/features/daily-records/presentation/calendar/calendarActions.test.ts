import { describe, expect, it } from "vitest";
import { deriveDayCellStatus } from "./dayCellStatus";
import {
  buildDayRouteFromIso,
  buildInvestmentPurchaseRouteFromIso,
} from "./dayRoute";

describe("deriveDayCellStatus", () => {
  it("returns filled when record exists and empty when missing", () => {
    expect(deriveDayCellStatus(undefined)).toBe("empty");
    expect(
      deriveDayCellStatus({
        date: "2026-02-10",
        totalSold: 100,
        additionalExpenses: 10,
        profitPercent: 0.3,
        notes: "ok",
      }),
    ).toBe("filled");
  });
});

describe("buildDayRouteFromIso", () => {
  it("creates route compatible with existing day screen", () => {
    expect(buildDayRouteFromIso("2026-02-10")).toBe("/day/2026-02-10");
    expect(buildDayRouteFromIso("2026-12-01")).toBe("/day/2026-12-01");
  });
});

describe("buildInvestmentPurchaseRouteFromIso", () => {
  it("creates investment purchase route with the selected date", () => {
    expect(buildInvestmentPurchaseRouteFromIso("2026-02-10")).toBe(
      "/investment/purchase?date=2026-02-10",
    );
  });
});
