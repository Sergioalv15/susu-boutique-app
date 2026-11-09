import { describe, expect, it } from "vitest";
import { resolveMonthlyDayCellBorder } from "./monthlyCalendarVisualState";

describe("monthlyCalendarVisualState", () => {
  it("returns explicit selected-cell config over any today-only style", () => {
    expect(
      resolveMonthlyDayCellBorder(
        true,
        true,
        "rgba(91,58,41,0.58)",
        "rgba(91,58,41,0.10)",
        "rgba(176,176,176,0.42)",
      ),
    ).toEqual({
      borderWidth: 2,
      borderColor: "rgba(91,58,41,0.58)",
      backgroundColor: "rgba(91,58,41,0.10)",
    });
  });

  it("returns a whole-cell subtle border config for today", () => {
    expect(
      resolveMonthlyDayCellBorder(
        false,
        true,
        "rgba(91,58,41,0.58)",
        "rgba(91,58,41,0.10)",
        "rgba(176,176,176,0.42)",
      ),
    ).toEqual({
      borderWidth: 1,
      borderColor: "rgba(176,176,176,0.42)",
    });
  });

  it("does not add border config for non-today cells", () => {
    expect(
      resolveMonthlyDayCellBorder(
        false,
        false,
        "rgba(91,58,41,0.58)",
        "rgba(91,58,41,0.10)",
        "rgba(176,176,176,0.42)",
      ),
    ).toBeNull();
  });
});
