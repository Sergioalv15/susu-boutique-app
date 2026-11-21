import { describe, expect, it, vi } from 'vitest';
import { StockAdministrationRepository } from './StockAdministrationRepository';
import { StockAdministrationService } from './StockAdministrationService';

function createRepository(): StockAdministrationRepository {
  return {
    updateCategory: vi.fn(async (id, name) => ({ id, name, sortOrder: 0 })),
    deleteCategory: vi.fn(async (id) => ({ id, status: 'archived' as const, adjustedUnits: 0 })),
    updatePriceGroup: vi.fn(async (input) => ({
      id: input.priceGroupId,
      previousGroupId: input.priceGroupId,
      categoryId: 1,
      priceCents: input.priceCents,
      stockUnits: 0,
      sortOrder: input.sortOrder,
      photoPath: '',
      status: 'updated' as const,
    })),
    deletePriceGroup: vi.fn(async (id) => ({ id, status: 'archived' as const, adjustedUnits: 0 })),
    removeSubgroupUnits: vi.fn(async (input) => ({
      priceGroupId: input.priceGroupId,
      subgroupId: input.subgroupId,
      unitsRemoved: input.units,
      stockUnits: 0,
      costTotalCents: 0,
    })),
    correctSubgroupCost: vi.fn(async (input) => ({
      priceGroupId: input.priceGroupId,
      previousSubgroupId: input.subgroupId,
      subgroupId: '2',
      unitsMoved: 1,
      previousUnitCostCents: 250,
      unitCostCents: input.unitCostCents,
    })),
  };
}

describe('StockAdministrationService', () => {
  it('trims category names and delegates valid price-group edits', async () => {
    const repository = createRepository();
    const service = new StockAdministrationService(repository);

    await service.updateCategory(2, '  Anillos  ');
    await service.updatePriceGroup({ priceGroupId: 3, priceCents: 1200, sortOrder: 1 });

    expect(repository.updateCategory).toHaveBeenCalledWith(2, 'Anillos');
    expect(repository.updatePriceGroup).toHaveBeenCalledWith({ priceGroupId: 3, priceCents: 1200, sortOrder: 1 });
  });

  it('rejects invalid stock edits before reaching the repository', async () => {
    const repository = createRepository();
    const service = new StockAdministrationService(repository);

    expect(() => service.updateCategory(0, 'Anillos')).toThrow();
    expect(() => service.updateCategory(1, '  ')).toThrow();
    expect(() => service.updatePriceGroup({ priceGroupId: 1, priceCents: 0, sortOrder: 0 })).toThrow();
    expect(() => service.removeSubgroupUnits({ priceGroupId: 1, subgroupId: 'lot-x', units: 1, note: '' })).toThrow();
    expect(() => service.correctSubgroupCost({ priceGroupId: 1, subgroupId: '1', unitCostCents: -1 })).toThrow();
    expect(repository.updateCategory).not.toHaveBeenCalled();
    expect(repository.updatePriceGroup).not.toHaveBeenCalled();
    expect(repository.removeSubgroupUnits).not.toHaveBeenCalled();
    expect(repository.correctSubgroupCost).not.toHaveBeenCalled();
  });

  it('allows zero-cost corrections and unknown subgroup costs', async () => {
    const repository = createRepository();
    const service = new StockAdministrationService(repository);

    await service.correctSubgroupCost({ priceGroupId: 1, subgroupId: '1', unitCostCents: 0 });
    await service.correctSubgroupCost({ priceGroupId: 1, subgroupId: '2', unitCostCents: null });

    expect(repository.correctSubgroupCost).toHaveBeenNthCalledWith(1, { priceGroupId: 1, subgroupId: '1', unitCostCents: 0 });
    expect(repository.correctSubgroupCost).toHaveBeenNthCalledWith(2, { priceGroupId: 1, subgroupId: '2', unitCostCents: null });
  });
});
