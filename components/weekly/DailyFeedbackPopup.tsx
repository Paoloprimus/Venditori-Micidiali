/**
 * ============================================================================
 * 📊 FEEDBACK GIORNALIERO - Popup leggero a fine giornata
 * ============================================================================
 * Appare dopo le 18:00 se l'utente ha usato l'app oggi
 * ============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { saveWeeklyFeedback, type FeedbackScore, FEEDBACK_EMOJI } from '@/lib/weekly';

export default function DailyFeedbackPopup() {
  const [show, setShow] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // Controlla preferenze
    const saved = localStorage.getItem('weekly_summary_visible');
    if (saved === 'false') {
      setEnabled(false);
      return;
    }

    // Ascolta cambiamenti preferenze
    const handleVisibilityChange = (e: CustomEvent) => {
      setEnabled(e.detail.enabled);
      if (!e.detail.enabled) setShow(false);
    };
    window.addEventListener('repping:weeklySummaryVisibilityChanged', handleVisibilityChange as EventListener);

    // Controlla se mostrare il popup
    checkIfShouldShow();

    return () => {
      window.removeEventListener('repping:weeklySummaryVisibilityChanged', handleVisibilityChange as EventListener);
    };
  }, []);

  const checkIfShouldShow = async () => {
    // Mostra solo dopo le 18:00
    const hour = new Date().getHours();
    if (hour < 18) return;

    // Controlla se ha già dato feedback oggi
    const todayKey = `feedback_${new Date().toISOString().split('T')[0]}`;
    const alreadyGiven = localStorage.getItem(todayKey);
    if (alreadyGiven) return;

    // Controlla se ha usato l'app oggi (almeno 1 messaggio)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', today.toISOString());

    // Mostra solo se ha usato l'app oggi
    if ((count ?? 0) > 0) {
      setShow(true);
    }
  };

  const handleFeedback = async (score: FeedbackScore) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await saveWeeklyFeedback(user.id, score);
    
    // Segna come dato per oggi
    const todayKey = `feedback_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(todayKey, 'true');
    
    setFeedbackGiven(true);
    
    // Chiudi dopo 2 secondi
    setTimeout(() => setShow(false), 2000);
  };

  const handleDismiss = () => {
    // Segna come chiuso per oggi
    const todayKey = `feedback_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(todayKey, 'dismissed');
    setShow(false);
  };

  if (!enabled || !show) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: 80, // Sopra la navbar
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      
      <div 
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          borderRadius: 16,
          padding: '16px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          maxWidth: 320,
          textAlign: 'center',
        }}
      >
        {!feedbackGiven ? (
          <>
            {/* Close button */}
            <button
              onClick={handleDismiss}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 18,
                cursor: 'pointer',
                padding: 4,
              }}
            >
              ×
            </button>

            <p style={{ color: 'white', fontSize: 15, marginBottom: 12, fontWeight: 500 }}>
              Oggi Repit ha pilotato con te.<br/>
              Come l'hai trovato?
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              {([-1, 0, 1] as FeedbackScore[]).map(score => (
                <button
                  key={score}
                  onClick={() => handleFeedback(score)}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    fontSize: 28,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {FEEDBACK_EMOJI[score]}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ color: 'white', fontSize: 15 }}>
            <span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>🙏</span>
            Grazie per il feedback!
          </div>
        )}
      </div>
    </div>
  );
}

