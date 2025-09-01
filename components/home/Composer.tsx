"use client";
import React, { useRef, useEffect } from "react";

type Voice = {
  isRecording: boolean;
  isTranscribing: boolean;
  error?: string | null;
  onPressStart: () => void;
  onPressEnd: () => void;
  onClick: () => void; // toggle start/stop
  voiceMode: boolean;
  onToggleDialog: () => void;
  speakerEnabled: boolean;
  onToggleSpeaker: () => void;
  canRepeat: boolean;
  onRepeat: () => void;
  ttsSpeaking?: boolean;
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
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = taRef ?? localRef;

  // Invio con Ctrl/Cmd+Enter
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!disabled && value.trim()) onSend();
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [ref, value, disabled, onSend]);

  return (
    <div className="composer">
      <div className="inputwrap">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Scrivi un messaggio…"
        />
      </div>

      <div className="actions">
        <div className="left">
          {/* 🎙️ Toggle: 1° tap avvia, 2° tap ferma. Label: 'registrazione' mentre registra */}
          <button
            type="button"
            className="iconbtn"
            aria-pressed={voice.isRecording}
            aria-label={voice.isRecording ? "Registrazione in corso" : "Voce"}
            onClick={voice.onClick}
            disabled={!!disabled}
          >
            {voice.isRecording ? "registrazione" : "Voce"}
          </button>

          {/* Opzionali: speaker / dialogo / ripeti (invariati) */}
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

          <button
            type="button"
            className="iconbtn"
            onClick={voice.onToggleDialog}
            disabled={!!disabled}
            title="Dialogo vocale"
          >
            {voice.voiceMode ? "Dialogo On" : "Dialogo Off"}
          </button>

          {voice.canRepeat && (
            <button type="button" className="iconbtn" onClick={voice.onRepeat} disabled={!!disabled}>
              Ripeti
            </button>
          )}
        </div>

        <div className="right">
          <button className="btn" onClick={onSend} disabled={!value.trim() || !!disabled}>Invia</button>
        </div>
      </div>

      {/* ✅ niente messaggi “trascrizione in corso…”; mostriamo solo errori, se presenti */}
      {voice.error && (
        <div className="voice-status">{voice.error}</div>
      )}
    </div>
  );
}
