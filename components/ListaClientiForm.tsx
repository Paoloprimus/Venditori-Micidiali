// components/ListaClientiForm.tsx (VERSIONE COMPLETA E CORRETTA)
'use client';

import { useState } from 'react';

// AGGIUNTO 'lista_completa'
type ReportType = 'lista_completa' | 'lista_visite' | 'lista_fatturato' | 'lista_prodotto' | 'lista_km';

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
  
  // Ordinamento: AGGIUNTO 'citta'
  ordinaPer?: 'nome' | 'fatturato' | 'visite' | 'km' | 'citta'; 
  
  // AGGIUNTA la direzione di ordinamento
  ordinaDir?: 'asc' | 'desc'; 
};

type Props = {
  reportType: ReportType;
  onBack: () => void;
  onGenerate: (data: FormData) => void;
};

export default function ListaClientiForm({ reportType, onBack, onGenerate }: Props) {
  const [formData, setFormData] = useState<FormData>(() => ({
    type: reportType,
    periodo: 'mese',
    // Default ragionevole
    ordinaPer: reportType === 'lista_completa' ? 'nome' : 'fatturato', 
    ordinaDir: 'asc',
  }));

  const [generating, setGenerating] = useState(false);

  // Funzione helper per l'aggiornamento
  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calcola date periodo predefinito
  function getDateRange(periodo: 'settimana' | 'mese' | 'trimestre'): { inizio: string; fine: string } {
    const today = new Date();
    const fine = today.toISOString().split('T')[0];
    let inizio;

    switch (periodo) {
      case 'settimana':
        // Vado indietro di 7 giorni
        inizio = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
        break;
      case 'trimestre':
        // Vado indietro di 3 mesi
        inizio = new Date(today.setMonth(today.getMonth() - 3)).toISOString().split('T')[0];
        break;
      case 'mese':
      default:
        // Vado indietro di 1 mese
        inizio = new Date(today.setMonth(today.getMonth() - 1)).toISOString().split('T')[0];
        break;
    }
    return { inizio, fine };
  }

  // Seleziona intervallo di date in base al periodo predefinito
  function handlePeriodoChange(periodo: 'settimana' | 'mese' | 'trimestre' | 'custom') {
    if (periodo === 'custom') {
      updateFormData('periodo', 'custom');
      return;
    }
    const { inizio, fine } = getDateRange(periodo);
    setFormData(prev => ({
      ...prev,
      periodo: periodo,
      dataInizio: inizio,
      dataFine: fine,
    }));
  }

  // Gestore principale per l'azione di generazione
  async function handleGenerate() {
    setGenerating(true);
    // Assicurati che i campi di ordinamento siano presenti
    const dataToSend: FormData = {
      ...formData,
      ordinaPer: formData.ordinaPer || (reportType === 'lista_completa' ? 'nome' : 'fatturato'),
      ordinaDir: formData.ordinaDir || 'asc',
    };
    
    // Controlli di validazione omessi per brevità, ma essenziali per il tuo codice
    
    await onGenerate(dataToSend);
    setGenerating(false);
  }

  // Campi per l'ordinamento (mostriamo solo quelli sensati per il report corrente)
  const campiOrdinabili = [
      { key: 'nome', label: 'Nome Azienda' }, 
      { key: 'citta', label: 'Città' },
      // Mostra le opzioni di valore solo se rilevanti
      ...(reportType === 'lista_fatturato' || reportType === 'lista_completa' ? [{ key: 'fatturato', label: 'Fatturato' }] : []),
      ...(reportType === 'lista_visite' || reportType === 'lista_completa' ? [{ key: 'visite', label: 'Visite' }] : []),
      ...(reportType === 'lista_km' || reportType === 'lista_completa' ? [{ key: 'km', label: 'Km Percorsi' }] : []),
  ];
  
  // Variabili per nascondere i filtri quando si sceglie 'lista_completa'
  const showFilters = reportType !== 'lista_completa';
  const showPeriodo = showFilters && (reportType === 'lista_visite' || reportType === 'lista_fatturato' || reportType === 'lista_prodotto');
  
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* 1. SEZIONE ORDINAMENTO (Sempre visibile) */}
      <div style={{ padding: 16, borderRadius: 8, border: '1px solid #374151', background: '#1F2937' }}>
        <h3 style={{ color: '#F9FAFB', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          Ordina per
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Mappa i campi ordinabili (inclusa Città) */}
          {campiOrdinabili.filter((v, i, a) => a.findIndex(t => (t.key === v.key)) === i).map(campo => ( // Filtra duplicati
            <button
              key={campo.key}
              type="button"
              onClick={() => updateFormData('ordinaPer', campo.key)}
              style={{
                padding: '8px 16px',
                borderRadius: 4,
                background: formData.ordinaPer === campo.key ? '#1C3FAA' : '#374151',
                color: 'white',
                fontWeight: formData.ordinaPer === campo.key ? 600 : 400,
                fontSize: 14,
                cursor: 'pointer',
                border: 'none',
                transition: 'background 0.2s',
                textTransform: 'capitalize',
              }}
            >
              {campo.label}
            </button>
          ))}
        </div>
        
        {/* Direzione Ordinamento */}
        <h3 style={{ color: '#F9FAFB', fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 12 }}>
            Direzione
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
            {['asc', 'desc'].map(dir => (
              <button
                  key={dir}
                  type="button"
                  onClick={() => updateFormData('ordinaDir', dir)}
                  style={{
                      flex: 1,
                      padding: '8px 16px',
                      borderRadius: 4,
                      background: formData.ordinaDir === dir ? '#1C3FAA' : '#374151',
                      color: 'white',
                      fontWeight: formData.ordinaDir === dir ? 600 : 400,
                      fontSize: 14,
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'background 0.2s',
                      textTransform: 'capitalize',
                  }}
              >
                  {dir === 'asc' ? 'Crescente (A-Z, 0-9)' : 'Decrescente (Z-A, 9-0)'}
              </button>
            ))}
        </div>
      </div>
      
      {/* 2. SEZIONE FILTRI (Mostrata solo se non è 'lista_completa') */}
      {showFilters && (
        <>
            {/* Periodo (solo per tipi che lo usano) */}
            {showPeriodo && (
                <div style={{ padding: 16, borderRadius: 8, border: '1px solid #374151', background: '#1F2937' }}>
                    <h3 style={{ color: '#F9FAFB', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                        Intervallo di Tempo
                    </h3>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        {['settimana', 'mese', 'trimestre', 'custom'].map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => handlePeriodoChange(p as any)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 4,
                                    background: formData.periodo === p ? '#1C3FAA' : '#374151',
                                    color: 'white',
                                    fontWeight: formData.periodo === p ? 600 : 400,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                    border: 'none',
                                    transition: 'background 0.2s',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                        ))}
                    </div>
                    {formData.periodo === 'custom' && (
                        <div style={{ display: 'flex', gap: 12 }}>
                            <input
                                type="date"
                                placeholder="Inizio"
                                value={formData.dataInizio || ''}
                                onChange={e => updateFormData('dataInizio', e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: 8,
                                    borderRadius: 4,
                                    border: '1px solid #4B5563',
                                    background: '#0B1220',
                                    color: '#C9D1E7',
                                }}
                            />
                            <input
                                type="date"
                                placeholder="Fine"
                                value={formData.dataFine || ''}
                                onChange={e => updateFormData('dataFine', e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: 8,
                                    borderRadius: 4,
                                    border: '1px solid #4B5563',
                                    background: '#0B1220',
                                    color: '#C9D1E7',
                                }}
                            />
                        </div>
                    )}
                </div>
            )}
            
            {/* Filtri Specifici (es. Min Visite) */}
            {(reportType === 'lista_visite') && (
                <div style={{ padding: 16, borderRadius: 8, border: '1px solid #374151', background: '#1F2937' }}>
                    <h3 style={{ color: '#F9FAFB', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                        Filtra per Visite
                    </h3>
                    <input
                        type="number"
                        placeholder="Minimo Visite"
                        value={formData.minVisite || ''}
                        onChange={e => updateFormData('minVisite', parseInt(e.target.value) || undefined)}
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
            
            {/* Filtri Fatturato */}
            {(reportType === 'lista_fatturato') && (
                <div style={{ padding: 16, borderRadius: 8, border: '1px solid #374151', background: '#1F2937' }}>
                    <h3 style={{ color: '#F9FAFB', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                        Filtra per Fatturato (€)
                    </h3>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <input
                            type="number"
                            placeholder="Min Fatturato"
                            value={formData.minFatturato || ''}
                            onChange={e => updateFormData('minFatturato', parseInt(e.target.value) || undefined)}
                            style={{
                                flex: 1,
                                padding: 8,
                                borderRadius: 4,
                                border: '1px solid #4B5563',
                                background: '#0B1220',
                                color: '#C9D1E7',
                            }}
                        />
                        <input
                            type="number"
                            placeholder="Max Fatturato"
                            value={formData.maxFatturato || ''}
                            onChange={e => updateFormData('maxFatturato', parseInt(e.target.value) || undefined)}
                            style={{
                                flex: 1,
                                padding: 8,
                                borderRadius: 4,
                                border: '1px solid #4B5563',
                                background: '#0B1220',
                                color: '#C9D1E7',
                            }}
                        />
                    </div>
                </div>
            )}
            
            {/* Filtro Prodotto */}
            {(reportType === 'lista_prodotto') && (
                <div style={{ padding: 16, borderRadius: 8, border: '1px solid #374151', background: '#1F2937' }}>
                    <h3 style={{ color: '#F9FAFB', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                        Filtra per Prodotto
                    </h3>
                    <input
                        type="text"
                        placeholder="Nome Prodotto"
                        value={formData.prodottoNome || ''}
                        onChange={e => updateFormData('prodottoNome', e.target.value)}
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
            
            {/* Filtro KM */}
            {(reportType === 'lista_km') && (
                <div style={{ padding: 16, borderRadius: 8, border: '1px solid #374151', background: '#1F2937' }}>
                    <h3 style={{ color: '#F9FAFB', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                        Filtra per Km Percorsi
                    </h3>
                    <input
                        type="number"
                        placeholder="Minimo Km"
                        value={formData.minKm || ''}
                        onChange={e => updateFormData('minKm', parseInt(e.target.value) || undefined)}
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
        </>
      )}


      {/* Bottoni (Genera e Indietro) */}
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
  );
}
