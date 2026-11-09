import { Holiday } from '../domain/types';

/**
 * Web counterpart of `CalendariosNacionalesApi`.
 *
 * The upstream holiday API does not send CORS headers, so a browser cannot read
 * its responses and no sync is possible from the web build. Returning an empty
 * list keeps `HolidaySyncService` quiet (no network errors, no `lastSync`
 * bookkeeping churn) and the UI simply renders without upcoming holidays.
 */
export class CalendariosNacionalesApi {
  async fetchNationalHolidays(_years: number[]): Promise<Holiday[]> {
    return [];
  }
}
