// app/api/crypto/force-reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Abilita il reset SOLO se la variabile server-side è impostata.
 * Su Vercel imposta:  CRYPTO_DEV_AUTO_RESET=1   (Development/Preview)
 * NON usare NEXT_PUBLIC_ qui: quelle sono client-side.
 */
function resetEnabled() {
  return process.env.CRYPTO_DEV_AUTO_RESET === "1";
}

export async function POST(req: NextRequest) {
  try {
    if (!resetEnabled()) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { userId } = await req.json().catch(() => ({} as any));
    if (!userId) {
      return NextResponse.json({ error: "userId mancante" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Cancella le chiavi dell'utente (adatta il nome tabella se diverso)
    const delKeys = await supabase.from("encryption_keys").delete().eq("user_id", userId);
    if (delKeys.error) {
      return NextResponse.json(
        { error: "delete_failed", details: delKeys.error.message },
        { status: 500 }
      );
    }

    // Se hai altre tabelle keyring, aggiungi qui ulteriori delete…

    return NextResponse.json({ ok: true, removed: delKeys.count ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Errore interno" }, { status: 500 });
  }
}

export async function GET() {
  // Utile per check rapido da browser
  return NextResponse.json({
    ok: true,
    enabled: resetEnabled(),
    env: process.env.NODE_ENV || "unknown",
  });
}
