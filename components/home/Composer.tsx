"use client";
import React, { useRef, useEffect } from "react";

type Voice = {
  // Stato registrazione/trascrizione
  isRecording: boolean;
  isTranscribing: boolean;
  error?: string | null;

  // Mic (push-to-talk): 1° tap avvia, 2° tap ferma
  onClick: () => void;

  // Dialogo continuo (toggle ON/OFF)
  voiceMode: boolean;           // true = Dialogo ON
  onToggleDialog: () => void;

  // Speaker (voce in uscita)
  speakerEnabled: boolean;
  onToggleSpeaker: () => void;

  // TTS stato/azioni
  ttsSpeaking?: boolean;
  canRepeat: boolean;
  onRepeat: () => void;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  taRef?: React.RefObject<HTMLTextAreaElement>;
  voice: Voice;
};

export default function Composer({ value, onChange, onSend, disabled, taRef, voice }: Props) {

  useEffect(() => {
    console.error("[TRACE] Composer mounted");
  }, []);
  
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = taRef ?? localRef;

  // Invio con Enter (Shift+Enter = a capo)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = (e: KeyboardEvent) => {
      // Shift+Enter → nuova riga
      if (e.key === "Enter" && e.shiftKey) return;

      // Enter semplice → invia
if (e.key === "Enter" && !e.shiftKey) {
  e.preventDefault();
  if (!disabled && value.trim()) {
    console.error("[TRACE] Composer keydown Enter → onSend");
    onSend?.(); // chiama sempre in modo sicuro
  }
  return;
}

      // Cmd/Ctrl+Enter → invia (per chi è abituato)
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!disabled && value.trim()) {
          console.error("[TRACE] Composer Ctrl/Cmd+Enter → onSend");
          onSend?.();
        } else {
          console.error("[TRACE] Composer Ctrl/Cmd+Enter BLOCKED", { disabled, hasText: !!value.trim() });
        }
      }
    };


    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [ref, value, disabled, onSend]);

  // Disabilitazioni di cortesia
  const micDisabled = !!disabled || !!voice.ttsSpeaking || voice.isTranscribing;
  const dialogDisabled = !!disabled || !!voice.ttsSpeaking;

  // In Dialogo ON mostriamo SOLO il bottone "Dialogo ON"
  const showOnlyDialogButton = voice.voiceMode === true;

  return (
    <div className="composer">
      <div className="inputwrap">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Scrivi un messaggio…"
          aria-label="Editor messaggio"
        />
      </div>

      <div className="actions">
        <div className="left">
          {showOnlyDialogButton ? (
            // === Modalità 3) DIALOGO ===
            // Solo il bottone "Dialogo ON" (click → torna OFF e ricompaiono gli altri due in default)
            <button
              type="button"
              className="iconbtn"
              onClick={voice.onToggleDialog}
              aria-pressed={true}
              title="Disattiva dialogo vocale"
            >
              Dialogo On
            </button>
          ) : (
            // === Modalità 1) TESTO e 2) VOCE (PTT) ===
            <>
              {/* 🎙️ Mic (push-to-talk): 1° tap avvia, 2° tap ferma */}
              <button
                type="button"
                className="iconbtn"
                aria-pressed={voice.isRecording}
                aria-label={
                  voice.isRecording
                    ? "Registrazione in corso"
                    : voice.isTranscribing
                    ? "Trascrizione in corso"
                    : "Voce"
                }
                onClick={voice.onClick}
                disabled={micDisabled}
                title={voice.ttsSpeaking ? "Attendi: sta parlando l'assistente" : "Microfono (push-to-talk)"}
              >
                {voice.isRecording ? "registrazione" : voice.isTranscribing ? "trascrivo…" : "Voce"}
              </button>

              {/* 🔈 Speaker on/off (voce in uscita) */}
              <button
                type="button"
                className="iconbtn"
                aria-pressed={voice.speakerEnabled}
                onClick={voice.onToggleSpeaker}
                disabled={!!disabled}
                title="Lettura vocale delle risposte"
              >
                {voice.speakerEnabled ? "🔈 On" : "🔈 Off"}
              </button>

              {/* 🗣️ Dialogo vocale continuo */}
              <button
                type="button"
                className="iconbtn"
                onClick={voice.onToggleDialog}
                disabled={dialogDisabled}
                title="Attiva dialogo vocale"
                aria-pressed={false}
              >
                Dialogo Off
              </button>

              {/* 🔁 Ripeti (se disponibile) */}
              {voice.canRepeat && (
                <button
                  type="button"
                  className="iconbtn"
                  onClick={voice.onRepeat}
                  disabled={!!disabled}
                  title="Rileggi l'ultima risposta"
                >
                  Ripeti
                </button>
              )}
            </>
          )}
        </div>

        <div className="right">
<button
  className="btn"
  onClick={() => {
    if (!value.trim() || !!disabled) {
      console.error("[TRACE] Composer click BLOCKED", { disabled, hasText: !!value.trim() });
      return;
    }
    console.error("[TRACE] Composer click → onSend");
    onSend?.();
  }}
  disabled={!value.trim() || !!disabled}
>
  Invia
</button>

        </div>
      </div>

      {/* ✅ Solo errori (niente "trascrizione in corso…") */}
      {voice.error && (
        <div className="voice-status" role="status" aria-live="polite">
          {voice.error}
        </div>
      )}
    </div>
  );
}
