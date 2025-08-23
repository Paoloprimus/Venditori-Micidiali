// lib/supabase/server.ts
import { cookies, type ReadonlyRequestCookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export function createClient(cookieStore?: ReadonlyRequestCookies) {
  // Permette sia uso di default (prende i cookies dal contesto)
  // sia passaggio esplicito (se già li hai)
  const store = cookieStore ?? cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return store.get(name)?.value;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // In App Router durante le Route Handlers, set è no-op (read-only);
            // va bene: l’SDK lo gestisce graceful.
          } catch {
            // ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // vedi nota sopra
          } catch {
            // ignore
          }
        },
      },
    }
  );

  return supabase;
}
