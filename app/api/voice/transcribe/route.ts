import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Se vuoi forzare il runtime Node su Vercel, decommenta la riga sotto.
// export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Modello e lingua (overridable via env)
const MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
// Esempi: "it", "en", "fr". Se non settata, default "it".
const LANGUAGE = process.env.OPENAI_TRANSCRIBE_LANG || "it";

export async function POST(req: NextRequest) {
  try {
    // Accetta multipart/form-data con campo "audio"
    const form = await req.formData();
    const file = form.get("audio");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "file audio mancante" }, { status: 400 });
    }

    // ➜ lingua forzata: migliora punteggiatura e interrogative
    const resp = await openai.audio.transcriptions.create({
      file,          // Blob (webm/mp4/aac…)
      model: MODEL,  // es. "gpt-4o-mini-transcribe" o "whisper-1"
      language: LANGUAGE, // ← QUI la lingua (es. "it")
      // response_format: "json",
      // temperature: 0,
      // prompt: "Italiano. Inserisci correttamente i punti interrogativi.",
    });

    const text = (resp as any)?.text ?? "";
    return NextResponse.json({ text });
  } catch (err: any) {
    const msg = err?.message || "errore trascrizione";
    console.error("[voice/transcribe] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  // Endpoint “ping” utile per verificare il deploy
  return NextResponse.json({ ok: true, model: MODEL, language: LANGUAGE });
}
