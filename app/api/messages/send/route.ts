// /app/api/messages/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs"; // usa Node, non Edge (env e lib node-friendly)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Config
const MODEL  = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const SYSTEM = process.env.OPENAI_SYSTEM_PROMPT || "Rispondi in italiano in modo chiaro e conciso.";

// Nomi DB: cambia qui se diversi
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

    const supabase = getSupabaseAdmin();

    // 1) salva USER
    const insUser = await supabase
      .from(MESSAGES_TABLE)
      .insert({ conversation_id: conversationId, role: "user", content })
      .select("id") // forza errore visibile
      .single();

    if (insUser.error) {
      console.error("[send] insert user msg error:", insUser.error);
      return NextResponse.json(
        { error: "insert_user_failed", details: insUser.error.message, code: insUser.error.code },
        { status: 500 }
      );
    }

    // 2) modello
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

    // 3) salva ASSISTANT (non bloccare UX se fallisce)
    const insAsst = await supabase
      .from(MESSAGES_TABLE)
      .insert({ conversation_id: conversationId, role: "assistant", content: reply })
      .select("id")
      .single();

    if (insAsst.error) {
      console.error("[send] insert assistant msg error:", insAsst.error);
    }

    return NextResponse.json({ reply });
  } catch (err: any) {
    // Errori noti OpenAI quota
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

    // Mancanze env supabase chiare
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
