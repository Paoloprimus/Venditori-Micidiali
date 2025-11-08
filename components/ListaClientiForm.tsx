// components/ListaClientiForm.tsx
'use client';

import { useState } from 'react';

type ReportType = 'lista_visite' | 'lista_fatturato' | 'lista_prodotto' | 'lista_km';

type FormData = {
  type: ReportType;
  
  // Periodo (per visite, fatturato, prodotto)
  periodo?: 'settimana' | 'mese' | 'trimestre' | 'custom';
  dataInizio?: string;
  dataFine?: string;
  
  // Filtro visite
  minVisite?: number;
  
  // Filtro fatturato
  minFatturato?: number;
  maxFatturato?: number;
  
  // Filtro prodotto
  prodottoNome?: string;
  
  // Filtro km
  minKm?: number;
  
  // Ordinamento
  ordinaPer?: 'nome' | 'fatturato' | 'visite' | 'km';
};

type Props = {
  reportType: ReportType;
  onBack: () => void;
  onGenerate: (data: FormData) => void;
};

export default function ListaClientiForm({ reportType, onBack, onGenerate }: Props) {
  const [formData, setFormData] = useState<FormData>({
    type: reportType,
    periodo: 'mese',
    ordinaPer: 'fatturato',
  });

  const [generating, setGenerating] = useState(false);

  // Calcola date periodo predefinito
  function getDateRange(periodo: 'settimana' | 'mese' | 'trimestre'): { inizio: string; fine: string } {
    const oggi = new Date();
    const fine = oggi.toISOString().split('T')[0];
    
    const inizio = new Date(oggi);
    
    if (periodo === 'settimana') {
      inizio.setDate(oggi.getDate() - 7);
    } else if (periodo === 'mese') {
      inizio.setMonth(oggi.getMonth() - 1);
    } else if (periodo === 'trimestre') {
      inizio.setMonth(oggi.getMonth() - 3);
    }
    
    return {
      inizio: inizio.toISOString().split('T')[0],
      fine,
    };
  }

  async function handleGenerate() {
    // Validazione base
    if (reportType === 'lista_visite' && !formData.minVisite) {
      alert('Inserisci numero minimo visite');
      return;
    }
    
    if (reportType === 'lista_fatturato' && !formData.minFatturato) {
      alert('Inserisci fatturato minimo');
      return;
    }
    
    if (reportType === 'lista_prodotto' && !formData.prodottoNome?.trim()) {
      alert('Inserisci nome prodotto');
      return;
    }
    
    if (reportType === 'lista_km' && !formData.minKm) {
      alert('Inserisci distanza minima');
      return;
    }

    // Calcola date se periodo predefinito
    let dataInizio = formData.dataInizio;
    let dataFine = formData.dataFine;
    
    if (formData.periodo !== 'custom' && formData.periodo) {
      const range = getDateRange(formData.periodo);
      dataInizio = range.inizio;
      dataFine = range.fine;
    }

    setGenerating(true);
    
    try {
      await onGenerate({
        ...formData,
        dataInizio,
        dataFine,
      });
    } catch (e) {
      console.error('Errore generazione:', e);
    } finally {
      setGenerating(false);
    }
  }

  // Titolo dinamico
  const titles = {
    lista_visite: '📅 Lista per Numero Visite',
    lista_fatturato: '💰 Lista per Fatturato',
    lista_prodotto: '📦 Lista per Prodotto',
    lista_km: '🚗 Lista per Distanza',
  };

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
          onClick={onBack}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: 'white',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ‹
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          {titles[reportType]}
        </h2>
      </div>

      {/* Form */}
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        
        {/* Periodo (per visite, fatturato, prodotto) */}
        {reportType !== 'lista_km' && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
              Periodo
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
              {['settimana', 'mese', 'trimestre', 'custom'].map(p => (
                <button
                  key={p}
                  onClick={() => setFormData({ ...formData, periodo: p as any })}
                  style={{
                    padding: '10px',
                    borderRadius: 8,
                    border: formData.periodo === p ? '2px solid #2563eb' : '1px solid #d1d5db',
                    background: formData.periodo === p ? '#eff6ff' : 'white',
                    color: formData.periodo === p ? '#2563eb' : '#374151',
                    fontWeight: formData.periodo === p ? 600 : 400,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {p === 'settimana' ? 'Settimana' : p === 'mese' ? 'Mese' : p === 'trimestre' ? 'Trimestre' : 'Personalizza'}
                </button>
              ))}
            </div>

            {formData.periodo === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#6b7280' }}>
                    Data Inizio
                  </label>
                  <input
                    type="date"
                    value={formData.dataInizio || ''}
                    onChange={(e) => setFormData({ ...formData, dataInizio: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      fontSize: 14,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#6b7280' }}>
                    Data Fine
                  </label>
                  <input
                    type="date"
                    value={formData.dataFine || ''}
                    onChange={(e) => setFormData({ ...formData, dataFine: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filtro specifico per tipo */}
        {reportType === 'lista_visite' && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
              Numero Minimo Visite
            </label>
            <input
              type="number"
              min="1"
              value={formData.minVisite || ''}
              onChange={(e) => setFormData({ ...formData, minVisite: parseInt(e.target.value) || undefined })}
              placeholder="Es: 5"
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '2px solid #d1d5db',
                fontSize: 16,
              }}
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
              Mostra clienti visitati almeno X volte nel periodo
            </div>
          </div>
        )}

        {reportType === 'lista_fatturato' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                Fatturato Minimo (€)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={formData.minFatturato || ''}
                onChange={(e) => setFormData({ ...formData, minFatturato: parseFloat(e.target.value) || undefined })}
                placeholder="Es: 1000"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '2px solid #d1d5db',
                  fontSize: 16,
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                Fatturato Massimo (€) - Opzionale
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={formData.maxFatturato || ''}
                onChange={(e) => setFormData({ ...formData, maxFatturato: parseFloat(e.target.value) || undefined })}
                placeholder="Es: 10000"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '2px solid #d1d5db',
                  fontSize: 16,
                }}
              />
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                Lascia vuoto per nessun limite massimo
              </div>
            </div>
          </>
        )}

        {reportType === 'lista_prodotto' && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
              Nome Prodotto
            </label>
            <input
              type="text"
              value={formData.prodottoNome || ''}
              onChange={(e) => setFormData({ ...formData, prodottoNome: e.target.value })}
              placeholder="Es: Vino, Birra, Olio..."
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '2px solid #d1d5db',
                fontSize: 16,
              }}
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
              Mostra clienti che hanno ordinato questo prodotto
            </div>
          </div>
        )}

        {reportType === 'lista_km' && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
              Distanza Minima (Km)
            </label>
            <input
              type="number"
              min="1"
              value={formData.minKm || ''}
              onChange={(e) => setFormData({ ...formData, minKm: parseInt(e.target.value) || undefined })}
              placeholder="Es: 50"
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '2px solid #d1d5db',
                fontSize: 16,
              }}
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
              Mostra clienti oltre X km di distanza
            </div>
          </div>
        )}

        {/* Ordinamento */}
        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
            Ordina per
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <button
              onClick={() => setFormData({ ...formData, ordinaPer: 'nome' })}
              style={{
                padding: '10px',
                borderRadius: 8,
                border: formData.ordinaPer === 'nome' ? '2px solid #2563eb' : '1px solid #d1d5db',
                background: formData.ordinaPer === 'nome' ? '#eff6ff' : 'white',
                color: formData.ordinaPer === 'nome' ? '#2563eb' : '#374151',
                fontWeight: formData.ordinaPer === 'nome' ? 600 : 400,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Nome
            </button>
            <button
              onClick={() => setFormData({ ...formData, ordinaPer: 'fatturato' })}
              style={{
                padding: '10px',
                borderRadius: 8,
                border: formData.ordinaPer === 'fatturato' ? '2px solid #2563eb' : '1px solid #d1d5db',
                background: formData.ordinaPer === 'fatturato' ? '#eff6ff' : 'white',
                color: formData.ordinaPer === 'fatturato' ? '#2563eb' : '#374151',
                fontWeight: formData.ordinaPer === 'fatturato' ? 600 : 400,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Fatturato
            </button>
          </div>
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
            disabled={generating}
            style={{
              flex: 2,
              padding: '14px',
              borderRadius: 8,
              border: 'none',
              background: generating ? '#9ca3af' : '#2563eb',
              color: 'white',
              cursor: generating ? 'not-allowed' : 'pointer',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {generating ? '⏳ Generazione...' : '✅ Genera PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
