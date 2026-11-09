import type {
  InvestmentAdjustment,
  InvestmentBalance,
  InvestmentHistoryItem,
  InvestmentHistoryPage,
  InvestmentHistoryPageRequest,
} from '../../../src/features/daily-records/investment/domain/types';

const PAGE_SIZE = 25;
const currentMonth = new Date();
const pad = (value: number) => String(value).padStart(2, '0');
const monthKey = (offset: number) => {
  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - offset, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
};

let nextId = 1;
const history: InvestmentHistoryItem[] = [];

for (let monthOffset = 0; monthOffset < 3; monthOffset += 1) {
  const month = monthKey(monthOffset);
  for (let day = 1; day <= 10; day += 1) {
    const date = `${month}-${pad(day)}`;
    for (const type of ['ajuste', 'compra'] as const) {
      const id = nextId++;
      history.push({
        id,
        date,
        amount: type === 'ajuste' ? 35 + day * 2 : 70 + day * 7,
        note: type === 'ajuste' ? `Ajuste de muestra ${id}` : `Compra de muestra ${id}`,
        type,
        supplierName: type === 'compra' && id % 7 !== 0 ? `Proveedor ${((id - 1) % 4) + 1}` : null,
      });
    }
  }
}

// Include a signed legacy adjustment and a purchase without a supplier link.
const legacyAdjustment = history.find((item) => item.type === 'ajuste' && item.date === `${monthKey(1)}-09`);
if (legacyAdjustment) legacyAdjustment.amount = -47;
const supplierlessPurchase = history.find((item) => item.type === 'compra' && item.date === `${monthKey(0)}-05`);
if (supplierlessPurchase) supplierlessPurchase.supplierName = null;

function orderedHistory(items: InvestmentHistoryItem[]) {
  return [...items].sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id);
}

function totals() {
  const adjustmentsTotal = history
    .filter((item) => item.type === 'ajuste')
    .reduce((sum, item) => sum + item.amount, 0);
  const purchasesTotal = history
    .filter((item) => item.type === 'compra')
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const investedTotal = 1840;
  return {
    available: adjustmentsTotal + investedTotal - purchasesTotal,
    adjustmentsTotal,
    investedTotal,
    purchasesTotal,
  } satisfies InvestmentBalance;
}

export const investmentBalanceService = {
  async getBalance() {
    return totals();
  },

  async addAdjustment(input: { date: string; amount: number; note: string }) {
    const saved: InvestmentHistoryItem = {
      id: nextId++,
      date: input.date,
      amount: Math.abs(input.amount),
      note: input.note || 'Ajuste visual QA',
      type: 'ajuste',
      supplierName: null,
    };
    history.push(saved);
    window.dispatchEvent(new CustomEvent('investment-qa:adjustment', { detail: saved }));
    return { ...saved, supplierId: null } satisfies InvestmentAdjustment;
  },

  async addPurchase(input: { date: string; amount: number; note: string; supplierId?: number | null }) {
    const saved: InvestmentHistoryItem = {
      id: nextId++,
      date: input.date,
      amount: Math.abs(input.amount),
      note: input.note || 'Compra visual QA',
      type: 'compra',
      supplierName: null,
    };
    history.push(saved);
    return { ...saved, supplierId: input.supplierId ?? null } satisfies InvestmentAdjustment;
  },

  async listHistory() {
    return orderedHistory(history);
  },

  async listHistoryPage(request: InvestmentHistoryPageRequest): Promise<InvestmentHistoryPage> {
    const limit = Math.min(PAGE_SIZE, Math.max(1, request.limit));
    const filtered = orderedHistory(history).filter((item) => {
      if (request.type && item.type !== request.type) return false;
      if (request.month && !item.date.startsWith(request.month)) return false;
      if (request.cursor) {
        const isBeforeCursor = item.date < request.cursor.date ||
          (item.date === request.cursor.date && item.id < request.cursor.id);
        if (!isBeforeCursor) return false;
      }
      return true;
    });
    const items = filtered.slice(0, limit);
    const hasMore = filtered.length > items.length;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? { date: last.date, id: last.id } : null;
    window.dispatchEvent(new CustomEvent('investment-qa:page', {
      detail: { limit, type: request.type ?? 'all', month: request.month ?? 'all', cursor: request.cursor ?? null, shown: items.length, hasMore },
    }));
    return { items, hasMore, nextCursor };
  },
};
