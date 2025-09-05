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
  preferServerSTT?: boolean;
  isTtsSpeaking?: () => boolean;
};

export function useVoice({
  onTranscriptionToInput,
  onSendDirectly,
  onSpeak,
  createNewSession,
  autoTitleRome,
  preferServerSTT = false,
  isTtsSpeaking = () => false,
}: Params) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

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

  const srRef = useRef<any>(null);
  const micActiveRef = useRef(false);
  const finalAccumRef = useRef<string>("");

  // ======= MediaRecorder fallback (niente live) =======
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingStopResolveRef = useRef<(() => void) | null>(null);

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

  function isStopCommand(t: string) {
    const s = (t || "").trim().toLowerCase();
    return s === "stop" || s === "esci";
  }

  
  function hasSubmitCue(raw: string) {
    return /\binvia(?:\s+(?:ora|adesso))?\s*[.!?]*$/i.test((raw || "").trim());
  }
  function stripSubmitCue(raw: string) {
    return (raw || "").replace(/\binvia(?:\s+(?:ora|adesso))?\s*[.!?]*$/i, "").trim();
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

  function stopAll() {
    if (srRef.current) {
      try { srRef.current.onresult = null; } catch {}
      try { srRef.current.onend = null; } catch {}
      try { srRef.current.onerror = null; } catch {}
      try { srRef.current.stop?.(); } catch {}
      srRef.current = null;
    }
    if (mrRef.current && mrRef.current.state !== "inactive") {
      try { mrRef.current.stop(); } catch {}
    }
    try { streamRef.current?.getTracks()?.forEach((t) => t.stop()); } catch {}
    streamRef.current = null;

    setIsRecording(false);
  }

  // ===== Dialogo: stato, buffer e lock anti-doppio invio =====
  const [dialogMode, setDialogMode] = useState(false);
  const dialogBufRef = useRef<string>("");
  const dialogSendingRef = useRef<boolean>(false); // ⬅️ blocca invio multiplo sullo stesso "invia"

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
            
              // ⬇️ nuovo: se dici "stop" o "esci" chiude il dialogo
            if (isStopCommand(txt)) {
              stopDialog();           // chiude la modalità dialogo
              onSpeak("Dialogo terminato."); // feedback vocale opzionale
              return;
            }

            
            finalAccumRef.current = (finalAccumRef.current + " " + txt).trim();
          } else {
            interim += txt;
          }
        }
        const live = (finalAccumRef.current + " " + interim).trim();

        // Se il TTS sta parlando, in Dialogo ignoriamo risultati
        if (dialogMode && isTtsSpeaking()) return;

        if (dialogMode) {
          // In Dialogo: NO scrittura live nella textarea
          dialogBufRef.current = live;

          // Cue "invia"
          if (hasSubmitCue(live)) {
            // evita invii doppi
            if (dialogSendingRef.current) return;
            const raw = stripSubmitCue(live).trim();

            if (!raw) {
              onSpeak("Dimmi il messaggio e poi dì 'invia'.");
              dialogBufRef.current = "";
              finalAccumRef.current = "";
              micActiveRef.current = true;
              return;
            }

            dialogSendingRef.current = true; // 🔒 lock durante l'invio
            const payload = normalizeInterrogative(raw);

            // pulizia buffer
            dialogBufRef.current = "";
            finalAccumRef.current = "";

            // pausa mic mentre parte la risposta
            micActiveRef.current = false;
            try { sr.stop?.(); } catch {}

            onSendDirectly(payload).catch(() => {});
          }
        } else {
          // Tap-to-talk: live nella textarea
          onTranscriptionToInput(live);
        }
      };

      sr.onerror = () => {
        if (micActiveRef.current) {
          try { sr.stop?.(); } catch {}
          srRef.current = null;
          // 🔁 al riavvio azzera i buffer per evitare carry-over
          finalAccumRef.current = "";
          dialogBufRef.current = "";
          setTimeout(startNativeSR, 180);
        }
      };

      sr.onend = () => {
        if (micActiveRef.current) {
          srRef.current = null;
          // 🔁 al riavvio azzera i buffer
          finalAccumRef.current = "";
          dialogBufRef.current = "";
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
          if (pendingStopResolveRef.current) {
            pendingStopResolveRef.current();
            pendingStopResolveRef.current = null;
          }
        }
      };

      mr.start();
    } catch (e: any) {
      setVoiceError(e?.message || "Impossibile accedere al microfono");
      setIsRecording(false);
      micActiveRef.current = false;
    }
  }

  // ======= STOP MIC pubblico =======
  async function stopMic(): Promise<void> {
    micActiveRef.current = false;

    if (supportsNativeSR) {
      stopAll();
      const finalTxt = normalizeInterrogative(finalAccumRef.current).trim();
      onTranscriptionToInput(finalTxt);
      setLastInputWasVoice(true);
      return;
    }

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

    stopAll();
  }

  // ======= Toggle a TAP =======
  async function handleVoiceClick() {
    if (!isRecording && !micActiveRef.current) {
      setVoiceError(null);
      finalAccumRef.current = "";
      dialogBufRef.current = "";
      micActiveRef.current = true;

      if (supportsNativeSR) startNativeSR();
      else startFallbackRecorder();
      return;
    }
    await stopMic();
  }

  function handleVoicePressStart() { /* no-op */ }
  function handleVoicePressEnd()   { /* no-op */ }

  // ======= Dialogo: attiva/disattiva =======
  async function startDialog() {
    setDialogMode(true);
    dialogBufRef.current = "";
    dialogSendingRef.current = false;
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
    dialogSendingRef.current = false;
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

  // ===== Pausa mentre parla il TTS e riavvio pulito =====
  useEffect(() => {
    const id = setInterval(() => {
      if (!dialogMode) return;
      if (isTtsSpeaking()) {
        if (srRef.current) { try { srRef.current.stop?.(); } catch {} srRef.current = null; }
        micActiveRef.current = false;
        setIsRecording(false);
      } else if (!isRecording && dialogMode && !srRef.current && !mrRef.current) {
        // 🔄 ripartenza DOPO il TTS: reset completo per evitare duplicazioni
        dialogSendingRef.current = false;
        finalAccumRef.current = "";
        dialogBufRef.current = "";
        micActiveRef.current = true;
        if (supportsNativeSR) startNativeSR();
        else startFallbackRecorder();
      }
    }, 150);
    return () => clearInterval(id);
  }, [dialogMode, supportsNativeSR, isRecording]);

  return {
    isRecording, isTranscribing, voiceError,
    voiceMode, setVoiceMode,
    speakerEnabled, setSpeakerEnabled,
    lastInputWasVoice, setLastInputWasVoice,

    handleVoicePressStart,
    handleVoicePressEnd,
    handleVoiceClick,
    startDialog,
    stopDialog,
    stopMic,
  };
}
