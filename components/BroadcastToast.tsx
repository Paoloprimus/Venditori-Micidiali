// components/BroadcastToast.tsx
"use client";

import { useEffect, useState } from 'react';
import { useBroadcastMessages } from '@/hooks/useBroadcastMessages';

export default function BroadcastToast() {
  const { currentMessage, remainingCount, markAsRead } = useBroadcastMessages();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (currentMessage) {
      // Mostra toast con animazione
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [currentMessage]);

  const handleClose = () => {
    if (currentMessage) {
      setVisible(false);
      // Aspetta animazione fade-out
      setTimeout(() => {
        markAsRead(currentMessage.id);
      }, 300);
    }
  };

  if (!currentMessage) return null;

  const typeColors = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', progress: '#3b82f6' },
    success: { bg: '#f0fdf4', border: '#10b981', text: '#047857', progress: '#10b981' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', progress: '#f59e0b' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', progress: '#ef4444' },
  };

  const typeIcons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  const colors = typeColors[currentMessage.type];
  const icon = typeIcons[currentMessage.type];

  return (
    <div
      style={{
        position: 'fixed',
        top: visible ? 80 : -200,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        width: '90%',
        maxWidth: 500,
        transition: 'top 0.3s ease-out, opacity 0.3s',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        style={{
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: 16,
          padding: '16px 20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <span style={{ fontSize: 24 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: 15, 
                fontWeight: 700, 
                color: colors.text,
                marginBottom: 4,
              }}>
                {currentMessage.title}
              </div>
              <div style={{ 
                fontSize: 13, 
                color: colors.text,
                opacity: 0.9,
                lineHeight: 1.4,
              }}>
                {currentMessage.message}
              </div>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'rgba(0,0,0,0.1)',
              color: colors.text,
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 12,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Badge "altri messaggi" */}
        {remainingCount > 1 && (
          <div style={{
            marginTop: 8,
            fontSize: 11,
            color: colors.text,
            opacity: 0.7,
            fontWeight: 600,
          }}>
            📬 +{remainingCount - 1} {remainingCount - 1 === 1 ? 'altro messaggio' : 'altri messaggi'}
          </div>
        )}
      </div>
    </div>
  );
}

