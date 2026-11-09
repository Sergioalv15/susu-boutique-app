import { describe, expect, it } from "vitest";
import { holidaysByIso } from "./holidaysByIso";
import { computeUpcomingHolidays } from "./upcoming";

describe("holidaysByIso", () => {
  it("maps each date to its holiday name", () => {
    const map = holidaysByIso([
      { date: "2026-01-01", name: "Año Nuevo" },
      { date: "2026-05-01", name: "Día del Trabajo" },
    ]);

    expect(map.get("2026-01-01")).toBe("Año Nuevo");
    expect(map.get("2026-05-01")).toBe("Día del Trabajo");
    expect(map.size).toBe(2);
  });

  it("keeps the first name when a date has multiple scopes", () => {
    const map = holidaysByIso([
      { date: "2026-06-24", name: "San Juan" },
      { date: "2026-06-24", name: "Fiesta local" },
    ]);

    expect(map.get("2026-06-24")).toBe("San Juan");
    expect(map.size).toBe(1);
  });
});

describe("computeUpcomingHolidays", () => {
  it("returns holidays on or after today within the window, sorted by date", () => {
    const holidays = [
      { date: "2026-08-20", name: "Hoy", scope: "nacional" as const },
      { date: "2026-07-01", name: "Pasado", scope: "nacional" as const },
      { date: "2026-08-25", name: "Dentro", scope: "nacional" as const },
      { date: "2026-09-10", name: "Fuera", scope: "nacional" as const },
    ];

    const upcoming = computeUpcomingHolidays(holidays, new Date(2026, 7, 20), 14);

    expect(upcoming.map((h) => h.name)).toEqual(["Hoy", "Dentro"]);
    expect(upcoming[0].daysUntil).toBe(0);
    expect(upcoming[1].daysUntil).toBe(5);
  });
});