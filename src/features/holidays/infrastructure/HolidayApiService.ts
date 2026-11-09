import { Holiday } from '../domain/types';

const API_BASE = 'https://calendariosnacionales.com/es/v1';

type ApiHoliday = {
  date: string;
  name: string;
  scope: string;
};

type ApiResponse = {
  holidays?: ApiHoliday[];
};

export interface HolidayApi {
  fetchNationalHolidays(years: number[]): Promise<Holiday[]>;
}

export class CalendariosNacionalesApi implements HolidayApi {
  async fetchNationalHolidays(years: number[]): Promise<Holiday[]> {
    const holidays: Holiday[] = [];

    for (const year of years) {
      const response = await fetch(`${API_BASE}/${year}/nacionales.json`);
      if (!response.ok) {
        throw new Error(`Holiday API responded with ${response.status} for year ${year}`);
      }

      const payload = (await response.json()) as ApiResponse;
      if (!Array.isArray(payload.holidays)) {
        throw new Error(`Holiday API returned unexpected payload for year ${year}`);
      }

      for (const item of payload.holidays) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !item.name) {
          continue;
        }
        holidays.push({
          date: item.date,
          name: item.name,
          scope: 'nacional',
        });
      }
    }

    return holidays;
  }
}