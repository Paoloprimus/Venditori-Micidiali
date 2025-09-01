// lib/supabase/admin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

/**
 * Ritorna un client admin (SERVICE ROLE). Inizializzazione lazy,
 * così se mancano le env non crasha a import-time.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("[supabase] Missing env NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("[supabase] Missing env SUPABASE_SERVICE_ROLE_KEY");

  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
