// lib/supabase/client.ts
"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton browser client con sessione persistente
let _supabase: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (_supabase) return _supabase;

  _supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: {
      persistSession: true,         // ✅ conserva la sessione (localStorage)
      autoRefreshToken: true,       // ✅ refresh automatico
      detectSessionInUrl: true,     // ✅ supporta redirect OAuth (se servisse)
      flowType: "pkce",
    },
    global: {
      headers: { "x-client-info": "repping-web" },
    },
  });

  return _supabase;
}

// Export “compatibile” con i vecchi import
export const supabase = getSupabaseBrowser();
