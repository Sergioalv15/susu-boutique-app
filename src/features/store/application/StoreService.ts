import { toIsoDate } from '../../../core/utils/date';
import {
  CompleteSaleInput,
  AddStoreStockInput,
  CreateCategoryInput,
  CreatePriceGroupInput,
  ReceiveStockInput,
  SaleReceipt,
  StockMovement,
  StoreCategory,
  StorePriceGroup,
  StoreStockItem,
  TodaySalesSummary,
} from '../domain/types';
import { StoreRepository } from './StoreRepository';

export class StoreService {
  constructor(private readonly repository: StoreRepository) {}

  listCategories(): Promise<StoreCategory[]> {
    return this.repository.listCategories();
  }

  listStockItems(): Promise<StoreStockItem[]> {
    return this.repository.listStockItems();
  }

  async createCategory(input: CreateCategoryInput): Promise<StoreCategory> {
    const name = input.name.trim();
    if (!name) throw new Error('Escribí el nombre de la categoría.');
    if (name.length > 40) throw new Error('El nombre no puede superar los 40 caracteres.');
    return this.repository.createCategory({ name });
  }

  listPriceGroups(categoryId: number): Promise<StorePriceGroup[]> {
    return this.repository.listPriceGroups(categoryId);
  }

  createPriceGroup(input: CreatePriceGroupInput): Promise<StorePriceGroup> {
    if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) {
      throw new RangeError('Elegí una categoría válida.');
    }
    if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) {
      throw new RangeError('El precio debe ser mayor que cero.');
    }
    return this.repository.createPriceGroup(input);
  }

  receiveStock(input: ReceiveStockInput): Promise<StorePriceGroup> {
    if (!Number.isInteger(input.priceGroupId) || input.priceGroupId <= 0) {
      throw new RangeError('Elegí un grupo de precio.');
    }
    if (!Number.isInteger(input.units) || input.units <= 0) {
      throw new RangeError('Las unidades recibidas deben ser un número entero mayor que cero.');
    }
    return this.repository.receiveStock({ ...input, note: input.note.trim() });
  }

  addStock(input: AddStoreStockInput): Promise<StorePriceGroup> {
    if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) {
      throw new RangeError('Elegí un tipo de joya válido.');
    }
    if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) {
      throw new RangeError('El precio debe ser mayor que cero.');
    }
    if (!Number.isInteger(input.units) || input.units <= 0) {
      throw new RangeError('Las unidades deben ser un número entero mayor que cero.');
    }
    if (input.photoDataUrl && input.photoDataUrl.length > 4_000_000) {
      throw new RangeError('La foto es demasiado grande. Elegí una imagen más liviana.');
    }
    return this.repository.addStock(input);
  }

  completeSale(input: CompleteSaleInput): Promise<SaleReceipt> {
    if (!Number.isInteger(input.priceGroupId) || input.priceGroupId <= 0) {
      throw new RangeError('Elegí un grupo de precio.');
    }
    if (!Number.isInteger(input.units) || input.units <= 0) {
      throw new RangeError('Vendé al menos una unidad.');
    }
    return this.repository.completeSale(input);
  }

  getTodaySummary(now = new Date()): Promise<TodaySalesSummary> {
    return this.repository.getTodaySummary(toIsoDate(now));
  }

  listRecentMovements(limit = 30): Promise<StockMovement[]> {
    return this.repository.listRecentMovements(limit);
  }
}
