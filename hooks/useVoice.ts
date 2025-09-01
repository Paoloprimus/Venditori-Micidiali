"use client";
import { useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../lib/api/voice";
import type { Conv } from "../lib/api/conversations";

type Params = {
  onTranscriptionToInput: (text: string) => void;     // aggiorna textarea
  onSendDirectly: (text: string) => Promise<void>;     // non usato qui (solo Dialogo)
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

  // (API compatibile, ma qui non usiamo il Dialogo)
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

  // ======= SR nativa: avvio/loop robusto =======
  function startNativeSR() {
    // Se già spento, non avviare
    if (!micActiveRef.current) return;

    // Evita eco se il TTS sta parlando (di solito parli dopo aver fermato il mic)
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

      // Stato UI
      setIsRecording(true);
      srRef.current = sr;

      sr.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const txt = (res?.[0]?.transcript ?? "") as string;
          if (res.isFinal) {
            // Comando “cancella”
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

        // Live preview: finale + interim
        const live = (finalAccumRef.current + " " + interim).trim();
        onTranscriptionToInput(live);
      };

      sr.onerror = (_ev: any) => {
        // Errori noti: network, no-speech, audio-capture...
        // Se il mic è ancora “attivo”, riavvia dopo un attimo
        if (micActiveRef.current) {
          try { sr.stop?.(); } catch {}
          srRef.current = null;
          setTimeout(startNativeSR, 180);
        }
      };

      sr.onend = () => {
        // Chrome chiude su silenzio/timeouts: se stiamo ancora registrando, riavvia
        if (micActiveRef.current) {
          srRef.current = null;
          setTimeout(startNativeSR, 120);
        } else {
          setIsRecording(false);
        }
      };

      sr.start();
    } catch {
      // Se fallisce, disattiva nativo e prova fallback
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
        }
      };

      mr.start(); // nessun timeslice: resta attivo finché non premi stop
    } catch (e: any) {
      setVoiceError(e?.message || "Impossibile accedere al microfono");
      setIsRecording(false);
      micActiveRef.current = false;
    }
  }

  // ======= Toggle a TAP =======
  function handleVoiceClick() {
    // START
    if (!isRecording && !micActiveRef.current) {
      setVoiceError(null);
      finalAccumRef.current = "";   // nuova sessione di dettatura
      micActiveRef.current = true;

      if (supportsNativeSR) startNativeSR();
      else startFallbackRecorder();

      return;
    }

    // STOP
    micActiveRef.current = false;
    stopAll();

    // Alla chiusura puoi normalizzare (opzionale)
    const finalTxt = normalizeInterrogative(finalAccumRef.current).trim();
    onTranscriptionToInput(finalTxt);
    setLastInputWasVoice(true);
  }

  // Manteniamo le API “press” per compatibilità, ma il toggle è su onClick
  function handleVoicePressStart() { /* no-op (usiamo onClick) */ }
  function handleVoicePressEnd()   { /* no-op (usiamo onClick) */ }

  // ======= Dialogo: API presenti ma non operative qui =======
  async function startDialog() {
    setVoiceMode(true);
    onSpeak("Dialogo vocale non attivo. Usa il microfono singolo.");
  }
  function stopDialog() {
    setVoiceMode(false);
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

  return {
    // stato
    isRecording, isTranscribing, voiceError,
    voiceMode, setVoiceMode,
    speakerEnabled, setSpeakerEnabled,
    lastInputWasVoice, setLastInputWasVoice,

    // controlli (il bottone usa onClick per toggle)
    handleVoicePressStart,
    handleVoicePressEnd,
    handleVoiceClick,
    startDialog,
    stopDialog,
  };
}
