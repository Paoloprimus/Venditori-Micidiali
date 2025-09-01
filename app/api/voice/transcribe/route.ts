import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Se vuoi forzare il runtime Node su Vercel, decommenta la riga sotto.
// export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Modello/lingua/prompt (sovrascrivibili via env)
const MODEL    = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
const LANGUAGE = process.env.OPENAI_TRANSCRIBE_LANG   || "it";
const PROMPT   = process.env.OPENAI_TRANSCRIBE_PROMPT ||
  "Trascrivi in italiano con punteggiatura completa. Usa il punto interrogativo alla fine delle domande.";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "file audio mancante" }, { status: 400 });
    }

    const resp = await openai.audio.transcriptions.create({
      file,                 // Blob (webm/mp4/aac…)
      model: MODEL,         // es. "whisper-1" (consigliato)
      language: LANGUAGE,   // es. "it"
      prompt: PROMPT,       // guida morbida alla punteggiatura
      temperature: 0,
      // response_format: "json",
    });

    const text = (resp as any)?.text ?? "";
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("[voice/transcribe] Error:", err);
    return NextResponse.json({ error: err?.message || "errore trascrizione" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: MODEL, language: LANGUAGE });
}
