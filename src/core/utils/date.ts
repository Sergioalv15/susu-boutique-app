export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatSpanishShortDate(date: Date): string {
  const weekday = date
    .toLocaleDateString('es-ES', { weekday: 'short' })
    .replace(/\.$/, '');
  const calendarDate = date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${weekday} ${calendarDate}`;
}

export function monthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function daysInMonthCount(date: Date): number {
  return endOfMonth(date).getDate();
}

export function weekdayIndexMondayFirst(date: Date): number {
  const sundayFirst = date.getDay();
  return (sundayFirst + 6) % 7;
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export interface MonthGridCell {
  iso: string;
  date: Date;
  isCurrentMonth: boolean;
}

export function daysInMonth(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days: Date[] = [];
  for (let day = 1; day <= end.getDate(); day += 1) {
    days.push(new Date(start.getFullYear(), start.getMonth(), day));
  }
  return days;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function buildMonthGrid(date: Date): MonthGridCell[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  const gridStart = addDays(monthStart, -weekdayIndexMondayFirst(monthStart));
  const trailingOffset = 6 - weekdayIndexMondayFirst(monthEnd);
  const gridEnd = addDays(monthEnd, trailingOffset);

  const cells: MonthGridCell[] = [];
  for (
    let cursor = new Date(gridStart);
    cursor <= gridEnd;
    cursor = addDays(cursor, 1)
  ) {
    cells.push({
      iso: toIsoDate(cursor),
      date: new Date(cursor),
      isCurrentMonth: isSameMonth(cursor, monthStart),
    });
  }

  return cells;
}

export function isIsoTodayLocal(iso: string, now = new Date()): boolean {
  return iso === toIsoDate(now);
}

export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function parseYearMonth(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return null;
  }

  return new Date(year, month - 1, 1);
}
