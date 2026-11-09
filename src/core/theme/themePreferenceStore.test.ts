import { beforeEach, describe, expect, it, vi } from 'vitest';

const { storageMock } = vi.hoisted(() => ({
  storageMock: {
    getItem: vi.fn<(key: string) => Promise<string | null>>(),
    setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
  },
}));

vi.mock('expo-sqlite/kv-store', () => ({
  default: storageMock,
}));

import {
  loadThemePreference,
  saveThemePreference,
  THEME_PREFERENCE_KEY,
} from './themePreferenceStore';

describe('themePreferenceStore', () => {
  beforeEach(() => {
    storageMock.getItem.mockReset();
    storageMock.setItem.mockReset();
  });

  it('loads persisted dark mode preference', async () => {
    storageMock.getItem.mockResolvedValueOnce('dark');

    await expect(loadThemePreference()).resolves.toBe('dark');
    expect(storageMock.getItem).toHaveBeenCalledWith(THEME_PREFERENCE_KEY);
  });

  it('normalizes invalid persisted values to light', async () => {
    storageMock.getItem.mockResolvedValueOnce('unexpected');

    await expect(loadThemePreference()).resolves.toBe('light');
  });

  it('persists selected mode using kv-store key', async () => {
    storageMock.setItem.mockResolvedValueOnce();

    await saveThemePreference('dark');
    expect(storageMock.setItem).toHaveBeenCalledWith(THEME_PREFERENCE_KEY, 'dark');
  });
});
