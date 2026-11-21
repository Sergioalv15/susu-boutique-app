import { StoreCategory } from '../domain/types';

export type StockLifecycleStatus = 'deleted' | 'archived';
export type StockPriceGroupUpdateStatus = 'updated' | 'versioned';

export interface StockLifecycleResult {
  id: number;
  status: StockLifecycleStatus;
  adjustedUnits: number;
}

export interface StockPriceGroupUpdateInput {
  priceGroupId: number;
  priceCents: number;
  sortOrder: number;
  photoDataUrl?: string | null;
}

export interface StockPriceGroupUpdateResult {
  id: number;
  previousGroupId: number;
  categoryId: number;
  priceCents: number;
  stockUnits: number;
  sortOrder: number;
  photoPath: string;
  status: StockPriceGroupUpdateStatus;
}

export interface RemoveStockSubgroupInput {
  priceGroupId: number;
  subgroupId: string;
  units: number;
  note: string;
}

export interface RemoveStockSubgroupResult {
  priceGroupId: number;
  subgroupId: string;
  unitsRemoved: number;
  stockUnits: number;
  costTotalCents: number | null;
}

export interface CorrectStockSubgroupCostInput {
  priceGroupId: number;
  subgroupId: string;
  unitCostCents: number | null;
}

export interface CorrectStockSubgroupCostResult {
  priceGroupId: number;
  previousSubgroupId: string;
  subgroupId: string;
  unitsMoved: number;
  previousUnitCostCents: number | null;
  unitCostCents: number | null;
}

export interface StockAdministrationRepository {
  updateCategory(id: number, name: string): Promise<StoreCategory>;
  deleteCategory(id: number): Promise<StockLifecycleResult>;
  updatePriceGroup(input: StockPriceGroupUpdateInput): Promise<StockPriceGroupUpdateResult>;
  deletePriceGroup(id: number): Promise<StockLifecycleResult>;
  removeSubgroupUnits(input: RemoveStockSubgroupInput): Promise<RemoveStockSubgroupResult>;
  correctSubgroupCost(input: CorrectStockSubgroupCostInput): Promise<CorrectStockSubgroupCostResult>;
}
