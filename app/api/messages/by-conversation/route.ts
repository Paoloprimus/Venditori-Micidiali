// app/api/messages/by-conversation/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { decryptText } from "../../../../lib/crypto/serverEncryption";

export async function GET(req: Request) {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 200);

  if (!conversationId) return NextResponse.json({ error: "MISSING_CONV_ID" }, { status: 400 });

  // Validate ownership
  const { data: conv, error: convErr } = await supabase
    .from("conversations").select("id").eq("id", conversationId).eq("user_id", u.user.id).maybeSingle();
  if (convErr || !conv) return NextResponse.json({ error: "INVALID_CONVERSATION" }, { status: 400 });

  // ✅ Seleziona TUTTI i campi (content + campi cifrati)
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, body_enc, body_iv, body_tag, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: "DB_LIST_MSG", details: error.message }, { status: 500 });

  // ✅ Decifra i messaggi cifrati
  const items = (data ?? []).map(msg => {
    // Se il messaggio è cifrato, prova a decifrarlo
    if (msg.body_enc && msg.body_iv && msg.body_tag) {
      try {
        const decrypted = decryptText(msg.body_enc, msg.body_iv, msg.body_tag);
        return {
          id: msg.id,
          role: msg.role,
          content: decrypted,
          created_at: msg.created_at
        };
      } catch (err) {
        // Se la decifratura fallisce, mostra un messaggio di errore
        console.error(`[by-conversation] Errore decifratura msg ${msg.id}:`, err);
        return {
          id: msg.id,
          role: msg.role,
          content: "[Errore decifratura]",
          created_at: msg.created_at
        };
      }
    }
    
    // Altrimenti usa il content in chiaro (compatibilità con messaggi vecchi)
    return {
      id: msg.id,
      role: msg.role,
      content: msg.content || "",
      created_at: msg.created_at
    };
  });

  return NextResponse.json({ items });
}
