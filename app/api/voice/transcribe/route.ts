// /app/api/voice/transcribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs"; // evita edge-quirk su FormData/File

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MODEL    = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
const LANGUAGE = process.env.OPENAI_TRANSCRIBE_LANG   || "it";
const PROMPT   = process.env.OPENAI_TRANSCRIBE_PROMPT ||
  "Trascrivi in italiano con punteggiatura completa. Usa il punto interrogativo alla fine delle domande.";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const anyFile = form.get("audio");

    // ✅ niente instanceof: duck-typing per evitare cross-realm
    if (!anyFile || typeof (anyFile as any).arrayBuffer !== "function") {
      return NextResponse.json({ error: "file audio mancante" }, { status: 400 });
    }

    const file = anyFile as Blob;

    // ✅ se Blob vuoto: non trattarlo come errore duro
    const size = (file as any).size ?? 0;
    if (!size) {
      return NextResponse.json({ text: "" }, { status: 204 });
    }

    const resp = await openai.audio.transcriptions.create({
      file,               // Blob/File
      model: MODEL,       // whisper-1 consigliato
      language: LANGUAGE, // it
      prompt: PROMPT,
      temperature: 0,
    });

    const text = (resp as any)?.text ?? "";
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("[voice/transcribe] Error:", err);
    const status = err?.status ?? 500;
    const msg = err?.message || "errore trascrizione";
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: MODEL, language: LANGUAGE });
}
