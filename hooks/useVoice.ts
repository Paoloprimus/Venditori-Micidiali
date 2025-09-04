// hooks/useVoice.ts

"use client";
import { useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../lib/api/voice";
import type { Conv } from "../lib/api/conversations";

type Params = {
  onTranscriptionToInput: (text: string) => void;     // aggiorna textarea
  onSendDirectly: (text: string) => Promise<void>;     // usato in Dialogo
  onSpeak: (text?: string) => void;                    // TTS, lasciamo API
  createNewSession: (titleAuto: string) => Promise<Conv | null>;
  autoTitleRome: () => string;
  /** Per testo live, metti false → usa Web Speech API se presente */
  preferServerSTT?: boolean;
  /** Se il TTS sta parlando (per evitare eco quando serve) */
  isTtsSpeaking?: () => boolean;
};

export function useVoice({
  onTranscriptionToInput,
  onSendDirectly,
  onSpeak,
  createNewSession,
  autoTitleRome,
  preferServerSTT = false,      // ⬅️ default: SR nativa per live transcript
  isTtsSpeaking = () => false,
}: Params) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // (API compatibile)
  const [voiceMode, setVoiceMode] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);

  // ======= SR nativa (Chrome) =======
  const isIOS =
    typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);
  const SR: any =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const supportsNativeSR =
    !!SR && !isIOS && (typeof window !== "undefined" ? window.isSecureContext : true) && !preferServerSTT;

  const srRef = useRef<any>(null);            // istanza corrente SR
  const micActiveRef = useRef(false);         // stato “voglio ascoltare” (toggle)
  const finalAccumRef = useRef<string>("");   // testo finale accumulato (SR nativa)

  // ======= MediaRecorder fallback (niente live) =======
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingStopResolveRef = useRef<(() => void) | null>(null); // per stop asincrono nel fallback

  // ===== Helpers =====
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  function pickMime() {
    try {
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
        if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
      }
    } catch {}
    return "";
  }

  function isCancelCommand(t: string) {
    const s = (t || "").trim();
    return /^\s*cancella\s*[.!?]*\s*$/i.test(s) || /\bcancella\b/i.test(s);
  }

  // ⬇️⬇️ AGGIUNTA: cue "invia"
  function hasSubmitCue(raw: string) {
    return /\binvia(?:\s+(?:ora|adesso))?\s*[.!?]*$/i.test((raw || "").trim());
  }
  function stripSubmitCue(raw: string) {
    return (raw || "").replace(/\binvia(?:\s+(?:ora|adesso))?\s*[.!?]*$/i, "").trim();
  }
  // ⬆️⬆️

  // Normalizza domande se vuoi (non obbligatorio all’invio manuale)
  function normalizeInterrogative(raw: string) {
    const t0 = (raw ?? "").trim();
    if (!t0) return t0;
    const t = t0.replace(/\s+$/g, "").replace(/[?!.\u2026]+$/g, (m) => m[0]);
    const hasEndPunct = /[.!?]$/.test(t);
    const questionStarts =
      /^(chi|che|cosa|come|quando|dove|perch[eé]|quale|quali|quanto|quanta|quanti|quante|posso|puoi|può|potrei|potresti|riesci|sapresti|mi\s+puoi|mi\s+potresti|è|sei|siamo|siete|sono|hai|avete|c'?è|ci\s+sono)\b/i;
    const questionTails = /\b(vero|giusto|d'accordo|ok|no)\s*$/i;
    const questionPhrases = /\b(quanto\s+costa|qual[ei]\s+prezzo|mi\s+spieghi|potresti\s+dire)\b/i;
    const looksQuestion =
      /\?$/.test(t) || questionStarts.test(t) || questionTails.test(t) || questionPhrases.test(t);
    if (!hasEndPunct) return t + (looksQuestion ? "?" : ".");
    if (/[.]$/.test(t) && looksQuestion) return t.slice(0, -1) + "?";
    return t;
  }

  function stopAll() {
    // stop SR
    if (srRef.current) {
      try { srRef.current.onresult = null; } catch {}
      try { srRef.current.onend = null; } catch {}
      try { srRef.current.onerror = null; } catch {}
      try { srRef.current.stop?.(); } catch {}
      srRef.current = null;
    }
    // stop Recorder
    if (mrRef.current && mrRef.current.state !== "inactive") {
      try { mrRef.current.stop(); } catch {}
    }
    try { streamRef.current?.getTracks()?.forEach((t) => t.stop()); } catch {}
    streamRef.current = null;

    setIsRecording(false);
  }

  // ⬇️⬇️ AGGIUNTA: stato/buffer Dialogo
  const [dialogMode, setDialogMode] = useState(false);
  const dialogBufRef = useRef<string>(""); // accumula solo in Dialogo
  // ⬆️⬆️

  // ======= SR nativa: avvio/loop robusto =======
  function startNativeSR() {
    if (!micActiveRef.current) return;
    if (isTtsSpeaking()) {
      setTimeout(startNativeSR, 150);
      return;
    }

    try {
      const sr = new SR();
      sr.lang = "it-IT";
      sr.interimResults = true;
      sr.continuous = true;
      sr.maxAlternatives = 1;

      setIsRecording(true);
      srRef.current = sr;

      sr.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const txt = (res?.[0]?.transcript ?? "") as string;
          if (res.isFinal) {
            if (isCancelCommand(txt)) {
              finalAccumRef.current = "";
              onTranscriptionToInput("");
              continue;
            }
            finalAccumRef.current = (finalAccumRef.current + " " + txt).trim();
          } else {
            interim += txt;
          }
        }
        const live = (finalAccumRef.current + " " + interim).trim();

        // ⬇️⬇️ MODIFICA: gestione differenziata per Dialogo
        // Se il TTS sta parlando, in Dialogo ignoriamo risultati e ripartiamo dopo
        if (dialogMode && isTtsSpeaking()) return;

        if (dialogMode) {
          // In Dialogo: NON scrivere live nella textarea.
          dialogBufRef.current = live;

          // Se sente il cue "invia", normalizza e invia
          if (hasSubmitCue(live)) {
            const payload = normalizeInterrogative(stripSubmitCue(live));
            // pulizia buffer
            dialogBufRef.current = "";
            finalAccumRef.current = "";
            // metti in pausa il mic mentre parte la risposta
            micActiveRef.current = false;
            try { sr.stop?.(); } catch {}

            // invia come nella chat normale
            onSendDirectly(payload).catch(() => {});
          }
        } else {
          // Tap-to-talk: comportamento attuale (live nella textarea)
          onTranscriptionToInput(live);
        }
        // ⬆️⬆️
      };

      sr.onerror = () => {
        if (micActiveRef.current) {
          try { sr.stop?.(); } catch {}
          srRef.current = null;
          setTimeout(startNativeSR, 180);
        }
      };

      sr.onend = () => {
        if (micActiveRef.current) {
          srRef.current = null;
          setTimeout(startNativeSR, 120);
        } else {
          setIsRecording(false);
        }
      };

      sr.start();
    } catch {
      srRef.current = null;
      startFallbackRecorder();
    }
  }

  // ======= Fallback: registra fino a stop, poi trascrivi =======
  async function startFallbackRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: pickMime() });
      mrRef.current = mr;
      chunksRef.current = [];
      setIsRecording(true);

      mr.ondataavailable = (ev) => { if (ev.data?.size) chunksRef.current.push(ev.data); };

      mr.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
          const text = (await transcribeAudio(blob)) || "";
          if (isCancelCommand(text)) {
            finalAccumRef.current = "";
            onTranscriptionToInput("");
          } else {
            finalAccumRef.current = text.trim();
            onTranscriptionToInput(finalAccumRef.current);
          }
        } catch (err: any) {
          setVoiceError(err?.message || "errore trascrizione");
        } finally {
          setIsTranscribing(false);
          try { stream.getTracks().forEach(t => t.stop()); } catch {}
          streamRef.current = null;
          // 🔔 risolvi eventuale stopMic() in attesa
          if (pendingStopResolveRef.current) {
            pendingStopResolveRef.current();
            pendingStopResolveRef.current = null;
          }
        }
      };

      mr.start(); // resta attivo finché non premi stop
    } catch (e: any) {
      setVoiceError(e?.message || "Impossibile accedere al microfono");
      setIsRecording(false);
      micActiveRef.current = false;
    }
  }

  // ======= STOP MIC pubblica (usata quando premi "Invia") =======
  async function stopMic(): Promise<void> {
    // segnala che non vogliamo più ascoltare
    micActiveRef.current = false;

    // SR nativa: abbiamo già il testo accumulato → stop immediato
    if (supportsNativeSR) {
      stopAll();
      const finalTxt = normalizeInterrogative(finalAccumRef.current).trim();
      onTranscriptionToInput(finalTxt);
      setLastInputWasVoice(true);
      return;
    }

    // Fallback: fermiamo il recorder e aspettiamo la trascrizione server
    if (mrRef.current && mrRef.current.state !== "inactive") {
      await new Promise<void>((resolve) => {
        pendingStopResolveRef.current = () => {
          const finalTxt = normalizeInterrogative(finalAccumRef.current).trim();
          onTranscriptionToInput(finalTxt);
          setLastInputWasVoice(true);
          resolve();
        };
        try { mrRef.current!.stop(); } catch { resolve(); }
      });
      return;
    }

    // Nessun mic attivo: assicurati che sia tutto pulito
    stopAll();
  }

  // ======= Toggle a TAP =======
  async function handleVoiceClick() {
    // START
    if (!isRecording && !micActiveRef.current) {
      setVoiceError(null);
      finalAccumRef.current = "";   // nuova sessione
      micActiveRef.current = true;

      if (supportsNativeSR) startNativeSR();
      else startFallbackRecorder();
      return;
    }
    // STOP
    await stopMic();
  }

  // Manteniamo le API “press” per compatibilità, ma il toggle è su onClick
  function handleVoicePressStart() { /* no-op */ }
  function handleVoicePressEnd()   { /* no-op */ }

  // ======= Dialogo: attiva/disattiva REALI =======
  async function startDialog() {
    setDialogMode(true);
    dialogBufRef.current = "";
    setVoiceMode(true);
    setVoiceError(null);
    finalAccumRef.current = "";
    micActiveRef.current = true;
    if (supportsNativeSR) startNativeSR();
    else startFallbackRecorder();
    onSpeak("Dialogo attivo. Di' la frase e termina con 'invia'.");
  }
  function stopDialog() {
    setDialogMode(false);
    setVoiceMode(false);
    dialogBufRef.current = "";
    micActiveRef.current = false;
    stopAll();
  }

  // Cleanup su unmount
  useEffect(() => {
    return () => {
      micActiveRef.current = false;
      stopAll();
    };
  }, []);

  // ⬇️⬇️ AGGIUNTA: sospensione mic mentre parla il TTS in Dialogo e auto-ripartenza
  useEffect(() => {
    const id = setInterval(() => {
      if (!dialogMode) return;
      if (isTtsSpeaking()) {
        // sospendi ascolto se serve (SR nativa)
        if (srRef.current) { try { srRef.current.stop?.(); } catch {} srRef.current = null; }
        micActiveRef.current = false;
        setIsRecording(false);
      } else if (!isRecording && dialogMode && !srRef.current && !mrRef.current) {
        // riparti quando il TTS ha finito
        micActiveRef.current = true;
        if (supportsNativeSR) startNativeSR();
        else startFallbackRecorder();
      }
    }, 150);
    return () => clearInterval(id);
  }, [dialogMode, supportsNativeSR, isRecording]);
  // ⬆️⬆️

  return {
    // stato
    isRecording, isTranscribing, voiceError,
    voiceMode, setVoiceMode,
    speakerEnabled, setSpeakerEnabled,
    lastInputWasVoice, setLastInputWasVoice,

    // controlli
    handleVoicePressStart,
    handleVoicePressEnd,
    handleVoiceClick,
    startDialog,
    stopDialog,

    // nuovo: stop esplicito per "Invia"
    stopMic,
  };
}
