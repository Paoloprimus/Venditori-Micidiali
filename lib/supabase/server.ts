// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Client SSR con cookies di Next (App Router).
 * Usa le env pubbliche di Supabase (URL/ANON) e propaga i cookie della sessione.
 */
export function createClient(cookieStore?: ReadonlyRequestCookies) {
  const store = cookieStore ?? cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try { return store.get(name)?.value; } catch { return undefined; }
        },
        set(_name: string, _value: string, _options: CookieOptions) {
          // No-op nelle route handlers (headers read-only). Va bene così.
        },
        remove(_name: string, _options: CookieOptions) {
          // No-op
        },
      },
    }
  );

  return supabase;
}

/**
 * Alias legacy per compatibilità con vecchie route:
 * alcune file importano `createSupabaseServer()`.
 */
export function createSupabaseServer() {
  return createClient();
}
