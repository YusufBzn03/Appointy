import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser Supabase client, or `null` when the env vars are missing. Callers must handle
 * `null` by falling back to the mock data in `mock-data.ts` so the app still runs without a backend.
 */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
