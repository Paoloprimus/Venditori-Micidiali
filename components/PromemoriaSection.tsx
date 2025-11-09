// components/PromemoriaSection.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  fetchPromemoria,
  createPromemoria,
  updatePromemoria,
  deletePromemoria,
  type Promemoria,
  type PromemoriaInput,
} from '@/lib/promemoria';
import PromemoriaList from './PromemoriaList';
import PromemoriaForm from './PromemoriaForm';

export default function PromemoriaSection() {
  const [promemoria, setPromemoria] = useState<Promemoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stato form
  const [showForm, setShowForm] = useState(false);
  const [editingPromemoria, setEditingPromemoria] = useState<Promemoria | undefined>(undefined);

  // Carica promemoria al mount
  useEffect(() => {
    loadPromemoria();
  }, []);

  async function loadPromemoria() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPromemoria();
      setPromemoria(data);
    } catch (e: any) {
      console.error('[PromemoriaSection] Errore caricamento:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Apri form per nuovo promemoria
  function handleNew() {
    setEditingPromemoria(undefined);
    setShowForm(true);
  }

  // Apri form per modifica
  function handleEdit(p: Promemoria) {
    setEditingPromemoria(p);
    setShowForm(true);
  }

  // Salva (nuovo o modifica)
  async function handleSave(input: PromemoriaInput) {
    if (editingPromemoria) {
      // Modifica esistente
      const updated = await updatePromemoria(editingPromemoria.id, input);
      setPromemoria(prev => prev.map(p => p.id === updated.id ? updated : p));
    } else {
      // Nuovo
      const created = await createPromemoria(input);
      setPromemoria(prev => [...prev, created]);
    }
    
    setShowForm(false);
    setEditingPromemoria(undefined);
    
    // Ricarica per avere ordine corretto
    await loadPromemoria();
  }

  // Elimina
  async function handleDelete(id: string) {
    try {
      await deletePromemoria(id);
      setPromemoria(prev => prev.filter(p => p.id !== id));
      alert('✅ Promemoria eliminato');
    } catch (e: any) {
      console.error('[PromemoriaSection] Errore eliminazione:', e);
      alert(`Errore: ${e.message}`);
    }
  }

  // Chiudi form
  function handleCancelForm() {
    setShowForm(false);
    setEditingPromemoria(undefined);
  }

  return (
    <>
      {/* Bottone Nuovo */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={handleNew}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#2563eb',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          ➕ Nuovo Promemoria
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>
          ⏳ Caricamento...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: 16,
          background: '#fee2e2',
          borderRadius: 8,
          color: '#991b1b',
          fontSize: 13,
        }}>
          ❌ Errore: {error}
        </div>
      )}

      {/* Lista */}
      {!loading && !error && (
        <PromemoriaList
          promemoria={promemoria}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Form (modale full-screen) */}
      {showForm && (
        <PromemoriaForm
          promemoria={editingPromemoria}
          onSave={handleSave}
          onCancel={handleCancelForm}
        />
      )}
    </>
  );
}
