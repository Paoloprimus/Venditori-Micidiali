// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value;
          } catch {
            return undefined;
          }
        },
        set(_name: string, _value: string, _options: CookieOptions) {
          // no-op in API Routes (headers sono read-only)
        },
        remove(_name: string, _options: CookieOptions) {
          // no-op
        },
      },
    }
  );

  return supabase;
}

// Alias legacy per compatibilità
export function createSupabaseServer() {
  return createClient();
}
