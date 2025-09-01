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
  /** Se true, ignora il riconoscimento nativo del browser e usa sempre il backend */
  preferServerSTT?: boolean;
};

export function useVoice({
  onTranscriptionToInput,
  onSendDirectly,
  onSpeak,
  createNewSession,
  autoTitleRome,
  preferServerSTT = true, // ✅ default: usa sempre STT server (Whisper)
}: Params) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);

  // --- SR nativo (disattivato se preferServerSTT = true)
  const isIOS = typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);
  const SR: any =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const supportsNativeSR =
    !!SR && !isIOS && (typeof window !== "undefined" ? window.isSecureContext : true) && !preferServerSTT;
  const srRef = useRef<any>(null);

  // --- Recorder fallback (usato anche quando forziamo il server STT)
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // --- Dialogo
  const dialogActiveRef = useRef(false);
  const dialogDraftRef = useRef<string>("");

  // ---------- Helpers ----------
  function pickMime() {
    try {
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
        if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
      }
    } catch {}
    return "";
  }

  function normalizeInterrogative(raw: string) {
    const t0 = (raw ?? "").trim();
    if (!t0) return t0;

    // comprimi punteggiatura/spazi finali
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

  // ---------- Core: una “presa” di parlato ----------
  async function listenOnce(): Promise<string> {
    if (supportsNativeSR && SR) {
      return new Promise((resolve) => {
        try {
          const sr = new SR();
          sr.lang = "it-IT";
          sr.interimResults = false;
          sr.maxAlternatives = 1;
          let got = false;

          sr.onresult = (e: any) => {
            got = true;
            const t = e?.results?.[0]?.[0]?.transcript || "";
            resolve(String(t));
            try { sr.stop?.(); } catch {}
          };
          sr.onerror = () => { if (!got) resolve(""); };
          sr.onend = () => { if (!got) resolve(""); };

          sr.start();
          srRef.current = sr;
          setIsRecording(true);
        } catch {
          resolve("");
        }
      });
    }

    // Fallback/forzato: registra 4s e manda al server (Whisper)
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
            resolve(text);
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
        setTimeout(() => {
          try { if (mr.state !== "inactive") mr.stop(); } catch {}
        }, 4000);
      } catch {
        resolve("");
      }
    });
  }

  // ---------- Controlli UI ----------
  function handleVoicePressStart() {
    if (isTranscribing || isRecording) return;
    setVoiceError(null);

    listenOnce().then((t) => {
      if (!t) { setIsRecording(false); return; }
      const txt = normalizeInterrogative(t);
      onTranscriptionToInput(txt);
      setLastInputWasVoice(true);
      setIsRecording(false);
    });
  }

  function handleVoicePressEnd() {
    if (!isRecording) return;
    stopRecorderOrSR();
  }

  function handleVoiceClick() {
    if (!isRecording) handleVoicePressStart();
    else handleVoicePressEnd();
  }

  // ---------- Dialogo vocale ----------
  async function startDialog() {
    if (voiceMode) return;
    setVoiceMode(true);
    dialogActiveRef.current = true;
    dialogDraftRef.current = "";
    try { window.speechSynthesis?.cancel?.(); } catch {}
    onSpeak("Dimmi pure.");
  }

  function stopDialog() {
    dialogActiveRef.current = false;
    setVoiceMode(false);
    try { window.speechSynthesis?.cancel?.(); } catch {}
    stopRecorderOrSR();
  }

  function hasSubmitCue(raw: string) {
    return /\besegui(?:\s+(?:ora|adesso))?\s*[.!?]*$/i.test(raw.trim());
  }
  function stripSubmitCue(raw: string) {
    return raw.replace(/\besegui(?:\s+(?:ora|adesso))?\s*[.!?]*$/i, "").trim();
  }
  function isCmdStop(raw: string)   { return /\bstop\s+dialogo\b/i.test(raw); }
  function isCmdAnnulla(raw: string){ return /\bannulla\b/i.test(raw); }
  function isCmdRipeti(raw: string) { return /\bripeti\b/i.test(raw); }
  function isCmdNuova(raw: string)  { return /\bnuova\s+sessione\b/i.test(raw); }

  async function dialogLoopTick() {
    while (dialogActiveRef.current) {
      const heardRaw = (await listenOnce()).trim();
      if (!dialogActiveRef.current) break;
      if (!heardRaw) continue;

      const heard = normalizeInterrogative(heardRaw);

      if (isCmdStop(heard))   { onSpeak("Dialogo disattivato."); stopDialog(); break; }
      if (isCmdAnnulla(heard)){ dialogDraftRef.current = ""; onSpeak("Annullato. Dimmi pure."); continue; }
      if (isCmdRipeti(heard)) { onSpeak(); continue; }
      if (isCmdNuova(heard))  {
        const title = autoTitleRome();
        try {
          const conv = await createNewSession(title);
          if (conv?.id) onSpeak("Nuova sessione. Dimmi pure.");
          else onSpeak("Non riesco a creare la sessione.");
        } catch { onSpeak("Errore creazione sessione."); }
        continue;
      }

      let text = heard;
      let shouldSend = false;
      if (hasSubmitCue(text)) { text = stripSubmitCue(text); shouldSend = true; }
      if (text) dialogDraftRef.current = (dialogDraftRef.current + " " + text).trim();

      if (shouldSend) {
        const toSend = dialogDraftRef.current.trim();
        dialogDraftRef.current = "";
        if (toSend) {
          // ✅ normalizza prima dell'invio
          await onSendDirectly(normalizeInterrogative(toSend));
        } else {
          onSpeak("Dimmi cosa vuoi che faccia");
        }
      }
    }
  }

  useEffect(() => {
    if (!voiceMode) return;
    dialogLoopTick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode]);

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
