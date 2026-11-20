import { describe, expect, it } from 'vitest';
import { describeStockCostSubgroup } from './stockCostSubgroups';

describe('describeStockCostSubgroup', () => {
  it('shows exact cost labels to owners and keeps unknown cost distinct from free stock', () => {
    expect(describeStockCostSubgroup({ subgroupId: 'lot-1', remainingUnits: 20, unitCostCents: 250 }, 0, true))
      .toEqual({ label: 'Coste de compra', unitCostCents: 250 });
    expect(describeStockCostSubgroup({ subgroupId: 'lot-2', remainingUnits: 4, unitCostCents: 0 }, 1, true))
      .toEqual({ label: 'Coste de compra', unitCostCents: 0 });
    expect(describeStockCostSubgroup({ subgroupId: 'lot-3', remainingUnits: 2, unitCostCents: null }, 2, true))
      .toEqual({ label: 'Coste desconocido', unitCostCents: null });
  });

  it('returns neutral labels and no purchase cost for staff', () => {
    expect(describeStockCostSubgroup({ subgroupId: 'lot-1', remainingUnits: 20, unitCostCents: 250 }, 0, false))
      .toEqual({ label: 'Subgrupo 1' });
    expect(describeStockCostSubgroup({ subgroupId: 'lot-2', remainingUnits: 4, unitCostCents: 150 }, 1, false))
      .toEqual({ label: 'Subgrupo 2' });
  });
});
