import { Dispatch, SetStateAction } from 'react';
import { DailyRecord, MonthlyOverview } from '../../domain/types';

export interface MonthlyOverviewError {
  userMessage: string;
  technicalMessage: string;
}

export interface UseMonthlyOverviewState {
  loading: boolean;
  overview: MonthlyOverview | null;
  records: DailyRecord[];
  error: MonthlyOverviewError | null;
}

export interface MonthlyOverviewService {
  getMonthlyOverview: (date: Date) => Promise<{
    overview: MonthlyOverview;
    records: DailyRecord[];
  }>;
}

const DEFAULT_MONTHLY_OVERVIEW_ERROR = 'Could not load monthly overview';

function normalizeTechnicalMessage(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim().length > 0) {
    return cause.message;
  }

  if (typeof cause === 'string' && cause.trim().length > 0) {
    return cause;
  }

  return DEFAULT_MONTHLY_OVERVIEW_ERROR;
}

export function createMonthlyOverviewRefresher(
  service: MonthlyOverviewService,
  setState: Dispatch<SetStateAction<UseMonthlyOverviewState>>,
  month: Date
) {
  return async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await service.getMonthlyOverview(month);
      setState({
        loading: false,
        overview: data.overview,
        records: data.records,
        error: null,
      });
    } catch (cause) {
      const technicalMessage = normalizeTechnicalMessage(cause);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: {
          userMessage: 'No se pudo cargar el inicio.',
          technicalMessage,
        },
      }));
    }
  };
}
