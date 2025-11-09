// components/PromemoriaList.tsx
'use client';

import { useState } from 'react';
import type { Promemoria } from '@/lib/promemoria';

type Props = {
  promemoria: Promemoria[];
  onEdit: (p: Promemoria) => void;
  onDelete: (id: string) => void;
};

export default function PromemoriaList({ promemoria, onEdit, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  function handleDelete(id: string, nota: string) {
    const preview = nota.length > 50 ? nota.substring(0, 50) + '...' : nota;
    if (confirm(`Eliminare questo promemoria?\n\n"${preview}"`)) {
      onDelete(id);
    }
  }

  // Raggruppa per urgenza
  const urgenti = promemoria.filter(p => p.urgente);
  const normali = promemoria.filter(p => !p.urgente);

  if (promemoria.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📝</div>
        <div style={{ color: '#6b7280', fontSize: 14 }}>
          Nessun promemoria ancora.
        </div>
        <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>
          Clicca "➕ Nuovo Promemoria" per iniziare.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* Gruppo URGENTI */}
      {urgenti.length > 0 && (
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#991b1b',
            marginBottom: 8,
            paddingBottom: 8,
            borderBottom: '2px solid #fee2e2',
          }}>
            🔴 URGENTI ({urgenti.length})
          </div>
          
          {urgenti.map(p => (
            <PromemoriaItem
              key={p.id}
              promemoria={p}
              expanded={expandedId === p.id}
              onToggle={() => toggleExpand(p.id)}
              onEdit={() => onEdit(p)}
              onDelete={() => handleDelete(p.id, p.nota)}
            />
          ))}
        </div>
      )}

      {/* Gruppo NORMALI */}
      {normali.length > 0 && (
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 8,
            paddingBottom: 8,
            borderBottom: '2px solid #e5e7eb',
          }}>
            ⚪ NORMALI ({normali.length})
          </div>
          
          {normali.map(p => (
            <PromemoriaItem
              key={p.id}
              promemoria={p}
              expanded={expandedId === p.id}
              onToggle={() => toggleExpand(p.id)}
              onEdit={() => onEdit(p)}
              onDelete={() => handleDelete(p.id, p.nota)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Singolo Item con expand inline
// ============================================================================

function PromemoriaItem({
  promemoria,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  promemoria: Promemoria;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { nota, urgente, created_at } = promemoria;
  
  // Anteprima nota (primi 60 caratteri)
  const preview = nota.length > 60 ? nota.substring(0, 60) + '...' : nota;
  
  // Formatta data
  const dataStr = new Date(created_at).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      style={{
        padding: 12,
        background: urgente ? '#fef2f2' : '#f9fafb',
        borderRadius: 8,
        border: urgente ? '1px solid #fecaca' : '1px solid #e5e7eb',
        marginBottom: 8,
      }}
    >
      {/* Header cliccabile */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <div style={{ fontSize: 18 }}>{expanded ? '▼' : '▶'}</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 500,
            color: urgente ? '#991b1b' : '#111827',
          }}>
            {expanded ? nota : preview}
          </div>
        </div>
      </div>

      {/* Dettagli expanded */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
            <div>
              {urgente ? '🔴 Urgente' : '⚪ Normale'} • Creato: {dataStr}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #2563eb',
                background: 'white',
                color: '#2563eb',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✏️ Modifica
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ef4444',
                background: 'white',
                color: '#ef4444',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🗑️ Elimina
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
