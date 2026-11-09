import { HolidaySyncService } from '../application/HolidaySyncService';
import { HolidayApi, CalendariosNacionalesApi } from '../infrastructure/HolidayApiService';
import { SQLiteHolidayRepository } from '../infrastructure/SQLiteHolidayRepository';

export const holidayRepository = new SQLiteHolidayRepository();
export const holidayApi: HolidayApi = new CalendariosNacionalesApi();
export const holidaySyncService = new HolidaySyncService(holidayRepository, holidayApi);