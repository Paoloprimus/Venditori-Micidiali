// components/GenerateListaClientiButton.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import GenerateReportModal from './GenerateReportModal';
import ListaClientiForm from './ListaClientiForm';
import {
  generateReportListaClienti,
  savePdfToDevice,
  saveDocumentMetadata,
  generateListaClientiFilename,
  // 💡 USIAMO I TIPI REALI DAL TUO lib/pdf/types.ts
  type ReportListaClientiData, 
  type ClienteListaDetail,
  type DocumentMetadata // Necessario per costruire l'oggetto metadata
} from '@/lib/pdf';

// AGGIUNTO 'lista_completa'
type ReportType = 'planning' | 'lista_completa' | 'lista_visite' | 'lista_fatturato' | 'lista_prodotto' | 'lista_km';

type Props = {
  onSuccess?: () => void;
};


export default function GenerateListaClientiButton({ onSuccess }: Props) {
  const { crypto } = useCrypto(); 
  const [showModal, setShowModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);

  async function handleSelectReport(type: ReportType) {
    if (type === 'planning') {
      alert('Per Report Planning, vai alla pagina di esecuzione planning e genera da lì');
      setShowModal(false);
      return;
    }

    setSelectedReportType(type);
  }

  async function handleGenerateLista(formData: any) {
    if (!crypto || typeof crypto.decryptFields !== 'function') {
      alert('Crittografia non disponibile o non sbloccata. Sblocca prima di generare.');
      return;
    }
    
    // Inizializzazione variabili per i metadati totali
    let numClienti = 0;
    let visiteTotali = 0;
    let kmTotali = 0;
    let fatturatoTotale = 0;
    let nomeAgente = 'Sconosciuto';
    
    try {
      const reportType = formData.type as ReportType;
      
      // 0. Recupera i dati dell'utente per i metadati del report
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        const profileResponse = await supabase.from('profiles').select('first_name, last_name').eq('id', user.data.user.id).single();
        if (profileResponse.data) {
          nomeAgente = `${profileResponse.data.first_name || ''} ${profileResponse.data.last_name || ''}`.trim() || user.data.user.email || 'Agente';
        }
      }

      // 1. Chiamata API per recuperare i dati (clienti_raw)
      const response = await fetch('/api/clients/lista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData), 
      });
      
      if (!response.ok) {
        throw new Error('Errore durante il recupero dei dati: ' + response.statusText);
      }
      
      const { clienti_raw, metadata } = await response.json();
      
      if (!clienti_raw || clienti_raw.length === 0) {
        alert('Nessun cliente trovato per la generazione del report con i filtri selezionati.');
        return;
      }
      
      // 2. Decifratura dei dati (omessa per brevità, codice precedente corretto)
      // ... (Blocco di decifratura)
      const clienti: ClienteListaDetail[] = [];
      await (crypto as any).getOrCreateScopeKeys('table:accounts'); 
      
      for (const r of clienti_raw) {
          try {
              const recordForDecrypt = { ...r };
              
              const decAny = await (crypto as any).decryptFields(
                  "table:accounts", 
                  "accounts", 
                  r.id, 
                  recordForDecrypt,
                  ["name", "contact_name", "email", "phone", "vat_number", "address"]
              );

              const dec = (decAny as Array<{ name: string, value: string }>).reduce((acc, item) => {
                  acc[item.name as keyof typeof acc] = item.value || '';
                  return acc;
              }, {} as Record<string, string>);

              clienti.push({
                  nome: dec.name || r.name_bi || 'NOME NON DISPONIBILE', 
                  citta: r.city || '', 
                  numVisite: r.visite || 0,
                  fatturato: r.fatturato || 0,
                  km: r.km || 0,
                  ultimaVisita: r.ultima_visita || null,
                  note: r.notes || null,
                  
                  id: r.id,
                  created_at: r.created_at,
                  tipo_locale: r.tipo_locale || '',
                  email: dec.email || '',
                  phone: dec.phone || '',
                  vat_number: dec.vat_number || '',
                  contact_name: dec.contact_name || '',
              } as ClienteListaDetail);
              
          } catch (e) {
              console.warn(`[Lista] Errore decifratura cliente ${r.id}:`, e);
          }
      }

      // Aggiorna metadati totali
      numClienti = clienti.length;
      visiteTotali = metadata?.visiteTotali || clienti.reduce((sum, c) => sum + (c.numVisite || 0), 0);
      kmTotali = metadata?.kmTotali || clienti.reduce((sum, c) => sum + (c.km || 0), 0);
      fatturatoTotale = metadata?.fatturatoTotale || clienti.reduce((sum, c) => sum + (c.fatturato || 0), 0);
      
      // 3. ORDINAMENTO DEI CLIENTI DECIFRATI (codice precedente corretto)
      const sortMap = {
        'nome': 'nome', 'citta': 'citta', 'fatturato': 'fatturato', 
        'visite': 'numVisite', 'km': 'km'
      };
      const sortBy = sortMap[formData.ordinaPer as keyof typeof sortMap] || 'nome';
      const sortDir = formData.ordinaDir === 'desc' ? 'desc' : 'asc';
      
      clienti.sort((a, b) => {
          let va: string | number = (a as any)[sortBy] ?? "";
          let vb: string | number = (b as any)[sortBy] ?? "";
          if (typeof va === 'string' && typeof vb === 'string') {
            va = va.toLowerCase();
            vb = vb.toLowerCase();
          }
          if (va < vb) return sortDir === 'asc' ? -1 : 1;
          if (va > vb) return sortDir === 'asc' ? 1 : -1;
          return 0;
      });

      // 4. Generazione PDF: COSTRUZIONE DELL'OGGETTO 'filtri' 
      let filtroTipo: string = '';
      let filtroDescrizione: string = '';

      if (reportType === 'lista_completa') {
          filtroTipo = 'Lista Completa';
          filtroDescrizione = `Ordinamento: ${formData.ordinaPer} ${formData.ordinaDir.toUpperCase()}`;
      } else {
          const periodoStr = formData.periodo === 'custom' 
              ? `${formData.dataInizio} al ${formData.dataFine}`
              : formData.periodo || 'N/A';
              
          switch (reportType) {
              case 'lista_visite':
                  filtroTipo = 'Visite';
                  filtroDescrizione = `Minimo: ${formData.minVisite || 'N/A'}. Periodo: ${periodoStr}. Ordinamento: ${formData.ordinaPer}`;
                  break;
              case 'lista_fatturato':
                  filtroTipo = 'Fatturato';
                  filtroDescrizione = `Min: ${formData.minFatturato || 'N/A'} - Max: ${formData.maxFatturato || 'N/A'}. Periodo: ${periodoStr}. Ordinamento: ${formData.ordinaPer}`;
                  break;
              case 'lista_prodotto':
                  filtroTipo = 'Prodotto';
                  filtroDescrizione = `Prodotto: ${formData.prodottoNome || 'N/A'}. Periodo: ${periodoStr}. Ordinamento: ${formData.ordinaPer}`;
                  break;
              case 'lista_km':
                  filtroTipo = 'Km Percorsi';
                  filtroDescrizione = `Minimo: ${formData.minKm || 'N/A'}. Ordinamento: ${formData.ordinaPer}`;
                  break;
          }
      }

      const filtriData: ReportListaClientiData['filtri'] = {
          tipo: filtroTipo,
          descrizione: filtroDescrizione,
      };

      const reportData: ReportListaClientiData = {
          clienti: clienti,
          nomeAgente: nomeAgente,
          dataGenerazione: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          filtri: filtriData, 
          numClienti: numClienti,
          visiteTotali: visiteTotali,
          kmTotali: kmTotali,
          fatturatoTotale: fatturatoTotale,
      };

      const pdfBlob = await generateReportListaClienti(reportData); 

      const filename = generateListaClientiFilename(reportType);

      // 5. Salva su dispositivo e cattura il percorso
      const filePath = await savePdfToDevice(pdfBlob, filename);

      // 6. Salva metadati documento su Supabase
      const metadataForDB: DocumentMetadata = {
          filtro_tipo: filtroTipo,
          periodo: formData.periodo || 'N/A',
          valore_filtro: filtroDescrizione,
          num_clienti: numClienti,
          visite_tot: visiteTotali,
      };

      // ➡️ CORREZIONE: Passa l'oggetto con la struttura corretta richiesta dal tipo
      await saveDocumentMetadata({
        document_type: 'lista_clienti',
        title: `Lista Clienti: ${filtroTipo} (${formData.ordinaPer})`,
        filename: filename,
        file_path: filePath || filename, // Usa il path restituito o il filename come fallback
        metadata: metadataForDB,
        file_size: pdfBlob.size,
      });

      // 7. Success!
      alert('✅ Lista generata e salvata!');
      setSelectedReportType(null);
      setShowModal(false);
      if (onSuccess) onSuccess();

    } catch (e: any) {
      console.error('[Lista] Errore generazione:', e);
      alert(`Errore: ${e.message}`);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          width: '100%',
          padding: '16px 24px',
          borderRadius: 8,
          border: 'none',
          background: '#2563eb',
          color: 'white',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        ➕ GENERA NUOVO REPORT
      </button>

      {/* Modale selezione tipo */}
      {showModal && !selectedReportType && (
        <GenerateReportModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSelectReport={handleSelectReport}
        />
      )}

      {/* Form configurazione lista */}
      {selectedReportType && selectedReportType !== 'planning' && (
        <ListaClientiForm
          reportType={selectedReportType as any}
          onBack={() => setSelectedReportType(null)}
          onGenerate={handleGenerateLista}
        />
      )}
    </>
  );
}
