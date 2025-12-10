// app/api/voice/tts/route.ts
// OpenAI TTS API - Genera audio da testo
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Voci disponibili: alloy, echo, fable, onyx, nova, shimmer
// shimmer = femminile, più naturale per italiano
// nova = femminile naturale, echo = maschile naturale
const DEFAULT_VOICE = process.env.OPENAI_TTS_VOICE || "shimmer";
const DEFAULT_MODEL = process.env.OPENAI_TTS_MODEL || "tts-1"; // tts-1 = veloce, tts-1-hd = alta qualità
const DEFAULT_SPEED = 1.0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = (body.text || "").trim();
    const voice = body.voice || DEFAULT_VOICE;
    const speed = body.speed || DEFAULT_SPEED;

    if (!text) {
      return NextResponse.json({ error: "Testo mancante" }, { status: 400 });
    }

    // Limite sicurezza: max 4096 caratteri per richiesta
    if (text.length > 4096) {
      return NextResponse.json({ error: "Testo troppo lungo (max 4096 caratteri)" }, { status: 400 });
    }

    const response = await openai.audio.speech.create({
      model: DEFAULT_MODEL,
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
      speed: speed,
      response_format: "mp3",
    });

    // Converti in ArrayBuffer e poi in Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Restituisci l'audio come stream
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=86400", // Cache 24h per risparmiare
      },
    });
  } catch (err: any) {
    console.error("[voice/tts] Error:", err);
    const status = err?.status ?? 500;
    const msg = err?.message || "Errore generazione TTS";
    return NextResponse.json({ error: msg }, { status });
  }
}

// GET per verificare che l'endpoint funzioni
export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    model: DEFAULT_MODEL,
    voice: DEFAULT_VOICE,
    maxChars: 4096,
  });
}

