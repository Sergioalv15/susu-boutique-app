import { describe, expect, it } from 'vitest';
import { normalizeThemePreference, resolveTheme } from './theme';

describe('theme helpers', () => {
  it('normalizes unknown or empty preferences to light', () => {
    expect(normalizeThemePreference(null)).toBe('light');
    expect(normalizeThemePreference(undefined)).toBe('light');
    expect(normalizeThemePreference('')).toBe('light');
    expect(normalizeThemePreference('system')).toBe('light');
  });

  it('preserves dark preference explicitly', () => {
    expect(normalizeThemePreference('dark')).toBe('dark');
  });

  it('resolves light and dark palettes deterministically', () => {
    const light = resolveTheme('light');
    const dark = resolveTheme('dark');

    expect(light.isDark).toBe(false);
    expect(dark.isDark).toBe(true);
    expect(light.colors.background).toBe('#FAF5EB');
    expect(light.colors.text).toBe('#382E24');
    expect(light.colors.mutedText).toBe('#77624F');
    expect(light.colors.border).toBe('#E2D6C3');
    expect(light.colors.card).toBe('#F0E4D2');
    expect(light.colors.primary).toBe('#85492F');
    expect(light.colors.onPrimary).toBe('#FFF9EF');
    expect(dark.colors.background).toBe('#27231C');
    expect(dark.colors.text).toBe('#F5ECDC');
    expect(dark.colors.mutedText).toBe('#C7B69E');
    expect(dark.colors.border).toBe('#4E4436');
    expect(dark.colors.card).toBe('#3B3024');
    expect(dark.colors.primary).toBe('#E9B896');
    expect(dark.colors.onPrimary).toBe('#382315');
    expect(light.spacing.md).toBe(16);
    expect(light.spacing.compact).toBe(12);
    expect(dark.radius.md).toBe(6);
    expect(light.typography.serifFamily).toBeTruthy();
  });

  it('exposes a subtle accent today-cell highlight in both themes', () => {
    const light = resolveTheme('light');
    const dark = resolveTheme('dark');

    expect(light.colors.calendarHighlight).toBe('rgba(133,73,47,0.18)');
    expect(dark.colors.calendarHighlight).toBe('rgba(233,184,150,0.2)');
  });
});
