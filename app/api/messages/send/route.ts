// app/api/messages/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { encryptText } from "@/lib/crypto/serverEncryption";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Config base
const MODEL  = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const SYSTEM = process.env.OPENAI_SYSTEM_PROMPT || "Rispondi in italiano in modo chiaro e conciso.";

// Tabelle
const CONVERSATIONS_TABLE = process.env.DB_CONVERSATIONS_TABLE || "conversations";
const MESSAGES_TABLE      = process.env.DB_MESSAGES_TABLE || "messages";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const content = String(body?.content ?? "").trim();
    const conversationId = body?.conversationId ? String(body.conversationId) : undefined;
    const terse = Boolean(body?.terse);

    if (!content)        return NextResponse.json({ error: "content mancante" }, { status: 400 });
    if (!conversationId) return NextResponse.json({ error: "conversationId mancante" }, { status: 400 });
    if (content.length > 8000) return NextResponse.json({ error: "content troppo lungo" }, { status: 413 });

    const supabase = getSupabaseAdmin();

    // 0) Recupera l'owner della conversazione (user_id)
    const conv = await supabase
      .from(CONVERSATIONS_TABLE)
      .select("user_id")
      .eq("id", conversationId)
      .single();

    if (conv.error || !conv.data) {
      console.error("[send] conversation lookup error:", conv.error);
      return NextResponse.json(
        { error: "conversation_not_found", details: conv.error?.message },
        { status: 404 }
      );
    }

    const ownerUserId = conv.data.user_id;

    // 🔐 CIFRA il messaggio USER prima di salvarlo
    const userEnc = encryptText(content);

    // 1) Salva messaggio USER cifrato
    const insUser = await supabase
      .from(MESSAGES_TABLE)
      .insert({
        conversation_id: conversationId,
        user_id: ownerUserId,
        role: "user",
        body_enc: userEnc.ciphertext,
        body_iv: userEnc.iv,
        body_tag: userEnc.tag,
        content: null, // ← campo vecchio vuoto
      })
      .select("id")
      .single();

    if (insUser.error) {
      console.error("[send] insert user msg error:", insUser.error);
      return NextResponse.json(
        { error: "insert_user_failed", details: insUser.error.message, code: insUser.error.code },
        { status: 500 }
      );
    }

    // 1.b) INTENTO LOCALE: "quanti clienti ho?"
    const normalized = content.toLowerCase().trim();
    const askClients = /^(quanti|numero|n\.)\s+(clienti|accounts?)(\s+ho)?\??$/.test(normalized);

    if (askClients) {
      const { count, error } = await supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .or(`owner_id.eq.${ownerUserId},user_id.eq.${ownerUserId}`);

      const n = count ?? 0;
      const reply =
        error
          ? "Non riesco a contare i clienti adesso."
          : `Hai ${n} ${n === 1 ? "cliente" : "clienti"}.`;

      // 🔐 CIFRA la risposta locale
      const replyEnc = encryptText(reply);

      const insAsstLocal = await supabase
        .from(MESSAGES_TABLE)
        .insert({
          conversation_id: conversationId,
          user_id: ownerUserId,
          role: "assistant",
          body_enc: replyEnc.ciphertext,
          body_iv: replyEnc.iv,
          body_tag: replyEnc.tag,
          content: null,
        })
        .select("id")
        .single();

      if (insAsstLocal.error) {
        console.error("[send] insert assistant (count) msg error:", insAsstLocal.error);
      }

      return NextResponse.json({ reply }, { status: 200 });
    }

    // 2) Chiama OpenAI (il testo è in chiaro QUI per permettere l'elaborazione)
    const sys = SYSTEM + (terse ? " Rispondi molto brevemente." : "");
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: sys },
        { role: "user", content }, // ← in chiaro per OpenAI
      ],
      temperature: 0.3,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "Ok.";

    // 🔐 CIFRA la risposta dell'assistente prima di salvarla
    const assistantEnc = encryptText(reply);

    // 3) Salva messaggio ASSISTANT cifrato
    const insAsst = await supabase
      .from(MESSAGES_TABLE)
      .insert({
        conversation_id: conversationId,
        user_id: ownerUserId,
        role: "assistant",
        body_enc: assistantEnc.ciphertext,
        body_iv: assistantEnc.iv,
        body_tag: assistantEnc.tag,
        content: null, // ← campo vecchio vuoto
      })
      .select("id")
      .single();

    if (insAsst.error) {
      console.error("[send] insert assistant msg error:", insAsst.error);
    }

    return NextResponse.json({ reply }); // ← ritorna in chiaro al client (transitorio)
  } catch (err: any) {
    // Gestione errori quota OpenAI
    const status = err?.status ?? 500;
    const type   = err?.error?.type ?? err?.code;
    const retryHeader = err?.headers?.get?.("retry-after");
    const retryAfter = retryHeader ? Number(retryHeader) : undefined;

    if (status === 429 || type === "insufficient_quota") {
      return NextResponse.json(
        { error: "QUOTA_ESAURITA", message: "Quota OpenAI esaurita o rate limit.", retryAfter },
        { status: 429 }
      );
    }

    if (typeof err?.message === "string" && err.message.includes("[supabase] Missing env")) {
      console.error(err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    console.error("[/api/messages/send] ERROR:", err);
    return NextResponse.json({ error: err?.message || "Errore interno" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: MODEL });
}
