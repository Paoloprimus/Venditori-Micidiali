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

  const { data, error } = await supabase
    .from("messages")
    .select("id, role, body_enc, body_iv, body_tag, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: "DB_LIST_MSG", details: error.message }, { status: 500 });

  // 🔓 DECIFRA tutti i messaggi
  const items = (data || []).map((row) => {
    let content = "[Vuoto]";
    
    // Prova a decifrare se cifrato
    if (row.body_enc && row.body_iv && row.body_tag) {
      try {
        content = decryptText(row.body_enc, row.body_iv, row.body_tag);
      } catch {
        content = "[Errore decifratura]";
      }
    }
    // Fallback su campo vecchio in chiaro (retrocompatibilità)
    else if (row.content) {
      content = row.content;
    }

    return {
      id: row.id,
      role: row.role,
      content,
      created_at: row.created_at,
    };
  });

  return NextResponse.json({ items });
}
