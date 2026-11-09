export const LOW_STOCK_THRESHOLD = 6;

export function isLowStock(unitsAvailable: number): boolean {
  return unitsAvailable <= LOW_STOCK_THRESHOLD;
}
