import { describe, expect, it } from 'vitest';
import { resolveSupabaseConfiguration } from './config';

describe('resolveSupabaseConfiguration', () => {
  it('returns null until both public connection values exist', () => {
    expect(resolveSupabaseConfiguration(undefined, 'key')).toBeNull();
    expect(resolveSupabaseConfiguration('https://example.supabase.co', undefined)).toBeNull();
  });

  it('trims environment values before exposing the client configuration', () => {
    expect(resolveSupabaseConfiguration(' https://example.supabase.co ', ' key ')).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'key',
    });
  });
});
