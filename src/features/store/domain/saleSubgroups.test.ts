import { describe, expect, it } from 'vitest';
import { remainingSubgroupUnits } from './saleSubgroups';

describe('sale subgroup availability', () => {
  it('reserves only cart units from the same purchase-cost subgroup', () => {
    const subgroup = { subgroupId: 'lot-2', remainingUnits: 9, unitCostCents: 150 };
    const cart = [
      { key: 1, sourceSubgroupId: 'lot-2', units: 4 },
      { key: 2, sourceSubgroupId: 'lot-1', units: 3 },
    ];

    expect(remainingSubgroupUnits(subgroup, cart)).toBe(5);
  });

  it('does not count the line being edited and clamps stale inventory to zero', () => {
    const subgroup = { subgroupId: 'lot-2', remainingUnits: 3, unitCostCents: 150 };
    const cart = [{ key: 1, sourceSubgroupId: 'lot-2', units: 4 }];

    expect(remainingSubgroupUnits(subgroup, cart, 1)).toBe(3);
    expect(remainingSubgroupUnits(subgroup, cart)).toBe(0);
    expect(remainingSubgroupUnits(undefined, cart)).toBe(0);
  });
});
