export const FIND_MOST_RECENT_DAILY_RECORD_ON_OR_BEFORE_QUERY = `
  SELECT date, total_sold, additional_expenses, profit_percent, notes, dataphone_sales
  FROM daily_records
  WHERE date <= ?
  ORDER BY date DESC
  LIMIT 1
`;
