import { describe, expect, it, vi } from 'vitest';
import { StoreRepository } from './StoreRepository';
import { StoreService } from './StoreService';

function createRepository(): StoreRepository {
  return {
    listCategories: vi.fn(async () => []),
    listStockItems: vi.fn(async () => []),
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
    removeStock: vi.fn(async () => ({
      id: 1,
      categoryId: 1,
      priceCents: 1500,
      stockUnits: 1,
      sortOrder: 0,
      photoDataUrl: '',
    })),
    updateProduct: vi.fn(async (input) => ({
      id: 1,
      categoryId: 1,
      name: input.name,
      priceCents: input.priceCents,
      stockUnits: 2,
      sortOrder: 0,
      photoDataUrl: '',
    })),
    updateProductPhoto: vi.fn(async () => ({
      id: 1,
      categoryId: 1,
      priceCents: 1500,
      stockUnits: 2,
      sortOrder: 0,
      photoDataUrl: 'photo',
    })),
    deleteCategory: vi.fn(async () => undefined),
    deletePriceGroup: vi.fn(async () => undefined),
    voidSale: vi.fn(async () => undefined),
    completeSale: vi.fn(async () => ({
      saleId: 1,
      unitsSold: 1,
      unitPriceCents: 300,
      totalCents: 300,
      remainingUnits: 4,
    })),
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

  it('rejects invalid categories, prices, quantities, and sales', async () => {
    const service = new StoreService(createRepository());

    await expect(service.createCategory({ name: '  ' })).rejects.toThrow('nombre de la categoría');
    expect(() => service.createPriceGroup({ categoryId: 1, priceCents: 0 })).toThrow('mayor que cero');
    expect(() => service.receiveStock({ priceGroupId: 1, units: 0, supplierId: null, note: '' }))
      .toThrow('número entero mayor que cero');
    expect(() => service.completeSale({ priceGroupId: 1, units: -1 })).toThrow('al menos una unidad');
  });

  it('requires a distinct product name and validates correction targets', async () => {
    const repository = createRepository();
    const service = new StoreService(repository);
    expect(() => service.addStock({ categoryId: 1, priceCents: 1500, units: 2,
      unitCostCents: 700, photoDataUrl: 'photo' })).toThrow('nombre de joya');
    await service.addStock({ categoryId: 1, name: ' Collar A ', priceCents: 1500,
      units: 2, unitCostCents: 700, photoDataUrl: 'photo' });
    expect(repository.addStock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Collar A' }));
    expect(() => service.deletePriceGroup(0)).toThrow('joya válida');
    expect(() => service.voidSale(-1)).toThrow('venta válida');
  });

  it('validates Shopify-style stock corrections before reaching the repository', async () => {
    const repository = createRepository();
    const service = new StoreService(repository);

    expect(() => service.removeStock({ priceGroupId: 1, units: 0 })).toThrow('mayor que cero');
    expect(() => service.updateProduct({ priceGroupId: 0, name: 'Collar', priceCents: 100 })).toThrow('joya válida');
    expect(() => service.updateProduct({ priceGroupId: 1, name: '  ', priceCents: 100 })).toThrow('nombre de joya');
    expect(() => service.updateProductPhoto({ priceGroupId: 1, photoDataUrl: 'not-an-image' })).toThrow('formato de la imagen');

    await service.removeStock({ priceGroupId: 1, units: 2, note: '  Corrección  ' });
    expect(repository.removeStock).toHaveBeenCalledWith({ priceGroupId: 1, units: 2, note: 'Corrección' });
    await service.updateProduct({ priceGroupId: 1, name: ' Collar A ', priceCents: 1600 });
    expect(repository.updateProduct).toHaveBeenCalledWith({ priceGroupId: 1, name: 'Collar A', priceCents: 1600 });
  });
});
