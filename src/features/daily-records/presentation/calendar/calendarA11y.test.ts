import { describe, expect, it } from "vitest";
import {
  buildDayAccessibilityHint,
  buildMonthlyDayAccessibilityHint,
  buildMonthlyDayAccessibilityLabel,
} from "./calendarA11y";

describe("calendarA11y", () => {
  it("returns contextual hints for day cells", () => {
    expect(buildDayAccessibilityHint("filled")).toBe(
      "Doble toque para abrir y editar este registro.",
    );

    expect(buildDayAccessibilityHint("empty")).toBe(
      "Doble toque para crear el registro de este día.",
    );

    expect(buildMonthlyDayAccessibilityHint("empty", false)).toBe(
      "Doble toque para abrir este día.",
    );
  });

  it("builds monthly labels with full date, month scope and record status", () => {
    expect(buildMonthlyDayAccessibilityLabel("2026-08-04", "filled", true)).toContain(
      "mes visible, con registro",
    );
    const adjacentMonthLabel = buildMonthlyDayAccessibilityLabel(
      "2026-08-05",
      "empty",
      false,
    );

    expect(adjacentMonthLabel).toContain("mes adyacente");
    expect(adjacentMonthLabel).not.toContain("sin registro");
  });
});
