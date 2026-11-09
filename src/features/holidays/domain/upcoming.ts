import { toIsoDate, parseIsoDate } from '../../../core/utils/date';
import { Holiday, UpcomingHoliday } from './types';

export function computeUpcomingHolidays(
  holidays: Holiday[],
  today: Date,
  withinDays: number | null = 14
): UpcomingHoliday[] {
  const todayIso = toIsoDate(today);
  const limitIso = withinDays === null
    ? null
    : toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + withinDays));

  return holidays
    .filter((holiday) => holiday.date >= todayIso && (limitIso === null || holiday.date <= limitIso))
    .map((holiday) => ({
      ...holiday,
      daysUntil: diffInDays(todayIso, holiday.date),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function diffInDays(fromIso: string, toIso: string): number {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
