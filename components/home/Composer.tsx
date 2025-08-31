"use client";
import React, { useRef, useEffect } from "react";

type Voice = {
  isRecording: boolean;
  isTranscribing: boolean;
  error?: string | null;
  onPressStart: () => void;
  onPressEnd: () => void;
  onClick: () => void;
  voiceMode: boolean;
  onToggleDialog: () => void;
  speakerEnabled: boolean;
  onToggleSpeaker: () => void;
  canRepeat: boolean;
  onRepeat: () => void;
  ttsSpeaking: boolean;
};

type Props = {
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  onSend: () => void;
  voice: Voice;
  taRef?: React.RefObject<HTMLTextAreaElement>;
};

export default function Composer({ value, disabled, onChange, onSend, voice, taRef }: Props) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = taRef ?? localRef;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 164;
    el.style.height = Math.min(el.scrollHeight, max) + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [value, ref]);

  return (
    <div className="composer">
      <div className="inputwrap">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Scrivi un messaggio… o usa la voce 🎙️"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
          }}
          disabled={!!disabled || voice.isTranscribing}
        />
      </div>

      <div className="actions">
        <div className="left">
          <button
            className="iconbtn"
            disabled={voice.isTranscribing}
            onMouseDown={voice.onPressStart}
            onMouseUp={voice.onPressEnd}
            onMouseLeave={voice.onPressEnd}
            onTouchStart={voice.onPressStart}
            onTouchEnd={voice.onPressEnd}
            onClick={voice.onClick}
            aria-pressed={voice.isRecording}
          >
            {voice.isRecording ? "🔴 Registrazione…" : "🎙️ Voce"}
          </button>

          <button className="iconbtn" aria-pressed={voice.voiceMode} onClick={voice.onToggleDialog}>
            {voice.voiceMode ? "🛑 Dialogo ON" : "🗣️ Dialogo"}
          </button>

          <button className="iconbtn" onClick={voice.onToggleSpeaker} aria-pressed={voice.speakerEnabled}>
            {voice.speakerEnabled ? "🔊 ON" : "🔈 OFF"}
          </button>

          {voice.canRepeat && (
            <button className="iconbtn" onClick={voice.onRepeat} disabled={voice.ttsSpeaking}>
              {voice.ttsSpeaking ? "🔊 Parlando…" : "🔊 Ripeti"}
            </button>
          )}
        </div>

        <div className="right">
          <button className="btn" onClick={onSend} disabled={!value.trim() || !!disabled}>Invia</button>
        </div>
      </div>

      {(voice.error || voice.isTranscribing) && (
        <div className="voice-status">
          {voice.isTranscribing ? "🎙️ Trascrizione in corso…" : voice.error}
        </div>
      )}
    </div>
  );
}
