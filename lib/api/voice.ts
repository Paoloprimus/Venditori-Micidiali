// lib/api/voice.ts
// Trascrizione audio: invia un Blob dentro FormData e ritorna testo

type TranscribeResponse = { text?: string };

export async function transcribeAudio(blob: Blob): Promise<string> {
  const fd = new FormData();
  // Nome file coerente col tuo backend (mp4/webm)
  fd.append("audio", blob, blob.type.includes("mp4") ? "audio.mp4" : "audio.webm");
  const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Trascrizione fallita (HTTP ${res.status})`);
  const data = (await res.json()) as TranscribeResponse;
  return String(data?.text || "");
}
