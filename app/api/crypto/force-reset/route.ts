// app/api/crypto/force-reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Sicurezza: abilita SOLO in dev
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const { userId } = await req.json().catch(() => ({} as any));
    if (!userId) {
      return NextResponse.json({ error: "userId mancante" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Elimina tutte le chiavi collegate a quell’utente (keyring)
    // NB: Adegua qui se hai altre tabelle legate al keyring
    const del1 = await supabase.from("encryption_keys").delete().eq("user_id", userId);

    if (del1.error) {
      return NextResponse.json(
        { error: "delete_failed", details: del1.error.message },
        { status: 500 }
      );
    }

    // Puoi aggiungere altre delete se hai tabelle tipo scope_keys, key_meta, ecc.
    // await supabase.from("scope_keys").delete().eq("user_id", userId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Errore interno" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, env: process.env.NODE_ENV || "unknown" });
}
