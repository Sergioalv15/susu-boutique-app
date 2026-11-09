import { describe, expect, it } from "vitest";
import { buildDayRouteFromIso } from "./dayRoute";
import {
  loadMonthlyBoundaryAwareRecords,
  mergeBoundaryRecords,
  planBoundaryLoad,
} from "./monthlyCalendarBoundary";
import { buildMonthlyCalendarCells } from "./monthlyCalendarModel";

describe("monthlyCalendarBoundary", () => {
  it("plans previous and next boundary loads when visible month is surrounded by adjacent cells", () => {
    const plan = planBoundaryLoad(new Date(2026, 10, 1));

    expect(plan.needsPrev).toBe(true);
    expect(plan.needsNext).toBe(true);
    expect(plan.boundaryIsos).toContain("2026-10-26");
    expect(plan.boundaryIsos).toContain("2026-12-06");
  });

  it("handles year boundaries for January grid", () => {
    const plan = planBoundaryLoad(new Date(2027, 0, 1));

    expect(plan.needsPrev).toBe(true);
    expect(plan.needsNext).toBe(false);
    expect(plan.boundaryIsos).toContain("2026-12-28");
    expect(plan.boundaryIsos).toContain("2026-12-31");
  });

  it("merges only rendered boundary days from adjacent records", () => {
    const visible = [
      {
        date: "2026-11-01",
        totalSold: 200,
        additionalExpenses: 5,
        profitPercent: 0.3,
        notes: "visible",
      },
    ];
    const adjacent = [
      {
        date: "2026-10-31",
        totalSold: 100,
        additionalExpenses: 10,
        profitPercent: 0.3,
        notes: "boundary",
      },
      {
        date: "2026-10-15",
        totalSold: 90,
        additionalExpenses: 5,
        profitPercent: 0.3,
        notes: "not-rendered",
      },
    ];

    const map = mergeBoundaryRecords(visible, adjacent, ["2026-10-31"]);

    expect(map.get("2026-11-01")?.notes).toBe("visible");
    expect(map.get("2026-10-31")?.notes).toBe("boundary");
    expect(map.has("2026-10-15")).toBe(false);
  });

  it("keeps adjacent boundary route format stable", () => {
    expect(buildDayRouteFromIso("2026-12-01")).toBe("/day/2026-12-01");
  });

  it("marks merged adjacent boundary records as filled in month cells", () => {
    const map = mergeBoundaryRecords(
      [
        {
          date: "2026-11-01",
          totalSold: 100,
          additionalExpenses: 5,
          profitPercent: 0.3,
          notes: "in",
        },
      ],
      [
        {
          date: "2026-10-31",
          totalSold: 80,
          additionalExpenses: 5,
          profitPercent: 0.3,
          notes: "boundary",
        },
      ],
      ["2026-10-31"],
    );

    const cells = buildMonthlyCalendarCells(new Date(2026, 10, 1), map);
    const boundaryCell = cells.find((cell) => cell.iso === "2026-10-31");

    expect(boundaryCell?.isCurrentMonth).toBe(false);
    expect(boundaryCell?.status).toBe("filled");
    expect(buildDayRouteFromIso(boundaryCell?.iso ?? "")).toBe("/day/2026-10-31");
  });

  it("loads visible month only when no adjacent boundaries are rendered", async () => {
    const calls: string[] = [];
    const result = await loadMonthlyBoundaryAwareRecords(new Date(2021, 1, 1), async (date) => {
      calls.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);

      return {
        records: [
          {
            date: "2021-02-14",
            totalSold: 70,
            additionalExpenses: 5,
            profitPercent: 0.3,
            notes: "visible-only",
          },
        ],
      };
    });

    expect(calls).toEqual(["2021-02"]);
    expect(result.recordsByIso.get("2021-02-14")?.notes).toBe("visible-only");
  });

  it("loads visible plus bounded adjacent months and merges rendered boundary days only", async () => {
    const calls: string[] = [];
    const result = await loadMonthlyBoundaryAwareRecords(new Date(2026, 10, 1), async (date) => {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      calls.push(key);

      if (key === "2026-11") {
        return {
          records: [
            {
              date: "2026-11-15",
              totalSold: 150,
              additionalExpenses: 10,
              profitPercent: 0.3,
              notes: "visible",
            },
          ],
        };
      }

      if (key === "2026-10") {
        return {
          records: [
            {
              date: "2026-10-31",
              totalSold: 100,
              additionalExpenses: 10,
              profitPercent: 0.3,
              notes: "prev-boundary",
            },
            {
              date: "2026-10-15",
              totalSold: 100,
              additionalExpenses: 10,
              profitPercent: 0.3,
              notes: "prev-not-boundary",
            },
          ],
        };
      }

      return {
        records: [
          {
            date: "2026-12-01",
            totalSold: 120,
            additionalExpenses: 10,
            profitPercent: 0.3,
            notes: "next-boundary",
          },
        ],
      };
    });

    expect(calls).toEqual(["2026-11", "2026-10", "2026-12"]);
    expect(result.recordsByIso.get("2026-11-15")?.notes).toBe("visible");
    expect(result.recordsByIso.get("2026-10-31")?.notes).toBe("prev-boundary");
    expect(result.recordsByIso.get("2026-12-01")?.notes).toBe("next-boundary");
    expect(result.recordsByIso.has("2026-10-15")).toBe(false);
  });
});
