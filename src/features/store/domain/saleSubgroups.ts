import { StockCostSubgroup } from './types';

export interface ReservedSaleSubgroupLine {
  key: number;
  sourceSubgroupId: string;
  units: number;
}

export function remainingSubgroupUnits(
  subgroup: StockCostSubgroup | undefined,
  cartLines: readonly ReservedSaleSubgroupLine[],
  editingKey?: number | null,
): number {
  if (!subgroup) return 0;
  const reservedUnits = cartLines
    .filter((line) => line.sourceSubgroupId === subgroup.subgroupId && line.key !== editingKey)
    .reduce((total, line) => total + line.units, 0);
  return Math.max(0, subgroup.remainingUnits - reservedUnits);
}
