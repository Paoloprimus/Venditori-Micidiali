// /app/api/voice/transcribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs"; // evita edge-quirk su File/Blob

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MODEL    = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
const LANGUAGE = process.env.OPENAI_TRANSCRIBE_LANG   || "it";
const PROMPT   = process.env.OPENAI_TRANSCRIBE_PROMPT ||
  "Trascrivi in italiano con punteggiatura completa. Usa il punto interrogativo alla fine delle domande.";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const part = form.get("audio");

    // Duck-typing: deve avere arrayBuffer()
    if (!part || typeof (part as any).arrayBuffer !== "function") {
      return NextResponse.json({ error: "file audio mancante" }, { status: 400 });
    }

    const incoming: any = part; // può essere File o Blob (undici)
    const size = typeof incoming.size === "number" ? incoming.size : 0;
    if (!size) {
      // Silenzio: non è un errore duro
      return NextResponse.json({ text: "" }, { status: 204 });
    }

    // Costruisci SEMPRE un File per soddisfare il type "Uploadable"
    const defaultName =
      typeof incoming.type === "string" && incoming.type.includes("mp4") ? "audio.mp4" : "audio.webm";
    const fileName = typeof incoming.name === "string" && incoming.name ? incoming.name : defaultName;
    const type = typeof incoming.type === "string" && incoming.type ? incoming.type : "application/octet-stream";

    let uploadFile: File;
    if (typeof File !== "undefined" && incoming instanceof File) {
      uploadFile = incoming as File; // già File con name/lastModified
    } else {
      // Converte Blob -> File garantendo name/lastModified
      const buf = await (incoming as Blob).arrayBuffer();
      uploadFile = new File([new Uint8Array(buf)], fileName, { type, lastModified: Date.now() });
    }

    const resp = await openai.audio.transcriptions.create({
      file: uploadFile,   // ✅ ora è un File (Uploadable)
      model: MODEL,
      language: LANGUAGE,
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
