import { parseIsoDate } from "../../../../core/utils/date";
import { DayCellStatus } from "./dayCellStatus";

function stripWeekdayPunctuation(value: string): string {
  return value.replace(".", "").trim();
}

function removeAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDayAndMonth(iso: string): string {
  const date = parseIsoDate(iso);
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
}

function formatWeekdayAndDay(iso: string): string {
  const date = parseIsoDate(iso);
  const weekday = removeAccents(
    stripWeekdayPunctuation(
      date.toLocaleDateString("es-ES", { weekday: "long" }),
    ),
  );
  const day = pad2(date.getDate());

  return `${weekday} ${day}`;
}

export function buildBiweeklyRangeAnnouncement(
  startIso: string,
  endIso: string,
): string {
  return `Rango activo del ${formatDayAndMonth(startIso)} al ${formatDayAndMonth(endIso)}`;
}

export function buildDayAccessibilityLabel(
  iso: string,
  status: DayCellStatus,
  isSelected: boolean,
): string {
  const baseStatus = status === "filled" ? "con registro" : "sin registro";
  const selectedStatus = isSelected ? ", seleccionado" : "";

  return `${formatWeekdayAndDay(iso)}, ${baseStatus}${selectedStatus}`;
}

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
