/**
 * ============================================================================
 * 🎙️ DIALOG OVERLAY - UI Takeover per modalità hands-free
 * ============================================================================
 * Si sovrappone alla chat quando la modalità Dialogo è attiva.
 * Sfondo scuro, indicatore centrale, transcript live.
 * ============================================================================
 */

'use client';

import { useEffect, useState } from 'react';

interface DialogOverlayProps {
  active: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  onClose: () => void;
}

export default function DialogOverlay({
  active,
  isListening,
  isSpeaking,
  transcript,
  onClose,
}: DialogOverlayProps) {
  const [visible, setVisible] = useState(false);

  // Animazione entrata/uscita
  useEffect(() => {
    if (active) {
      setVisible(true);
    } else {
      // Delay per animazione uscita
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!visible && !active) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
        opacity: active ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.1)',
          color: 'white',
          fontSize: 24,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>

      {/* Main indicator */}
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: isSpeaking
            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
            : isListening
            ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
            : 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isListening || isSpeaking
            ? `0 0 60px ${isSpeaking ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`
            : 'none',
          transition: 'all 0.3s ease',
          animation: isListening ? 'pulse 2s infinite' : 'none',
        }}
      >
        <span style={{ fontSize: 72 }}>
          {isSpeaking ? '🔊' : '🎤'}
        </span>
      </div>

      {/* Transcript */}
      {transcript && (
        <div
          style={{
            maxWidth: '90%',
            padding: '16px 24px',
            background: 'rgba(59, 130, 246, 0.2)',
            borderRadius: 16,
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          <p
            style={{
              color: 'white',
              fontSize: 18,
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            "{transcript}"
          </p>
        </div>
      )}

      {/* Hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          fontSize: 14,
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
        }}
      >
        💡 Dì "basta" o tocca ✕ per uscire
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

