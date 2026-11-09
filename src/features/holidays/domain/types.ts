export type HolidayScope = 'nacional' | 'autonomico' | 'provincial' | 'local';

export interface Holiday {
  date: string;
  name: string;
  scope: HolidayScope;
}

export interface UpcomingHoliday extends Holiday {
  daysUntil: number;
}