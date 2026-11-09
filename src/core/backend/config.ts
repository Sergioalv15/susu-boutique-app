export const SUSU_BOUTIQUE_BUSINESS_ID = '7fca8de7-9e57-4a19-8873-5d7432e890a6';

export interface SupabaseConfiguration {
  url: string;
  publishableKey: string;
}

export function resolveSupabaseConfiguration(
  url: string | undefined,
  publishableKey: string | undefined,
): SupabaseConfiguration | null {
  const normalizedUrl = url?.trim();
  const normalizedKey = publishableKey?.trim();

  if (!normalizedUrl || !normalizedKey) {
    return null;
  }

  return { url: normalizedUrl, publishableKey: normalizedKey };
}

export function getSupabaseConfiguration(): SupabaseConfiguration | null {
  return resolveSupabaseConfiguration(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
