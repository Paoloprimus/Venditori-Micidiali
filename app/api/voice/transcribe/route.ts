import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Se vuoi forzare il runtime Node su Vercel, decommenta la riga sotto.
// export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Facoltativo: scegli il modello via env, altrimenti default moderno.
// Esempi: "gpt-4o-mini-transcribe" (consigliato), "whisper-1"
const MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

export async function POST(req: NextRequest) {
  try {
    // Accetta multipart/form-data con campo "audio"
    const form = await req.formData();
    const file = form.get("audio");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "file audio mancante" }, { status: 400 });
    }

    // L’SDK v4 accetta Blob direttamente. Non serve salvare su disco.
    const resp = await openai.audio.transcriptions.create({
      file,         // Blob (webm/mp4/aac…)
      model: MODEL, // "gpt-4o-mini-transcribe" di default
      // language: "it",    // opzionale: imposta la lingua se vuoi
      // response_format: "json", // default
      // temperature: 0,    // opzionale
    });

    const text = (resp as any)?.text ?? "";
    return NextResponse.json({ text });
  } catch (err: any) {
    const msg = err?.message || "errore trascrizione";
    // Log minimale server-side (apparirà nella console Vercel)
    console.error("[voice/transcribe] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  // Endpoint “ping” utile per verificare il deploy
  return NextResponse.json({ ok: true, model: MODEL });
}
