// components/ReportVisiteForm.tsx
'use client';

import { useState, useEffect } from 'react';

type PeriodoType = 'giorno' | 'settimana' | 'personalizzato';

type FormData = {
  periodoType: PeriodoType;
  dataInizio: string;
  dataFine: string;
};

type Props = {
  onBack: () => void;
  onGenerate: (data: FormData) => void;
};

export default function ReportVisiteForm({ onBack, onGenerate }: Props) {
  const [formData, setFormData] = useState<FormData>(() => {
    const oggi = new Date().toISOString().split('T')[0];
    return {
      periodoType: 'giorno',
      dataInizio: oggi,
      dataFine: oggi,
    };
  });

  const [preview, setPreview] = useState<{
    loading: boolean;
    numVisite: number | null;
    fatturatoStimato: number | null;
  }>({
    loading: false,
    numVisite: null,
    fatturatoStimato: null,
  });

  const [generating, setGenerating] = useState(false);

  // Aggiorna automaticamente dataFine quando cambia periodoType o dataInizio
  useEffect(() => {
    if (formData.periodoType === 'giorno') {
      setFormData(prev => ({ ...prev, dataFine: prev.dataInizio }));
    } else if (formData.periodoType === 'settimana') {
      const inizio = new Date(formData.dataInizio);
      const fine = new Date(inizio);
      fine.setDate(fine.getDate() + 6); // +6 giorni = 7 giorni totali
      setFormData(prev => ({ ...prev, dataFine: fine.toISOString().split('T')[0] }));
    }
    // Per 'personalizzato' non facciamo nulla, l'utente sceglie entrambe le date
  }, [formData.periodoType, formData.dataInizio]);

  // Carica anteprima quando cambiano le date
  useEffect(() => {
    loadPreview();
  }, [formData.dataInizio, formData.dataFine]);

  async function loadPreview() {
    setPreview({ loading: true, numVisite: null, fatturatoStimato: null });

    try {
      const response = await fetch('/api/visits/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataInizio: formData.dataInizio,
          dataFine: formData.dataFine,
        }),
      });

      if (!response.ok) throw new Error('Errore caricamento preview');

      const data = await response.json();
      setPreview({
        loading: false,
        numVisite: data.numVisite || 0,
        fatturatoStimato: data.fatturatoTotale || 0,
      });
    } catch (error) {
      console.error('[Preview] Errore:', error);
      setPreview({ loading: false, numVisite: 0, fatturatoStimato: 0 });
    }
  }

  function handlePeriodoChange(tipo: PeriodoType) {
    setFormData(prev => ({ ...prev, periodoType: tipo }));
  }

  function handleDataInizioChange(data: string) {
    setFormData(prev => ({ ...prev, dataInizio: data }));
  }

  function handleDataFineChange(data: string) {
    setFormData(prev => ({ ...prev, dataFine: data }));
  }

  async function handleGenerate() {
    if (!formData.dataInizio || !formData.dataFine) {
      alert('Seleziona un periodo valido');
      return;
    }

    if (preview.numVisite === 0) {
      alert('Nessuna visita trovata nel periodo selezionato');
      return;
    }

    setGenerating(true);
    await onGenerate(formData);
    setGenerating(false);
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* SEZIONE PERIODO */}
      <div style={{ padding: 16, borderRadius: 8, border: '1px solid #374151', background: '#1F2937' }}>
        <h3 style={{ color: '#F9FAFB', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          Seleziona Periodo
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {(['giorno', 'settimana', 'personalizzato'] as PeriodoType[]).map(tipo => (
            <button
              key={tipo}
              type="button"
              onClick={() => handlePeriodoChange(tipo)}
              style={{
                padding: '8px 16px',
                borderRadius: 4,
                background: formData.periodoType === tipo ? '#1C3FAA' : '#374151',
                color: 'white',
                fontWeight: formData.periodoType === tipo ? 600 : 400,
                fontSize: 14,
                cursor: 'pointer',
                border: 'none',
                transition: 'background 0.2s',
                textTransform: 'capitalize',
              }}
            >
              {tipo === 'giorno' ? '📅 Giorno' : tipo === 'settimana' ? '📆 Settimana' : '🗓️ Personalizzato'}
            </button>
          ))}
        </div>

        {/* Campi data */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: '#C9D1E7', fontSize: 12, marginBottom: 4 }}>
              Data Inizio
            </label>
            <input
              type="date"
              value={formData.dataInizio}
              onChange={e => handleDataInizioChange(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 4,
                border: '1px solid #4B5563',
                background: '#0B1220',
                color: '#C9D1E7',
              }}
            />
          </div>

          {formData.periodoType === 'personalizzato' && (
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#C9D1E7', fontSize: 12, marginBottom: 4 }}>
                Data Fine
              </label>
              <input
                type="date"
                value={formData.dataFine}
                onChange={e => handleDataFineChange(e.target.value)}
                min={formData.dataInizio}
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #4B5563',
                  background: '#0B1220',
                  color: '#C9D1E7',
                }}
              />
            </div>
          )}

          {formData.periodoType !== 'personalizzato' && (
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#C9D1E7', fontSize: 12, marginBottom: 4 }}>
                Data Fine
              </label>
              <input
                type="date"
                value={formData.dataFine}
                disabled
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #4B5563',
                  background: '#1F2937',
                  color: '#9CA3AF',
                  cursor: 'not-allowed',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ANTEPRIMA */}
      <div style={{ 
        padding: 16, 
        borderRadius: 8, 
        border: '1px solid #374151', 
        background: preview.numVisite === 0 ? '#3F1F1F' : '#1F3F2F' 
      }}>
        <h3 style={{ color: '#F9FAFB', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          📊 Anteprima
        </h3>
        {preview.loading ? (
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>⏳ Caricamento...</p>
        ) : preview.numVisite === 0 ? (
          <p style={{ color: '#FCA5A5', fontSize: 14 }}>❌ Nessuna visita trovata nel periodo selezionato</p>
        ) : (
          <div style={{ color: '#C9D1E7', fontSize: 14 }}>
            <p style={{ marginBottom: 4 }}>✅ <strong>{preview.numVisite}</strong> visite trovate</p>
            <p>💰 Fatturato stimato: <strong>€{preview.fatturatoStimato?.toFixed(2)}</strong></p>
          </div>
        )}
      </div>

      {/* Bottoni */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onBack}
          disabled={generating}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: 'white',
            cursor: generating ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 600,
            opacity: generating ? 0.5 : 1,
          }}
        >
          ‹ Indietro
        </button>

        <button
          onClick={handleGenerate}
          disabled={generating || preview.numVisite === 0}
          style={{
            flex: 2,
            padding: '14px',
            borderRadius: 8,
            border: 'none',
            background: generating || preview.numVisite === 0 ? '#9ca3af' : '#2563eb',
            color: 'white',
            cursor: generating || preview.numVisite === 0 ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {generating ? '⏳ Generazione...' : '✅ Genera PDF'}
        </button>
      </div>
    </div>
  );
}
