// /app/api/messages/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

// export const runtime = "nodejs"; // opzionale

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Config
const MODEL  = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const SYSTEM = process.env.OPENAI_SYSTEM_PROMPT || "Rispondi in italiano in modo chiaro e conciso.";

// ⬇️ Cambia qui se i nomi colonna/tabella sono diversi
const MESSAGES_TABLE = process.env.DB_MESSAGES_TABLE || "messages";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const content = String(body?.content ?? "").trim();
    const conversationId = body?.conversationId ? String(body.conversationId) : undefined;
    const terse   = Boolean(body?.terse);

    if (!content)        return NextResponse.json({ error: "content mancante" }, { status: 400 });
    if (!conversationId) return NextResponse.json({ error: "conversationId mancante" }, { status: 400 });
    if (content.length > 8000) return NextResponse.json({ error: "content troppo lungo" }, { status: 413 });

    // 1) ➜ salva messaggio USER
    const { error: insUserErr } = await supabaseAdmin
      .from(MESSAGES_TABLE)
      .insert({ conversation_id: conversationId, role: "user", content });

    if (insUserErr) {
      console.error("[send] insert user msg error:", insUserErr);
      return NextResponse.json({ error: "insert_user_failed" }, { status: 500 });
    }

    // 2) ➜ chiama il modello
    const sys = SYSTEM + (terse ? " Rispondi molto brevemente." : "");
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: sys },
        { role: "user", content },
      ],
      temperature: 0.3,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "Ok.";

    // 3) ➜ salva messaggio ASSISTANT
    const { error: insAssistantErr } = await supabaseAdmin
      .from(MESSAGES_TABLE)
      .insert({ conversation_id: conversationId, role: "assistant", content: reply });

    if (insAssistantErr) {
      console.error("[send] insert assistant msg error:", insAssistantErr);
      // Rispondiamo comunque con la reply per non bloccare l’UX
    }

    return NextResponse.json({ reply });
  } catch (err: any) {
    const status = err?.status ?? 500;
    const type   = err?.error?.type ?? err?.code;
    const retryHeader = err?.headers?.get?.("retry-after");
    const retryAfter = retryHeader ? Number(retryHeader) : undefined;

    if (status === 429 || type === "insufficient_quota") {
      return NextResponse.json(
        {
          error: "QUOTA_ESAURITA",
          message: "Quota OpenAI esaurita o rate limit raggiunto.",
          retryAfter,
        },
        { status: 429 }
      );
    }

    console.error("[/api/messages/send] ERROR:", err);
    const msg = err?.message || "Errore interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: MODEL });
}
