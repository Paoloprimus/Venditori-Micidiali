// /app/api/messages/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Se preferisci Node runtime su Vercel:
// export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Config via env con default sicuri
const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const SYSTEM = process.env.OPENAI_SYSTEM_PROMPT || "Rispondi in italiano in modo chiaro e conciso.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const content = String(body?.content ?? "").trim();
    const terse   = Boolean(body?.terse);
    const conversationId = body?.conversationId ? String(body.conversationId) : undefined;

    // Validazione input
    if (!content) {
      return NextResponse.json({ error: "content mancante" }, { status: 400 });
    }
    if (!conversationId) {
      // Mantengo 200 se vuoi essere permissivo, ma è più corretto 400:
      return NextResponse.json({ error: "conversationId mancante" }, { status: 400 });
    }
    if (content.length > 8000) {
      return NextResponse.json({ error: "content troppo lungo" }, { status: 413 });
    }

    // Costruzione prompt (puoi arricchire con memoria/conversazione, qui rispondiamo ad-hoc)
    const sys = SYSTEM + (terse ? " Rispondi molto brevemente." : "");
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: sys },
      { role: "user", content },
    ];

    // Chiamata al modello
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.3,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Ok.";

    // NB: qui potresti salvare su DB (user/conv/messages). Il client per ora usa lo stato locale + /by-conversation.

    return NextResponse.json({ reply });
  } catch (err: any) {
    // Logging server per debugging (visibile su Vercel)
    console.error("[/api/messages/send] ERROR:", err);
    const msg = err?.message || "Errore interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: MODEL });
}
