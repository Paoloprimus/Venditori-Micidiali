// components/home/PromemoriaWidget.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchPromemoriaForWidget, type Promemoria } from '@/lib/promemoria';

type Props = {
  onOpenDrawer?: () => void; // Callback per aprire drawer Documenti
};

export default function PromemoriaWidget({ onOpenDrawer }: Props) {
  const [promemoria, setPromemoria] = useState<Promemoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromemoria();
    
    // Listener per aggiornamenti da drawer
    const handleUpdate = () => {
      console.log('[PromemoriaWidget] Evento ricevuto, ricarico...');
      loadPromemoria();
    };
    
    window.addEventListener('promemoria-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('promemoria-updated', handleUpdate);
    };
  }, []);

  async function loadPromemoria() {
    setLoading(true);
    try {
      const data = await fetchPromemoriaForWidget();
      setPromemoria(data);
    } catch (e) {
      console.error('[PromemoriaWidget] Errore:', e);
      setPromemoria([]);
    } finally {
      setLoading(false);
    }
  }

  // Se loading, mostra frase originale
  if (loading) {
    return (
      <div className="helper">
        Nessun messaggio ancora. Scrivi qui sotto per iniziare.
      </div>
    );
  }

  // Se nessun promemoria, mostra "Nessun promemoria [➕]" + helper chat
  if (promemoria.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 16px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 8,
          marginBottom: 16 
        }}>
          <span style={{ color: '#6b7280', fontSize: 14 }}>
            Nessun promemoria
          </span>
          <button
            onClick={onOpenDrawer}
            title="Crea promemoria"
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ➕
          </button>
        </div>
        
        <div className="helper">
          Nessun messaggio ancora. Scrivi qui sotto per iniziare.
        </div>
      </div>
    );
  }

  // Mostra widget con promemoria
  return (
    <div style={{
      maxWidth: 600,
      margin: '0 auto',
      padding: '24px 16px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#111827',
        }}>
          📌 Promemoria
        </div>
        <button
          onClick={onOpenDrawer}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: 'white',
            color: '#6b7280',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Vedi tutti →
        </button>
      </div>

      {/* Lista promemoria (max 3) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {promemoria.map(p => (
          <div
            key={p.id}
            style={{
              padding: 12,
              background: p.urgente ? '#fef2f2' : '#f9fafb',
              borderRadius: 8,
              border: p.urgente ? '1px solid #fecaca' : '1px solid #e5e7eb',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}>
              <div style={{ fontSize: 16, marginTop: 2 }}>
                {p.urgente ? '🔴' : '⚪'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 14,
                  color: p.urgente ? '#991b1b' : '#374151',
                  lineHeight: 1.4,
                }}>
                  {p.nota}
                </div>
                <div style={{
                  fontSize: 11,
                  color: p.urgente ? '#dc2626' : '#6b7280',
                  marginTop: 4,
                }}>
                  {new Date(p.created_at).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 16,
        padding: '12px 16px',
        background: '#f9fafb',
        borderRadius: 8,
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
      }}>
        Scrivi qui sotto per iniziare a chattare con l'AI
      </div>
    </div>
  );
}
