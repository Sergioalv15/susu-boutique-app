import { describe, expect, it, vi } from 'vitest';
import { createInvestmentPurchaseCloseHandler } from './investmentPurchaseNavigation';

describe('createInvestmentPurchaseCloseHandler', () => {
  it('closes a stacked purchase route only once after success or cancellation', () => {
    const navigation = {
      canGoBack: vi.fn(() => true),
      back: vi.fn(),
      replaceCalendar: vi.fn(),
    };
    const close = createInvestmentPurchaseCloseHandler(navigation);

    close();
    close();

    expect(navigation.back).toHaveBeenCalledTimes(1);
    expect(navigation.replaceCalendar).not.toHaveBeenCalled();
  });

  it('returns a direct route entry to the calendar once', () => {
    const navigation = {
      canGoBack: vi.fn(() => false),
      back: vi.fn(),
      replaceCalendar: vi.fn(),
    };
    const close = createInvestmentPurchaseCloseHandler(navigation);

    close();
    close();

    expect(navigation.back).not.toHaveBeenCalled();
    expect(navigation.replaceCalendar).toHaveBeenCalledTimes(1);
  });
});
