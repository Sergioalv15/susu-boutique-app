export interface StoreCategory {
  id: number;
  name: string;
  sortOrder: number;
}

export interface StorePriceGroup {
  id: number;
  categoryId: number;
  priceCents: number;
  stockUnits: number;
  sortOrder: number;
  photoDataUrl: string;
}

export interface StoreStockItem extends StorePriceGroup {
  categoryName: string;
}

export type StockMovementType = 'venta' | 'entrada' | 'ajuste';

export interface StockMovement {
  id: number;
  categoryName: string;
  priceCents: number;
  movementType: StockMovementType;
  unitsDelta: number;
  supplierName: string | null;
  note: string;
  createdAt: string;
}

export interface TodaySalesSummary {
  totalCents: number;
  unitsSold: number;
}

export interface SaleReceipt {
  saleId: number;
  unitsSold: number;
  unitPriceCents: number;
  totalCents: number;
  remainingUnits: number;
}

export interface CreateCategoryInput {
  name: string;
}

export interface CreatePriceGroupInput {
  categoryId: number;
  priceCents: number;
  photoDataUrl?: string;
}

export interface ReceiveStockInput {
  priceGroupId: number;
  units: number;
  supplierId: number | null;
  note: string;
}

export interface AddStoreStockInput {
  categoryId: number;
  priceCents: number;
  units: number;
  photoDataUrl: string | null;
}

export interface CompleteSaleInput {
  priceGroupId: number;
  units: number;
}
