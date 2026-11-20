import { describe, expect, it, vi } from 'vitest';
import { StoreRepository } from './StoreRepository';
import { StoreService } from './StoreService';

function createRepository(): StoreRepository {
  return {
    listCategories: vi.fn(async () => []),
    listStockItems: vi.fn(async () => []),
    listStockCostSubgroups: vi.fn(async () => []),
    getDashboardSummary: vi.fn(async () => ({ unitsSold: 0, revenueCents: 0, soldCostCents: 0 })),
    createCategory: vi.fn(async (input) => ({ id: 1, name: input.name, sortOrder: 0 })),
    listPriceGroups: vi.fn(async () => []),
    createPriceGroup: vi.fn(async (input) => ({
      id: 1,
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      stockUnits: 0,
      sortOrder: 0,
      photoDataUrl: input.photoDataUrl ?? '',
    })),
    receiveStock: vi.fn(async () => ({
      id: 1,
      categoryId: 1,
      priceCents: 300,
      stockUnits: 5,
      sortOrder: 0,
      photoDataUrl: '',
    })),
    addStock: vi.fn(async (input) => ({
      id: 1,
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      stockUnits: input.units,
      sortOrder: 0,
      photoDataUrl: input.photoDataUrl ?? '',
    })),
    completeSale: vi.fn(async () => ({
      saleId: 1,
      unitsSold: 1,
      unitPriceCents: 300,
      totalCents: 300,
      remainingUnits: 4,
    })),
    undoSale: vi.fn(async (saleId) => ({ saleId, status: 'undone' as const, unitsRestored: 1 })),
    getTodaySummary: vi.fn(async () => ({ totalCents: 0, unitsSold: 0 })),
    listRecentMovements: vi.fn(async () => []),
  };
}

describe('StoreService', () => {
  it('trims category names before saving', async () => {
    const repository = createRepository();
    const service = new StoreService(repository);

    await service.createCategory({ name: '  Anillos  ' });

    expect(repository.createCategory).toHaveBeenCalledWith({ name: 'Anillos' });
  });

  it('lists cost subgroups for a valid price group and rejects invalid group ids', async () => {
    const repository = createRepository();
    const service = new StoreService(repository);

    await service.listStockCostSubgroups(7);

    expect(repository.listStockCostSubgroups).toHaveBeenCalledWith(7);
    expect(() => service.listStockCostSubgroups(0)).toThrow('grupo de precio válido');
  });

  it('undoes a sale by the receipt id through the repository', async () => {
    const repository = createRepository();
    const service = new StoreService(repository);

    await expect(service.undoSale(7)).resolves.toMatchObject({ saleId: 7, status: 'undone' });
    expect(repository.undoSale).toHaveBeenCalledWith(7);
  });

  it('rejects invalid undo ids and unsupported repositories', () => {
    const repository = createRepository();
    const service = new StoreService(repository);
    expect(() => service.undoSale(0)).toThrow('identificador de venta');
    expect(repository.undoSale).not.toHaveBeenCalled();

    const unsupported = createRepository();
    delete unsupported.undoSale;
    expect(() => new StoreService(unsupported).undoSale(7)).toThrow('no está disponible');
  });

  it('rejects invalid categories, prices, quantities, and sales', async () => {
    const service = new StoreService(createRepository());

    await expect(service.createCategory({ name: '  ' })).rejects.toThrow('nombre de la categoría');
    expect(() => service.createPriceGroup({ categoryId: 1, priceCents: 0 })).toThrow('mayor que cero');
    expect(() => service.receiveStock({ priceGroupId: 1, units: 0, supplierId: null, note: '' }))
      .toThrow('número entero mayor que cero');
    expect(() => service.completeSale({ priceGroupId: 1, units: -1 })).toThrow('al menos una unidad');
  });
});
