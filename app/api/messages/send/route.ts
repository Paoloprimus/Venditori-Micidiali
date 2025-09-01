// /app/api/messages/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// export const runtime = "nodejs"; // opzionale

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Config via env con default sicuri
const MODEL  = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const SYSTEM = process.env.OPENAI_SYSTEM_PROMPT || "Rispondi in italiano in modo chiaro e conciso.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const content = String(body?.content ?? "").trim();
    const terse   = Boolean(body?.terse);
    const conversationId = body?.conversationId ? String(body.conversationId) : undefined;

    if (!content)        return NextResponse.json({ error: "content mancante" }, { status: 400 });
    if (!conversationId) return NextResponse.json({ error: "conversationId mancante" }, { status: 400 });
    if (content.length > 8000) return NextResponse.json({ error: "content troppo lungo" }, { status: 413 });

    const sys = SYSTEM + (terse ? " Rispondi molto brevemente." : "");
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: sys },
      { role: "user", content },
    ];

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.3,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "Ok.";
    return NextResponse.json({ reply });
  } catch (err: any) {
    // 🔒 Gestione QUOTA / RATE LIMIT
    const status = err?.status ?? 500;
    const type   = err?.error?.type ?? err?.code;
    const retryHeader = err?.headers?.get?.("retry-after");
    const retryAfter = retryHeader ? Number(retryHeader) : undefined;

    // insufficient_quota (billing) oppure 429 generico
    if (status === 429 || type === "insufficient_quota") {
      return NextResponse.json(
        {
          error: "QUOTA_ESAURITA",
          message: "Quota OpenAI esaurita o rate limit raggiunto. Riprova più tardi o aggiorna il piano/chiave.",
          retryAfter, // opzionale, in secondi se fornito
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
