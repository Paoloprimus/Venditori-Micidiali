// app/api/crypto/force-reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const VERSION = "mk-reset-v2";

function resetEnabled() {
  return process.env.CRYPTO_DEV_AUTO_RESET === "1";
}

export async function POST(req: NextRequest) {
  try {
    if (!resetEnabled()) {
      return NextResponse.json({ error: "FORBIDDEN", version: VERSION }, { status: 403 });
    }

    const { userId } = await req.json().catch(() => ({} as any));
    if (!userId) {
      return NextResponse.json({ error: "userId mancante", version: VERSION }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1) ⚠️ PRIMA cancella i dati cifrati (altrimenti diventano irrecuperabili!)
    const delAccounts = await supabase
      .from("accounts")
      .delete()
      .eq("user_id", userId)
      .select("id");
    
    console.log(`[force-reset] Cancellati ${delAccounts.data?.length || 0} accounts per user ${userId}`);
    
    // 2) Cancella eventuali chiavi per quello user (DEK/BI per gli scope)
    const delKeys = await supabase
      .from("encryption_keys")
      .delete()
      .eq("user_id", userId)
      .select("*"); // per ottenere un count reale

    if (delKeys.error) {
      return NextResponse.json(
        { error: "delete_failed", details: delKeys.error.message, version: VERSION },
        { status: 500 }
      );
    }

    // 3) Azzera i campi della Master Key nel profilo (MK + KDF)
    const upd = await supabase
      .from("profiles")
      .update({
        wrapped_master_key: null,
        wrapped_master_key_iv: null,
        kdf_salt: null,
        kdf_params: null,
      })
      .eq("id", userId);

    if (upd.error) {
      return NextResponse.json(
        { error: "profile_reset_failed", details: upd.error.message, version: VERSION },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      accounts_deleted: Array.isArray(delAccounts.data) ? delAccounts.data.length : 0,
      keys_removed: Array.isArray(delKeys.data) ? delKeys.data.length : null,
      profile_reset: true,
      version: VERSION,
    });
  } catch (e: any) {
    return NextResponse.json({
      error: e?.message || "Errore interno",
      version: VERSION,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    enabled: resetEnabled(),
    env: process.env.NODE_ENV || "unknown",
    version: VERSION,
  });
}
