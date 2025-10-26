// app/api/conversations/create/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { encryptText, computeBlindIndex } from "../../../../lib/crypto/serverEncryption";

export async function POST(req: Request) {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const passedTitle =
    typeof body?.title === "string" && body.title.trim().length
      ? body.title.trim()
      : null;

  // Se l'utente non ha passato un titolo, inseriamo titolo vuoto
  const title = passedTitle ?? "";

  // 🔐 CIFRA il title (anche se vuoto, per coerenza)
  const { ciphertext, iv, tag } = encryptText(title);
  const blindIndex = title ? computeBlindIndex(title) : null;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ 
      user_id: u.user.id, 
      subject_enc: ciphertext,
      subject_iv: iv,
      subject_tag: tag,
      subject_bi: blindIndex,
      title: null, // ← campo vecchio lasciato null
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "DB_INSERT_CONV", details: error?.message ?? "fail" },
      { status: 500 }
    );
  }

  // Ritorna con title decifrato per il client
  return NextResponse.json({ ok: true, conversation: { ...data, title } });
}
