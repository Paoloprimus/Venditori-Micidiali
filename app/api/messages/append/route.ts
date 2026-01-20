// app/api/messages/append/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { encryptText } from "@/lib/crypto/serverEncryption";

export const runtime = "nodejs";

type Body = {
  conversationId: string;
  userText: string;
  assistantText: string;
  // 📝 Metadati RAG (Fase 2)
  intent?: string;
  confidence?: number;
  source?: 'local' | 'rag' | 'llm' | 'unknown';
  entities?: Record<string, any>;
  account_ids?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const { 
      conversationId, 
      userText, 
      assistantText,
      // 📝 Metadati RAG
      intent,
      confidence,
      source,
      entities,
      account_ids,
    } = (await req.json()) as Body;

    if (!conversationId || !userText || !assistantText) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // prendo l'owner della conversazione
    const conv = await sb
      .from("conversations")
      .select("user_id")
      .eq("id", conversationId)
      .single();

    if (conv.error || !conv.data?.user_id) {
      return NextResponse.json({ error: "CONVERSATION_NOT_FOUND" }, { status: 404 });
    }
    const ownerUserId = conv.data.user_id;

    // 🔐 CIFRA entrambi i messaggi
    const userEnc = encryptText(userText);
    const assistantEnc = encryptText(assistantText);

    // inserisco i due messaggi in ordine
    const now = new Date();
    const later = new Date(now.getTime() + 1); // +1 ms

    const { error: insErr } = await sb.from("messages").insert([
      {
        conversation_id: conversationId,
        user_id: ownerUserId,
        role: "user",
        body_enc: userEnc.ciphertext,
        body_iv: userEnc.iv,
        body_tag: userEnc.tag,
        content: null, // ← campo vecchio vuoto
        created_at: now.toISOString(),
      },
      {
        conversation_id: conversationId,
        user_id: ownerUserId,
        role: "assistant",
        body_enc: assistantEnc.ciphertext,
        body_iv: assistantEnc.iv,
        body_tag: assistantEnc.tag,
        content: null, // ← campo vecchio vuoto
        created_at: later.toISOString(),
        // 📝 Metadati RAG (Fase 2)
        intent: intent ?? null,
        confidence: confidence ?? null,
        source: source ?? null,
        entities: entities ?? null,
        account_ids: account_ids?.length ? account_ids : null,
      },
    ]);

    if (insErr) {
      return NextResponse.json({ error: "INSERT_FAILED", details: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "INTERNAL" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST." }, { status: 405 });
}
