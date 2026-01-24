import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Browser client (uses publishable key - safe for client-side)
export const supabase = createClient<Database>(
  supabaseUrl,
  supabasePublishableKey
);

// Server client (uses secret key - API routes only)
export function createServerClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not set");
  }

  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });
}
