import { useCallback, useEffect, useRef, useState } from 'react';
import { DailyRecordViewModel } from '../../application/dto';
import { dailyRecordService } from '../../infrastructure/container';
import { createLatestWins } from '../../../../core/utils/latestWins';
import { toIsoDate } from '../../../../core/utils/date';

interface MostRecentDailyRecordState {
  loading: boolean;
  result: DailyRecordViewModel | null;
  error: string | null;
}

export function useMostRecentDailyRecord(onOrBefore = toIsoDate(new Date())) {
  const [state, setState] = useState<MostRecentDailyRecordState>({
    loading: true,
    result: null,
    error: null,
  });
  const latest = useRef(createLatestWins());

  const refresh = useCallback(async (date = onOrBefore) => {
    const request = latest.current.begin();
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const result = await dailyRecordService.getMostRecentDailyRecord(date);
      if (latest.current.isCurrent(request)) {
        setState({ loading: false, result, error: null });
      }
    } catch {
      if (latest.current.isCurrent(request)) {
        setState((previous) => ({ ...previous, loading: false, error: 'No se pudo cargar el último día registrado.' }));
      }
    }
  }, [onOrBefore]);

  useEffect(() => {
    void refresh(onOrBefore);
    return () => latest.current.invalidate();
  }, [onOrBefore, refresh]);

  return { ...state, refresh };
}
