// app/api/conversations/new/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { encryptText, computeBlindIndex } from "../../../../lib/crypto/serverEncryption";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error("Utente non autenticato");

    // Leggo titolo eventualmente passato dal form/UI
    const body = await req.json().catch(() => ({}));
    const passedTitle: string | undefined = typeof body?.title === "string" ? body.title.trim() : undefined;

    const defaultTitle = "Nuova sessione " + new Date().toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
    const title = passedTitle && passedTitle.length > 0 ? passedTitle : defaultTitle;

    // 🔐 CIFRA il title
    const { ciphertext, iv, tag } = encryptText(title);
    const blindIndex = computeBlindIndex(title);

    const { data, error } = await supabase
      .from("conversations")
      .insert({ 
        user_id: user.id, 
        subject_enc: ciphertext,
        subject_iv: iv,
        subject_tag: tag,
        subject_bi: blindIndex,
        title: null, // ← campo vecchio lasciato null
      })
      .select()
      .single();
    
    if (error) throw error;

    // Ritorno con title decifrato per il client
    return NextResponse.json({ ok: true, conversation: { ...data, title } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
