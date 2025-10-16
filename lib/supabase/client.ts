"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _supabase: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (_supabase) return _supabase;

  _supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: {
      headers: { "x-client-info": "repping-web" },
    },
  });

  // 👇 log utile per verificare inizializzazione
  console.log("🔐 Supabase client creato con URL:", supabaseUrl);

  // 👇 ESPORTA su window per debug da console (da rimuovere in produzione)
  if (typeof window !== "undefined") {
    (window as any).sb = _supabase;
  }

  return _supabase;
}

export const supabase = getSupabaseBrowser();
