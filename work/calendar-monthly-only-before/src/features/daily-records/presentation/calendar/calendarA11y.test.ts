import { describe, expect, it } from "vitest";
import {
  buildBiweeklyRangeAnnouncement,
  buildDayAccessibilityHint,
  buildDayAccessibilityLabel,
  buildMonthlyDayAccessibilityHint,
  buildMonthlyDayAccessibilityLabel,
} from "./calendarA11y";

describe("calendarA11y", () => {
  it("builds a clear biweekly range announcement", () => {
    expect(buildBiweeklyRangeAnnouncement("2026-08-04", "2026-08-17")).toBe(
      "Rango activo del 04/08 al 17/08",
    );
  });

  it("builds day labels with status and selection context", () => {
    expect(buildDayAccessibilityLabel("2026-08-04", "filled", false)).toBe(
      "martes 04, con registro",
    );

    expect(buildDayAccessibilityLabel("2026-08-05", "empty", true)).toBe(
      "miercoles 05, sin registro, seleccionado",
    );
  });

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
