import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

// Browser client (uses publishable key - safe for client-side)
// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error("Supabase URL and publishable key are required");
    }
    _supabase = createClient<Database>(supabaseUrl, supabasePublishableKey);
  }
  return _supabase;
}

// Legacy export for backward compatibility
export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient<Database>(supabaseUrl, supabasePublishableKey)
  : (null as unknown as SupabaseClient<Database>);

// Server client (uses secret key - API routes only)
export function createServerClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  }

  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false },
  });
}
