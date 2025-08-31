// hooks/useVoice.ts
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
};

export function useVoice({
  onTranscriptionToInput,
  onSendDirectly,
  onSpeak,
  createNewSession,
  autoTitleRome,
}: Params) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);

  // SR nativo
  const isIOS = typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);
  const SR: any =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const supportsNativeSR = !!SR && !isIOS && (typeof window !== "undefined" ? window.isSecureContext : true);
  const srRef = useRef<any>(null);

  // Recorder fallback
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // dialogo
  const dialogActiveRef = useRef(false);
  const dialogDraftRef = useRef<string>("");

  // --- Persistenza ON/OFF altoparlante per sessione (opzionale: chiave esterna se vuoi per-conv)
  // useEffect(() => {
  //   const saved = localStorage.getItem("autoTTS:global");
  //   setSpeakerEnabled(saved === "1");
  // }, []);
  // useEffect(() => {
  //   localStorage.setItem("autoTTS:global", speakerEnabled ? "1" : "0");
  // }, [speakerEnabled]);

  function pickMime() {
    try {
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
        if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
      }
    } catch {}
    return "";
  }

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
    // fallback recorder: ~4s
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
          } catch {
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
        setTimeout(() => { try { if (mr.state !== "inactive") mr.stop(); } catch {} }, 4000);
      } catch {
        resolve("");
      }
    });
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

  // --- API pubblica “press”
  function handleVoicePressStart() {
    if (isTranscribing || isRecording) return;
    setVoiceError(null);
    listenOnce().then((t) => {
      if (!t) { setIsRecording(false); return; }
      onTranscriptionToInput(t);
      setLastInputWasVoice(true);
      setIsRecording(false);
    });
  }
  function handleVoicePressEnd() { if (!isRecording) return; stopRecorderOrSR(); }
  function handleVoiceClick() { if (!isRecording) handleVoicePressStart(); else handleVoicePressEnd(); }

  // --- Dialogo vocale
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

  async function dialogLoopTick() {
    while (dialogActiveRef.current) {
      const heard = (await listenOnce()).trim();
      if (!dialogActiveRef.current) break;
      if (!heard) continue;

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
        if (toSend) await onSendDirectly(toSend);
        else onSpeak("Dimmi cosa vuoi che faccia");
      }
    }
  }

  // loop
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
