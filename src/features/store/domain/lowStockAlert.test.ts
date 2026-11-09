import { describe, expect, it } from 'vitest';
import { isLowStock, LOW_STOCK_THRESHOLD } from './lowStockAlert';

describe('isLowStock', () => {
  it('warns at six units and below, but not above six', () => {
    expect(LOW_STOCK_THRESHOLD).toBe(6);
    expect(isLowStock(6)).toBe(true);
    expect(isLowStock(2)).toBe(true);
    expect(isLowStock(0)).toBe(true);
    expect(isLowStock(7)).toBe(false);
  });
});
