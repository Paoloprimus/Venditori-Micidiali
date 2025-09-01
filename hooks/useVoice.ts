"use client";
import { useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../lib/api/voice";
import type { Conv } from "../lib/api/conversations";

type Params = {
  onTranscriptionToInput: (text: string) => void;
  onSendDirectly: (text: string) => Promise<void>;
  onSpeak: (text?: string) => void;
  createNewSession: (titleAuto: string) => Promise<Conv | null>;
  autoTitleRome: () => string;
  /** Se true, ignora SR nativo e usa sempre backend (Whisper). Per avere testo live, metti false. */
  preferServerSTT?: boolean;
  /** True se il TTS sta parlando: evitiamo eco registrando in pausa. */
  isTtsSpeaking?: () => boolean;
};

export function useVoice({
  onTranscriptionToInput,
  onSendDirectly,
  onSpeak,
  createNewSession,
  autoTitleRome,
  preferServerSTT = false, // default: abilita SR nativo per testo live
  isTtsSpeaking = () => false,
}: Params) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false); // Dialogo non usato qui
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);

  const isIOS =
    typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);

  const SR: any =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const supportsNativeSR =
    !!SR && !isIOS && (typeof window !== "undefined" ? window.isSecureContext : true) && !preferServerSTT;

  const srRef = useRef<any>(null);

  // Recorder fallback (Whisper)
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Dialogo (API compatibile)
  const dialogActiveRef = useRef(false);

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
    return /^\s*cancella\s*[.!?]*\s*$/i.test(t) || /\bcancella\b/i.test(t.trim());
  }

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

  function stopRecorderOrSR() {
    if (srRef.current) {
      try { srRef.current.stop?.(); } catch {}
      srRef.current = null;
    }
    if (mrRef.current && mrRef.current.state !== "inactive") {
      try { mrRef.current.stop(); } catch {}
    }
    try { streamRef.current?.getTracks()?.forEach((t) => t.stop()); } catch {}
  }

  // ===== Core: una “presa” di parlato, con toggle a tap =====
  async function listenOnce(): Promise<string> {
    // Pausa se il TTS sta parlando (evita eco)
    while (isTtsSpeaking()) await sleep(80);

    if (supportsNativeSR) {
      return new Promise((resolve) => {
        try {
          const sr = new SR();
          sr.lang = "it-IT";
          sr.interimResults = true; // testo live
          sr.maxAlternatives = 1;
          sr.continuous = true;     // resta attivo finché non lo fermi

          let finalText = "";
          let resolved = false;

          sr.onresult = (e: any) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const res = e.results[i];
              const txt = res[0]?.transcript || "";
              if (res.isFinal) {
                finalText += txt;
              } else {
                interim += txt;
              }
            }

            // LIVE: aggiorna textarea
            if (interim) {
              // "cancella" intercettato live → svuota e continua ad ascoltare
              if (isCancelCommand(interim)) {
                onTranscriptionToInput("");
                finalText = "";
                return;
              }
              onTranscriptionToInput(interim);
            }

            if (finalText && !resolved) {
              // finale = "cancella" → svuota e continua (non chiudere)
              if (isCancelCommand(finalText)) {
                onTranscriptionToInput("");
                finalText = "";
                return;
              }

              // finale normale → risolvi (chiudiamo la sessione tap-to-talk)
              resolved = true;
              resolve(String(finalText));
              try { sr.stop?.(); } catch {}
            }
          };

          sr.onerror = () => { if (!resolved) resolve(""); };
          sr.onend = () => { if (!resolved) resolve(finalText); };

          sr.start();
          srRef.current = sr;
          setIsRecording(true);
        } catch {
          resolve("");
        }
      });
    }

    // Fallback: registrazione → Whisper (niente live testo)
    return new Promise(async (resolve) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mr = new MediaRecorder(stream, { mimeType: pickMime() });
        chunksRef.current = [];
        mr.ondataavailable = (ev) => { if (ev.data?.size) chunksRef.current.push(ev.data); };
        mr.onstop = async () => {
          setIsRecording(false);
          setIsTranscribing(true);
          try {
            const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
            const text = await transcribeAudio(blob);
            if (isCancelCommand(text)) {
              onTranscriptionToInput("");
              resolve("");
            } else {
              resolve(text);
            }
          } catch (err: any) {
            setVoiceError(err?.message || "errore trascrizione");
            resolve("");
          } finally {
            setIsTranscribing(false);
            try { stream.getTracks().forEach(t => t.stop()); } catch {}
            streamRef.current = null;
          }
        };

        mrRef.current = mr;
        mr.start();
        setIsRecording(true);
      } catch {
        resolve("");
      }
    });
  }

  // ===== Controlli: toggle a tap =====
  function handleVoicePressStart() {
    if (isTranscribing) return;
    if (!isRecording) {
      setVoiceError(null);
      listenOnce().then((t) => {
        setIsRecording(false);
        if (!t) return;
        const txt = normalizeInterrogative(t);
        onTranscriptionToInput(txt);
        setLastInputWasVoice(true);
      });
    }
  }

  function handleVoicePressEnd() {
    if (!isRecording) return;
    stopRecorderOrSR();
    setIsRecording(false);
  }

  function handleVoiceClick() {
    // Toggle: primo tap start, secondo tap stop
    if (!isRecording) handleVoicePressStart();
    else handleVoicePressEnd();
  }

  // ===== Dialogo (manteniamo API, ma non attivo qui) =====
  async function startDialog() {
    setVoiceMode(true);
    onSpeak("Dialogo vocale non attivo in questa modalità. Usa il microfono singolo.");
  }
  function stopDialog() {
    setVoiceMode(false);
    stopRecorderOrSR();
  }

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
  };
}
