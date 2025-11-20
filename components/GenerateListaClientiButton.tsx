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
  // Rimosso 'ReportListaClientiData' per evitare conflitti, 
  // usando un type check implicito sull'oggetto passato.
  type ClienteListaDetail 
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
    
    let numClienti = 0;
    let visiteTotali = 0;

    try {
      const reportType = formData.type as ReportType;
      
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
      
      // 2. Decifratura dei dati
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

              // Allinea i campi al tipo ClienteListaDetail (come corretto precedentemente)
              clienti.push({
                  id: r.id,
                  nome: dec.name || r.name_bi || 'NOME NON DISPONIBILE', 
                  citta: r.city || '', 
                  tipo_locale: r.tipo_locale || '',
                  email: dec.email || '',
                  phone: dec.phone || '',
                  vat_number: dec.vat_number || '',
                  
                  numVisite: r.visite || 0,
                  fatturato: r.fatturato || 0,
                  km: r.km || 0,
                  ultimaVisita: r.ultima_visita || null,
                  note: r.notes || '',
                  created_at: r.created_at,
                  contact_name: dec.contact_name || '',
              } as ClienteListaDetail);
              
          } catch (e) {
              console.warn(`[Lista] Errore decifratura cliente ${r.id}:`, e);
          }
      }

      numClienti = clienti.length;
      visiteTotali = metadata?.visiteTotali || 0;
      
      // 3. ORDINAMENTO DEI CLIENTI DECIFRATI
      const sortBy = formData.ordinaPer === 'visite' ? 'numVisite' : formData.ordinaPer || 'nome';
      const sortDir = formData.ordinaDir === 'desc' ? 'desc' : 'asc';
      
      console.log(`[Lista] Applicazione ordinamento: ${sortBy} ${sortDir}`);

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

      // 4. Generazione PDF
      // ➡️ CORREZIONE: rimuovo 'report_type' dall'oggetto passato a generateReportListaClienti
      const pdfBlob = await generateReportListaClienti({
          clienti: clienti, // L'unico campo noto e richiesto
          // Se generateReportListaClienti ha bisogno di altri parametri,
          // questi devono essere aggiunti al tipo ReportListaClientiData in /lib/pdf.ts
      });
      
      // Uso reportType per il nome del file
      const filename = generateListaClientiFilename(reportType);

      // 5. Salva su dispositivo
      await savePdfToDevice(pdfBlob, filename);

      // 6. Salva metadati documento su Supabase
      await saveDocumentMetadata({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        file_name: filename,
        report_type: reportType, // Qui è corretto usare report_type
        num_clienti: numClienti,
        visite_tot: visiteTotali,
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
