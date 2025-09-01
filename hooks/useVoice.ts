// hooks/useVoice.ts
"use client";
import { useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../lib/api/voice";
import type { Conv } from "../lib/api/conversations";

type Params = {
  onTranscriptionToInput: (text: string) => void;           // aggiorna textarea (solo tap-to-talk)
  onSendDirectly: (text: string) => Promise<void>;           // invio diretto nel Dialogo
  onSpeak: (text?: string) => void;                          // prompt vocale breve, es. "Dimmi pure."
  createNewSession: (titleAuto: string) => Promise<Conv | null>;
  autoTitleRome: () => string;
  preferServerSTT?: boolean;                                 // se true => forzi backend STT
  isTtsSpeaking?: () => boolean;                             // blocca mic mentre il TTS parla
};

export function useVoice({
  onTranscriptionToInput,
  onSendDirectly,
  onSpeak,
  createNewSession,
  autoTitleRome,
  preferServerSTT = true,
  isTtsSpeaking = () => false,
}: Params) {
  // ---- stato
  const [isRecording, setIsRecording] = useState(false);     // 🔴 SOLO per tap-to-talk (non per Dialogo)
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);         // stato Dialogo
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);

  // ---- SR nativo (abilitato solo se non forzi server)
  const isIOS = typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);
  const SR: any =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const supportsNativeSR =
    !!SR && !isIOS && (typeof window !== "undefined" ? window.isSecureContext : true) && !preferServerSTT;
  const srRef = useRef<any>(null);

  // ---- Recorder fallback
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // ---- Dialogo
  const dialogActiveRef = useRef(false);
  const dialogDraftRef = useRef<string>("");

  // ---- utils
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
    // ✅ sempre azzera gli stati UI di registrazione/trascrizione
    setIsRecording(false);
    setIsTranscribing(false);
  }

  // ---- una "presa" di parlato
  async function listenOnce(): Promise<string> {
    // Non aprire il mic mentre l'assistente sta parlando (stop eco)
    while (isTtsSpeaking() && (voiceMode || isRecording || isTranscribing)) {
      await sleep(80);
    }

    const inDialog = dialogActiveRef.current;

    if (supportsNativeSR && SR) {
      return new Promise((resolve) => {
        try {
          const sr = new SR();
          sr.lang = "it-IT";
          sr.interimResults = true;
          sr.maxAlternatives = 1;
          let resolved = false;

          sr.onresult = (e: any) => {
            let interim = "";
            let final = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const res = e.results[i];
              const txt = res[0]?.transcript || "";
              if (res.isFinal) final += txt;
              else interim += txt;
            }
            // ✅ aggiorna live la textarea SOLO nel tap-to-talk (non nel Dialogo)
            if (interim && !inDialog) onTranscriptionToInput(interim);

            if (final && !resolved) {
              resolved = true;
              try { sr.stop?.(); } catch {}
              // chiusura esplicita dello stato di rec per sicurezza
              if (!inDialog) setIsRecording(false);
              resolve(String(final));
            }
          };
          sr.onerror = () => {
            if (!resolved) resolve("");
            // chiudi UI rec
            if (!inDialog) setIsRecording(false);
          };
          sr.onend = () => {
            if (!resolved) resolve("");
            // chiudi UI rec
            if (!inDialog) setIsRecording(false);
          };

          sr.start();
          srRef.current = sr;
          // 🔴 NON mostriamo "registrazione" sul bottone voce quando siamo in Dialogo
          if (!inDialog) setIsRecording(true);
        } catch {
          if (!inDialog) setIsRecording(false);
          resolve("");
        }
      });
    }

    // Fallback server (Whisper): registra ~4s
    return new Promise(async (resolve) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mr = new MediaRecorder(stream, { mimeType: pickMime() });
        chunksRef.current = [];

        mr.ondataavailable = (ev) => { if (ev.data?.size) chunksRef.current.push(ev.data); };
        mr.onstop = async () => {
          // chiudi UI rec SEMPRE
          if (!inDialog) setIsRecording(false);
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
        // 🔴 NON mostriamo "registrazione" sul bottone voce quando siamo in Dialogo
        if (!inDialog) setIsRecording(true);
        setTimeout(() => { try { if (mr.state !== "inactive") mr.stop(); } catch {} }, 4000);
      } catch {
        if (!inDialog) setIsRecording(false);
        resolve("");
      }
    });
  }

  // ---- controlli UI (tap-to-talk)
  function handleVoicePressStart() {
    if (isTranscribing || isRecording) return;
    setVoiceError(null);

    listenOnce().then((t) => {
      if (!t) { setIsRecording(false); return; }
      const txt = normalizeInterrogative(t);
      onTranscriptionToInput(txt);   // qui sì: aggiorniamo textarea
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

  // ---- dialogo vocale
  async function startDialog() {
    if (voiceMode) return;
    // Ferma eventuale TTS in corso e dai un prompt breve
    try { window.speechSynthesis?.cancel?.(); } catch {}
    onSpeak("Dimmi pure.");
    setVoiceMode(true);
    dialogActiveRef.current = true;
    dialogDraftRef.current = "";
    // assicurati che il bottone voice NON risulti in rec
    setIsRecording(false);
  }

  function stopDialog() {
    dialogActiveRef.current = false;
    setVoiceMode(false);
    try { window.speechSynthesis?.cancel?.(); } catch {}
    stopRecorderOrSR();               // chiude mic/recorder e azzera UI rec/transcribing
    setIsRecording(false);            // sicurezza extra
  }

  // Trigger invio: "invia"
  function hasSubmitCue(raw: string) {
    return /\binvia(?:\s+(?:ora|adesso))?\s*[.!?]*$/i.test(raw.trim());
  }
  function stripSubmitCue(raw: string) {
    return raw.replace(/\binvia(?:\s+(?:ora|adesso))?\s*[.!?]*$/i, "").trim();
  }

  function isCmdStop(raw: string)   { return /\bstop\s+dialogo\b/i.test(raw); }
  function isCmdAnnulla(raw: string){ return /\bannulla\b/i.test(raw); }
  function isCmdRipeti(raw: string) { return /\bripeti\b/i.test(raw); }
  function isCmdNuova(raw: string)  { return /\bnuova\s+sessione\b/i.test(raw); }

  async function dialogLoopTick() {
    while (dialogActiveRef.current) {
      // Pausa finché il TTS sta parlando
      while (isTtsSpeaking() && dialogActiveRef.current) {
        await sleep(80);
      }

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
          await onSendDirectly(normalizeInterrogative(toSend)); // invia
          // attesa finché TTS parla, poi riparti
          while (isTtsSpeaking() && dialogActiveRef.current) {
            await sleep(80);
          }
          onSpeak("Dimmi pure.");
        } else {
          onSpeak("Dimmi cosa inviare.");
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
