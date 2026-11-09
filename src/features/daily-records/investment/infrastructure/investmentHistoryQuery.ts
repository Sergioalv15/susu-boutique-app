import { InvestmentHistoryPageRequest } from '../domain/types';

export interface InvestmentHistorySqlQuery {
  sql: string;
  parameters: Array<string | number>;
  pageSize: number;
}

function monthRange(month: string): { start: string; end: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new RangeError('Invalid investment history month');

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new RangeError('Invalid investment history month');
  }

  const nextMonth = monthNumber === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`;
  return { start: `${month}-01`, end: nextMonth };
}

export function buildInvestmentHistorySql(
  request: InvestmentHistoryPageRequest,
): InvestmentHistorySqlQuery {
  const requestedLimit = Number.isFinite(request.limit)
    ? Math.floor(request.limit)
    : 25;
  const pageSize = Math.min(100, Math.max(1, requestedLimit));
  const predicates: string[] = [];
  const parameters: Array<string | number> = [];

  if (request.type) {
    predicates.push("COALESCE(a.type, 'ajuste') = ?");
    parameters.push(request.type);
  }

  if (request.month) {
    const range = monthRange(request.month);
    predicates.push('a.date >= ? AND a.date < ?');
    parameters.push(range.start, range.end);
  }

  if (request.cursor) {
    predicates.push('(a.date < ? OR (a.date = ? AND a.id < ?))');
    parameters.push(
      request.cursor.date,
      request.cursor.date,
      request.cursor.id,
    );
  }

  const where = predicates.length > 0 ? `WHERE ${predicates.join(' AND ')}` : '';
  parameters.push(pageSize + 1);

  return {
    pageSize,
    parameters,
    sql: `SELECT a.id, a.date, a.amount, a.note, a.type, s.name AS supplier_name
          FROM investment_adjustments a
          LEFT JOIN suppliers s ON s.id = a.supplier_id
          ${where}
          ORDER BY a.date DESC, a.id DESC
          LIMIT ?`,
  };
}
