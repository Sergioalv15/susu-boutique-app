import { parseIsoDate } from "../../../../core/utils/date";
import { DayCellStatus } from "./dayCellStatus";

export function buildDayAccessibilityHint(status: DayCellStatus): string {
  if (status === "filled") {
    return "Doble toque para abrir y editar este registro.";
  }

  return "Doble toque para crear el registro de este día.";
}

export function buildMonthlyDayAccessibilityHint(
  status: DayCellStatus,
  isCurrentMonth: boolean,
): string {
  if (!isCurrentMonth) {
    return "Doble toque para abrir este día.";
  }

  return buildDayAccessibilityHint(status);
}

function formatFullLocalDate(iso: string): string {
  const date = parseIsoDate(iso);
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function buildMonthlyDayAccessibilityLabel(
  iso: string,
  status: DayCellStatus,
  isCurrentMonth: boolean,
): string {
  const date = formatFullLocalDate(iso);

  if (!isCurrentMonth) {
    return `${date}, mes adyacente`;
  }

  const recordPart = status === "filled" ? "con registro" : "sin registro";

  return `${date}, mes visible, ${recordPart}`;
}
