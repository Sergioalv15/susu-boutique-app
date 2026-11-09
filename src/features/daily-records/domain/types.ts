export interface DailyRecord {
  date: string;
  totalSold: number;
  additionalExpenses: number;
  profitPercent: number;
  notes: string;
  dataphoneSales?: number;
}

export interface DailyProfit {
  grossProfit: number;
  netProfit: number;
  investment: number;
}

export interface MonthlyOverview {
  month: string;
  totalSold: number;
  totalInvested: number;
  totalAdditionalExpenses: number;
  grossProfit: number;
  netProfit: number;
  averageDailyNetProfit: number;
  estimatedSalary: number;
  trackedDays: number;
  totalDataphoneSales: number;
}
