// lib/api/voice.ts
type TranscribeOk = { text?: string };
type TranscribeErr = { error?: string };

export async function transcribeAudio(blob: Blob): Promise<string> {
  // ✅ invia un File (alcuni runtime gestiscono meglio di un Blob "nudo")
  const filename = blob.type.includes("mp4") ? "audio.mp4" : "audio.webm";
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });

  const fd = new FormData();
  fd.append("audio", file, filename);

  const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });

  // 204 = silenzio/nessun parlato → restituisci stringa vuota (Dialogo continua)
  if (res.status === 204) return "";

  let data: TranscribeOk | TranscribeErr | null = null;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const msg = (data as TranscribeErr)?.error || `Trascrizione fallita (HTTP ${res.status})`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.details = data;
    throw err;
  }

  return String((data as TranscribeOk)?.text || "");
}
