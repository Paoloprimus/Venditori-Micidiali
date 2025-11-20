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
  type ReportListaClientiData,
  type ClienteListaDetail // Assumo che esista questo tipo in lib/pdf.ts
} from '@/lib/pdf';

// AGGIUNTO 'lista_completa'
type ReportType = 'planning' | 'lista_completa' | 'lista_visite' | 'lista_fatturato' | 'lista_prodotto' | 'lista_km';

type Props = {
  onSuccess?: () => void;
};

export default function GenerateListaClientiButton({ onSuccess }: Props) {
  // Ho rimosso l'alias 'crypto' perché non è definito. Usiamo solo 'useCrypto()'
  const { crypto } = useCrypto(); 
  const [showModal, setShowModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);

  async function handleSelectReport(type: ReportType) {
    if (type === 'planning') {
      // Redirect a pagina planning o modale seleziona data
      alert('Per Report Planning, vai alla pagina di esecuzione planning e genera da lì');
      setShowModal(false);
      return;
    }

    // Per liste clienti (inclusa la nuova lista_completa), mostra form
    setSelectedReportType(type);
  }

  // Funzione che riceve i dati dalla form e genera il PDF
  async function handleGenerateLista(formData: any) {
    // 1. Check Crittografia
    if (!crypto || typeof crypto.decryptFields !== 'function') {
      alert('Crittografia non disponibile o non sbloccata. Sblocca prima di generare.');
      return;
    }
    
    // Contatori per metadati
    let numClienti = 0;
    let visiteTotali = 0;

    try {
      // 2. Chiamata API per recuperare i dati (clienti_raw)
      const reportType = formData.type as ReportType;
      
      const response = await fetch('/api/clients/lista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Passiamo tutti i dati della form all'API. Sarà l'API a decidere quali filtri ignorare.
        body: JSON.stringify(formData), 
      });
      
      if (!response.ok) {
        throw new Error('Errore durante il recupero dei dati: ' + response.statusText);
      }
      
      // Assumo che l'API restituisca clienti_raw e metadati
      const { clienti_raw, metadata } = await response.json();
      
      if (!clienti_raw || clienti_raw.length === 0) {
        alert('Nessun cliente trovato per la generazione del report con i filtri selezionati.');
        return;
      }
      
      // 3. Decifratura dei dati
      const clienti: ClienteListaDetail[] = [];
      // Assumo che getOrCreateScopeKeys restituisca le chiavi necessarie
      await (crypto as any).getOrCreateScopeKeys('table:accounts'); 
      
      for (const r of clienti_raw) {
          try {
              const recordForDecrypt = { ...r };
              
              // Decifra solo i campi sensibili
              const decAny = await (crypto as any).decryptFields(
                  "table:accounts", 
                  "accounts", 
                  r.id, // ID come Associated Data
                  recordForDecrypt,
                  ["name", "contact_name", "email", "phone", "vat_number", "address"]
              );

              const dec = (decAny as Array<{ name: string, value: string }>).reduce((acc, item) => {
                  acc[item.name as keyof typeof acc] = item.value || '';
                  return acc;
              }, {} as Record<string, string>);

              // Popola l'oggetto finale ClienteListaDetail
              clienti.push({
                  id: r.id,
                  name: dec.name || r.name_bi || 'NOME NON DISPONIBILE', 
                  contact_name: dec.contact_name || '',
                  city: r.city || '', // Campo in chiaro
                  tipo_locale: r.tipo_locale || '', // Campo in chiaro
                  email: dec.email || '',
                  phone: dec.phone || '',
                  vat_number: dec.vat_number || '',
                  // Campi di valore che l'API deve calcolare (es. visite, fatturato, km)
                  visite: r.visite || 0, 
                  fatturato: r.fatturato || 0,
                  km: r.km || 0,
                  created_at: r.created_at,
              } as ClienteListaDetail);
              
          } catch (e) {
              console.warn(`[Lista] Errore decifratura cliente ${r.id}:`, e);
          }
      }

      numClienti = clienti.length;
      visiteTotali = metadata?.visiteTotali || 0;
      
      // ➡️ 4. ORDINAMENTO DEI CLIENTI DECIFRATI (IL TUO OBIETTIVO)
      // Recupera i parametri di ordinamento dalla form
      const sortBy = formData.ordinaPer as keyof ClienteListaDetail || 'name'; 
      const sortDir = formData.ordinaDir === 'desc' ? 'desc' : 'asc';
      
      console.log(`[Lista] Applicazione ordinamento: ${sortBy} ${sortDir}`);

      clienti.sort((a, b) => {
          let va: string | number = a[sortBy as keyof ClienteListaDetail] ?? "";
          let vb: string | number = b[sortBy as keyof ClienteListaDetail] ?? "";
          
          // Gestione ordinamento alfabetico
          if (typeof va === 'string' && typeof vb === 'string') {
            va = va.toLowerCase();
            vb = vb.toLowerCase();
          }
          // Gestione ordinamento numerico o stringa
          if (va < vb) return sortDir === 'asc' ? -1 : 1;
          if (va > vb) return sortDir === 'asc' ? 1 : -1;
          return 0;
      });

      // 5. Generazione PDF
      const pdfBlob = await generateReportListaClienti({
          clienti: clienti, // Array ora ordinato
          report_type: reportType,
          // ... (altri metadati)
      });
      
      const filename = generateListaClientiFilename(reportType);

      // 6. Salva su dispositivo
      await savePdfToDevice(pdfBlob, filename);

      // 7. Salva metadati documento su Supabase
      await saveDocumentMetadata({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        file_name: filename,
        report_type: reportType,
        num_clienti: numClienti,
        visite_tot: visiteTotali,
        file_size: pdfBlob.size,
      });

      // 8. Success!
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
        >
          {/* NB: Assicurati che il tuo GenerateReportModal mostri l'opzione 'lista_completa' */}
        </GenerateReportModal>
      )}

      {/* Form configurazione lista */}
      {selectedReportType && selectedReportType !== 'planning' && (
        <ListaClientiForm
          reportType={selectedReportType as any} // Cast necessario per il nuovo tipo
          onBack={() => setSelectedReportType(null)}
          onGenerate={handleGenerateLista}
        />
      )}
    </>
  );
}
