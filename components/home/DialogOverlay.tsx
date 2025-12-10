/**
 * ============================================================================
 * 🎙️ DIALOG OVERLAY - UI Takeover per modalità hands-free
 * ============================================================================
 * Si sovrappone alla chat quando la modalità Dialogo è attiva.
 * Mostra gli ultimi messaggi + indicatore vocale.
 * ============================================================================
 */

'use client';

import { useEffect, useState, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DialogOverlayProps {
  active: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  messages: Message[];
  onClose: () => void;
}

export default function DialogOverlay({
  active,
  isListening,
  isSpeaking,
  transcript,
  messages,
  onClose,
}: DialogOverlayProps) {
  const [visible, setVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Animazione entrata/uscita
  useEffect(() => {
    if (active) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [active]);

  // Auto-scroll ai nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!visible && !active) return null;

  // Prendi gli ultimi 10 messaggi
  const recentMessages = messages.slice(-10);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        opacity: active ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Header con close button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 600 }}>
          🎙️ Dialogo
        </div>
        <button
          onClick={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {/* Chat messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {recentMessages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            {msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom area: indicator + transcript */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* Transcript in corso */}
        {transcript && (
          <div
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(59, 130, 246, 0.2)',
              borderRadius: 12,
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <p style={{
              color: 'white',
              fontSize: 16,
              textAlign: 'center',
              margin: 0,
              fontStyle: 'italic',
            }}>
              {transcript}
            </p>
          </div>
        )}

        {/* Indicator */}
        <div
          style={{
            width: 80,
            height: 80,
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
              ? `0 0 30px ${isSpeaking ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`
              : 'none',
            transition: 'all 0.3s ease',
            animation: isListening ? 'pulse 2s infinite' : 'none',
          }}
        >
          <span style={{ fontSize: 36 }}>
            {isSpeaking ? '🔊' : '🎤'}
          </span>
        </div>

        {/* Hint */}
        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
        }}>
          💡 Dì "basta" per uscire
        </div>
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
