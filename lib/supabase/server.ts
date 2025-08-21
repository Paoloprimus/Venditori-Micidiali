// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // OK in Server Components: solo lettura
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // NO-OP in RSC per evitare l'errore "cannot set cookie in Server Components"
        set() {},
        remove() {},
      },
    }
  );
}
