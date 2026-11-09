import { DailyRecord } from "../../domain/types";

export type DayCellStatus = "empty" | "filled";

export function deriveDayCellStatus(record?: DailyRecord): DayCellStatus {
  return record ? "filled" : "empty";
}
