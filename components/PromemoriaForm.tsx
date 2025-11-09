// components/PromemoriaForm.tsx
'use client';

import { useState } from 'react';
import type { Promemoria, PromemoriaInput } from '@/lib/promemoria';

type Props = {
  promemoria?: Promemoria; // Se presente = modifica, altrimenti = nuovo
  onSave: (input: PromemoriaInput) => Promise<void>;
  onCancel: () => void;
};

export default function PromemoriaForm({ promemoria, onSave, onCancel }: Props) {
  const [nota, setNota] = useState(promemoria?.nota || '');
  const [urgente, setUrgente] = useState(promemoria?.urgente || false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nota.trim()) {
      alert('Inserisci una nota');
      return;
    }

    setSaving(true);
    try {
      await onSave({ nota: nota.trim(), urgente });
    } catch (e: any) {
      console.error('[PromemoriaForm] Errore salvataggio:', e);
      alert(`Errore: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'white',
      zIndex: 10000,
      overflow: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: 16,
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: 'white',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 16,
            opacity: saving ? 0.5 : 1,
          }}
        >
          ‹
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          {promemoria ? 'Modifica Promemoria' : 'Nuovo Promemoria'}
        </h2>
      </div>

      {/* Form */}
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        
        {/* Campo Nota */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
            Nota
          </label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Es: Chiamare cliente Da Mario per confermare ordine vini..."
            disabled={saving}
            rows={6}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              border: '2px solid #d1d5db',
              fontSize: 16,
              fontFamily: 'inherit',
              resize: 'vertical',
              opacity: saving ? 0.5 : 1,
            }}
          />
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
            Scrivi cosa devi ricordare. L'AI potrà leggerlo per suggerimenti contestuali.
          </div>
        </div>

        {/* Toggle Urgente */}
        <div style={{ marginBottom: 32 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: saving ? 'not-allowed' : 'pointer',
            padding: 12,
            borderRadius: 8,
            background: urgente ? '#fee2e2' : '#f9fafb',
            border: urgente ? '2px solid #ef4444' : '2px solid #e5e7eb',
            transition: 'all 0.15s',
          }}>
            <input
              type="checkbox"
              checked={urgente}
              onChange={(e) => setUrgente(e.target.checked)}
              disabled={saving}
              style={{
                width: 20,
                height: 20,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: urgente ? '#991b1b' : '#374151' }}>
                {urgente ? '🔴 Urgente' : '⚪ Normale'}
              </div>
              <div style={{ fontSize: 12, color: urgente ? '#991b1b' : '#6b7280', marginTop: 2 }}>
                {urgente 
                  ? 'Apparirà in rosso e sarà mostrato per primo'
                  : 'Apparirà in bianco con priorità normale'
                }
              </div>
            </div>
          </label>
        </div>

        {/* Bottoni */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 16,
              fontWeight: 600,
              opacity: saving ? 0.5 : 1,
            }}
          >
            Annulla
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !nota.trim()}
            style={{
              flex: 2,
              padding: '14px',
              borderRadius: 8,
              border: 'none',
              background: (saving || !nota.trim()) ? '#9ca3af' : '#2563eb',
              color: 'white',
              cursor: (saving || !nota.trim()) ? 'not-allowed' : 'pointer',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {saving ? '⏳ Salvataggio...' : '💾 Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}
