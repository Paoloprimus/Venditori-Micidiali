// components/home/Composer.tsx
"use client";
import React, { useRef, useEffect } from "react";

type Voice = {
  isRecording: boolean;
  isTranscribing: boolean;
  error?: string | null;
  onClick: () => void;
  voiceMode: boolean;
  onToggleDialog: () => void;
  speakerEnabled: boolean;
  onToggleSpeaker: () => void;
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
    console.error("✅ [Composer] Component mounted");
  }, []);

  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = taRef ?? localRef;

  // Invio con Enter
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.shiftKey) return;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && value.trim()) {
          console.error("✅ [Composer] Enter key → calling onSend");
          onSend?.();
        } else {
          console.error("⚠️ [Composer] Enter key BLOCKED", { disabled, hasText: !!value.trim() });
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!disabled && value.trim()) {
          console.error("✅ [Composer] Ctrl/Cmd+Enter → calling onSend");
          onSend?.();
        } else {
          console.error("⚠️ [Composer] Ctrl/Cmd+Enter BLOCKED", { disabled, hasText: !!value.trim() });
        }
      }
    };

    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [ref, value, disabled, onSend]);

  const micDisabled = !!disabled || !!voice.ttsSpeaking || voice.isTranscribing;
  const dialogDisabled = !!disabled || !!voice.ttsSpeaking;
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
            <button
              type="button"
              className="btn"
              onClick={voice.onToggleDialog}
              disabled={dialogDisabled}
              style={{ background: "#10B981" }}
            >
              Dialogo ON
            </button>
          ) : (
            <>
              <button
                type="button"
                className="iconbtn"
                onClick={voice.onClick}
                disabled={micDisabled}
                title={voice.isRecording ? "Ferma registrazione" : "Attiva microfono"}
                style={{
                  background: voice.isRecording ? "#EF4444" : "white",
                  color: voice.isRecording ? "white" : "#64748B",
                }}
              >
                🎤
              </button>

              <button
                type="button"
                className="iconbtn"
                onClick={voice.onToggleDialog}
                disabled={dialogDisabled}
                title="Avvia dialogo continuo"
              >
                💬
              </button>

              <button
                type="button"
                className="iconbtn"
                onClick={voice.onToggleSpeaker}
                title={voice.speakerEnabled ? "Disattiva voce" : "Attiva voce"}
                style={{
                  background: voice.speakerEnabled ? "#3B82F6" : "white",
                  color: voice.speakerEnabled ? "white" : "#64748B",
                }}
              >
                🔊
              </button>

              {voice.canRepeat && (
                <button
                  type="button"
                  className="iconbtn"
                  onClick={voice.onRepeat}
                  disabled={!voice.canRepeat || !!disabled}
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
            type="button"
            className="btn"
            onClick={() => {
              console.error("🔵 [Composer] Button clicked!");
              
              if (!value.trim()) {
                console.error("⚠️ [Composer] BLOCKED: input is empty");
                return;
              }
              
              if (disabled) {
                console.error("⚠️ [Composer] BLOCKED: component is disabled");
                return;
              }
              
              console.error("✅ [Composer] Calling onSend with text:", value.trim());
              onSend?.();
            }}
            disabled={!value.trim() || !!disabled}
          >
            Invia
          </button>
        </div>
      </div>

      {voice.error && (
        <div className="voice-status" role="status" aria-live="polite">
          {voice.error}
        </div>
      )}
    </div>
  );
}
