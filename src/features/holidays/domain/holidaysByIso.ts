import { Holiday } from "./types";

export function holidaysByIso(
  holidays: Pick<Holiday, "date" | "name">[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const holiday of holidays) {
    if (!map.has(holiday.date)) {
      map.set(holiday.date, holiday.name);
    }
  }
  return map;
}