import { afterEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  effect: undefined as (() => void | (() => void)) | undefined,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) => { captured.effect = effect; },
  };
});
vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: (value: unknown) => value },
  Text: 'Text',
  View: 'View',
}));
vi.mock('../../../../core/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: { success: '', onPrimary: '', surface: '', primary: '' },
      radius: { md: 4, sm: 2 },
    },
  }),
}));

import { SaleUndoNotification } from './SaleUndoNotification';

describe('SaleUndoNotification', () => {
  afterEach(() => vi.useRealTimers());

  it('expires at its deadline while a sale refresh is still busy', () => {
    vi.useFakeTimers();
    const onHide = vi.fn();
    SaleUndoNotification({
      expiresAt: Date.now() + 30_000,
      busy: true,
      onUndo: vi.fn(),
      onHide,
    });

    const cleanup = captured.effect!();
    vi.advanceTimersByTime(30_000);

    expect(onHide).toHaveBeenCalledOnce();
    cleanup?.();
  });
});
