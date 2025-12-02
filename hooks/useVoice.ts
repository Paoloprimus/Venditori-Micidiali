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

  // === UI state ===
  const [voiceMode, setVoiceMode] = useState(false);      // Dialogo ON/OFF
  const [speakerEnabled, setSpeakerEnabled] = useState(false); // 🔈
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);

  // mirror per gating TTS anche dentro callback asincrone
  const speakerEnabledRef = useRef(speakerEnabled);
  useEffect(() => { speakerEnabledRef.current = speakerEnabled; }, [speakerEnabled]);

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
  const dialogSendingRef = useRef<boolean>(false);
  
  // 🆕 Auto-send dopo pausa: timer per rilevare silenzio
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_SEND_DELAY_MS = 1500; // 1.5 secondi di silenzio → invio automatico

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

            // se dici "stop" o "esci" chiude il dialogo
            if (isStopCommand(txt)) {
              const canSpeak = speakerEnabledRef.current; // ⬅ gate prima dello stop
              stopDialog();                                // spegne dialogo + speaker
              if (canSpeak) onSpeak("Dialogo terminato.");
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

          // 🆕 Cancella timer precedente
          if (autoSendTimerRef.current) {
            clearTimeout(autoSendTimerRef.current);
            autoSendTimerRef.current = null;
          }

          // Cue esplicito "invia" → invio immediato
          if (hasSubmitCue(live)) {
            if (dialogSendingRef.current) return;
            const raw = stripSubmitCue(live).trim();

            if (!raw) {
              if (speakerEnabledRef.current) onSpeak("Ti ascolto.");
              dialogBufRef.current = "";
              finalAccumRef.current = "";
              micActiveRef.current = true;
              return;
            }

            dialogSendingRef.current = true;
            const payload = normalizeInterrogative(raw);
            dialogBufRef.current = "";
            finalAccumRef.current = "";
            micActiveRef.current = false;
            try { sr.stop?.(); } catch {}
            onSendDirectly(payload).catch(() => {});
            return;
          }

          // 🆕 AUTO-SEND: avvia timer per invio automatico dopo pausa
          // Solo se c'è contenuto significativo (almeno 3 parole o 10 caratteri)
          const content = finalAccumRef.current.trim();
          if (content && (content.split(/\s+/).length >= 2 || content.length >= 10)) {
            autoSendTimerRef.current = setTimeout(() => {
              // Verifica che siamo ancora in dialogo e non stiamo già inviando
              if (!dialogMode || dialogSendingRef.current || isTtsSpeaking()) return;
              
              const finalContent = finalAccumRef.current.trim();
              if (!finalContent) return;

              // Evita invii doppi
              dialogSendingRef.current = true;
              const payload = normalizeInterrogative(finalContent);
              
              // Pulizia buffer
              dialogBufRef.current = "";
              finalAccumRef.current = "";
              
              // Pausa mic
              micActiveRef.current = false;
              try { sr.stop?.(); } catch {}
              
              console.log('[Voice] Auto-send dopo pausa:', payload);
              onSendDirectly(payload).catch(() => {});
            }, AUTO_SEND_DELAY_MS);
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

  // ======= Toggle a TAP (PTT) =======
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
    // ⬇️ attiva modalità dialogo + speaker auto ON
    setDialogMode(true);
    dialogBufRef.current = "";
    dialogSendingRef.current = false;
    setVoiceMode(true);
    setVoiceError(null);
    setSpeakerEnabled(true);           // ✅ SPEAKER AUTO ON in Dialogo
    finalAccumRef.current = "";
    micActiveRef.current = true;

    if (supportsNativeSR) startNativeSR();
    else startFallbackRecorder();

    // feedback iniziale solo se lo speaker è attivo
    if (speakerEnabledRef.current || true) {
      // dopo setSpeakerEnabled, l'effetto aggiorna speakerEnabledRef in coda al tick;
      // qui siamo comunque in Dialogo (speaker ON) → ok dare un breve prompt
      // 🆕 Messaggio aggiornato: non serve più dire "invia"
      onSpeak("Dialogo attivo. Parla normalmente, invio automatico dopo la pausa.");
    }
  }

  function stopDialog() {
    setDialogMode(false);
    setVoiceMode(false);
    dialogBufRef.current = "";
    dialogSendingRef.current = false;
    micActiveRef.current = false;
    
    // 🆕 Cancella timer auto-send
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
    
    stopAll();
    setSpeakerEnabled(false);          // ✅ ritorno a OFF/ OFF quando esco dal Dialogo
  }

  // Cleanup su unmount
  useEffect(() => {
    return () => {
      micActiveRef.current = false;
      stopAll();
      // 🆕 Cancella timer auto-send
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    };
  }, []);

  // ===== Pausa mentre parla il TTS e riavvio pulito =====
  const wasPlayingTTSRef = useRef(false);
  const micReadyFeedbackGivenRef = useRef(false);
  
  useEffect(() => {
    const id = setInterval(() => {
      if (!dialogMode) return;
      
      const ttsPlaying = isTtsSpeaking();
      
      if (ttsPlaying) {
        // TTS sta parlando → pausa mic
        if (srRef.current) { try { srRef.current.stop?.(); } catch {} srRef.current = null; }
        micActiveRef.current = false;
        setIsRecording(false);
        wasPlayingTTSRef.current = true;
        micReadyFeedbackGivenRef.current = false;
      } else if (!isRecording && dialogMode && !srRef.current && !mrRef.current) {
        // TTS ha finito → riavvia mic
        dialogSendingRef.current = false;
        finalAccumRef.current = "";
        dialogBufRef.current = "";
        micActiveRef.current = true;
        
        // 🆕 Feedback audio quando mic si riattiva dopo risposta
        if (wasPlayingTTSRef.current && !micReadyFeedbackGivenRef.current) {
          micReadyFeedbackGivenRef.current = true;
          wasPlayingTTSRef.current = false;
          // Breve delay per non sovrapporre alla fine del TTS
          setTimeout(() => {
            if (dialogMode && speakerEnabledRef.current) {
              // Beep o breve feedback - usiamo Web Audio API per un tono
              playReadyBeep();
            }
          }, 200);
        }
        
        if (supportsNativeSR) startNativeSR();
        else startFallbackRecorder();
      }
    }, 150);
    return () => clearInterval(id);
  }, [dialogMode, supportsNativeSR, isRecording, isTtsSpeaking]);

  // 🆕 Beep audio per indicare che il mic è pronto
  function playReadyBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = 880; // La nota (A5)
      osc.type = 'sine';
      gain.gain.value = 0.1; // Volume basso
      
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.stop(ctx.currentTime + 0.15);
      
      // Cleanup
      setTimeout(() => ctx.close(), 200);
    } catch {
      // Fallback: niente beep se Web Audio non supportato
    }
  }

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
