import { StockCostSubgroup } from './types';

export interface StockCostSubgroupDisplay {
  label: string;
  unitCostCents?: number | null;
}

export function describeStockCostSubgroup(
  subgroup: StockCostSubgroup,
  index: number,
  isOwner: boolean,
): StockCostSubgroupDisplay {
  if (!isOwner) return { label: `Subgrupo ${index + 1}` };
  if (subgroup.unitCostCents === null) return { label: 'Coste desconocido', unitCostCents: null };
  return { label: 'Coste de compra', unitCostCents: subgroup.unitCostCents };
}
