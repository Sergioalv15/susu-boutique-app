import { DailyRecord, MonthlyOverview } from "../../domain/types";
import { computeDailyProfit } from "../../domain/calculators";

export interface HomeKpis {
  ventasUltimoDia: number;
  ultimaInversion: number;
  beneficioBrutoTotalMes: number;
  beneficioNetoMesActual: number;
  lastRecordDate: string | null;
}

function getLatestRecord(records: DailyRecord[]): DailyRecord | null {
  if (records.length === 0) {
    return null;
  }

  return records.reduce((latest, current) => {
    return current.date > latest.date ? current : latest;
  });
}

export function deriveHomeKpis(
  overview: MonthlyOverview,
  records: DailyRecord[],
): HomeKpis {
  const latestRecord = getLatestRecord(records);

  return {
    ventasUltimoDia: latestRecord?.totalSold ?? 0,
    ultimaInversion: latestRecord ? computeDailyProfit(latestRecord).investment : 0,
    beneficioBrutoTotalMes: overview.grossProfit,
    beneficioNetoMesActual: overview.netProfit,
    lastRecordDate: latestRecord?.date ?? null,
  };
}
