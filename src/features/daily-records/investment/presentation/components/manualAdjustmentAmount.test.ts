import { describe, expect, it } from 'vitest';
import { parseManualCapitalAddition } from './manualAdjustmentAmount';

describe('parseManualCapitalAddition', () => {
  it('accepts positive decimal amounts with dot or comma separators', () => {
    expect(parseManualCapitalAddition('12.50')).toBe(12.5);
    expect(parseManualCapitalAddition('12,50')).toBe(12.5);
  });

  it('rejects withdrawals, zero, and invalid amounts instead of reversing their sign', () => {
    expect(parseManualCapitalAddition('-12')).toBeNull();
    expect(parseManualCapitalAddition('0')).toBeNull();
    expect(parseManualCapitalAddition('not an amount')).toBeNull();
  });
});
