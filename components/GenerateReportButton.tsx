// components/GenerateReportButton.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import {
  generateReportVisite,
  savePdfToDevice,
  saveDocumentMetadata,
  generateVisiteFilename,
  formatDateItalian,
  type ReportVisiteData,
  type VisitaDetail,
  type DocumentMetadata
} from '@/lib/pdf';

type Props = {
  data: string; // formato: "2025-11-08"
  accountIds: string[]; // IDs clienti del piano
  onSuccess?: () => void;
};

export default function GenerateReportButton({ data, accountIds, onSuccess }: Props) {
  const { crypto } = useCrypto();
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function handleGenerate() {
    if (!crypto || typeof crypto.decryptFields !== 'function') {
      alert('Crittografia non disponibile');
      return;
    }

    setGenerating(true);
    try {
      // 1. Recupera user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      // 2. Recupera visite della giornata
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .gte('data_visita', `${data}T00:00:00`)
        .lte('data_visita', `${data}T23:59:59`)
        .in('account_id', accountIds)
        .order('created_at', { ascending: true });

      if (visitsError) throw visitsError;

      if (!visitsData || visitsData.length === 0) {
        alert('Nessuna visita trovata per questa giornata');
        setGenerating(false);
        return;
      }

      // 3. Recupera dati clienti
      const clientIds = [...new Set(visitsData.map(v => v.account_id))];
      const { data: clientsData, error: clientsError } = await supabase
        .from('accounts')
        .select('id, name_enc, name_iv, city, ultimo_esito_at, volume_attuale')
        .in('id', clientIds);

      if (clientsError) throw clientsError;

      // 4. Decifra nomi clienti
      const hexToBase64 = (hexStr: any): string => {
        if (!hexStr || typeof hexStr !== 'string') return '';
        if (!hexStr.startsWith('\\x')) return hexStr;
        const hex = hexStr.slice(2);
        const bytes = hex.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
        return bytes;
      };

      const toObj = (x: any): Record<string, unknown> =>
        Array.isArray(x)
          ? x.reduce((acc: Record<string, unknown>, it: any) => {
              if (it && typeof it === "object" && "name" in it) acc[it.name] = it.value ?? "";
              return acc;
            }, {})
          : ((x ?? {}) as Record<string, unknown>);

      const clientsMap = new Map<string, { name: string; city: string; ultimaVisita: string | null; fatturato: number }>();

      for (const c of clientsData || []) {
        try {
          const recordForDecrypt = {
            ...c,
            name_enc: hexToBase64(c.name_enc),
            name_iv: hexToBase64(c.name_iv),
          };

          const decAny = await (crypto as any).decryptFields(
            'table:accounts',
            'accounts',
            c.id, // ✅ FIX: Usa l'ID del cliente come Associated Data
            recordForDecrypt,
            ['name']
          );

          const dec = toObj(decAny);

          clientsMap.set(c.id, {
            name: String(dec.name ?? 'Cliente senza nome'),
            city: c.city || '',
            ultimaVisita: c.ultimo_esito_at,
            fatturato: c.volume_attuale ? parseFloat(c.volume_attuale) : 0,
          });
        } catch (e) {
          console.error('[Report] Errore decrypt cliente:', c.id, e);
          clientsMap.set(c.id, {
            name: 'Cliente sconosciuto',
            city: c.city || '',
            ultimaVisita: c.ultimo_esito_at,
            fatturato: c.volume_attuale ? parseFloat(c.volume_attuale) : 0,
          });
        }
      }

      // 5. Prepara dati per report (nuovo formato)
      const visite: VisitaDetail[] = visitsData.map((v) => {
        const client = clientsMap.get(v.account_id);
        
        // Formatta data e ora
        const dataOra = new Date(v.data_visita).toLocaleString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return {
          dataOra,
          nomeCliente: client?.name || 'N/A',
          cittaCliente: client?.city || '',
          tipo: v.tipo || 'visita',
          esito: v.esito || 'altro',
          importoVendita: v.importo_vendita ? parseFloat(v.importo_vendita) : null,
          noteVisita: v.notes || null,
        };
      });

      // Calcola statistiche
      const accountIdsVisitati = [...new Set(visite.map((_, idx) => visitsData[idx].account_id))];
      const numClienti = accountIdsVisitati.length;
      const fatturatoTotale = visite.reduce((sum, v) => sum + (v.importoVendita || 0), 0);

      // TODO: Calcolo km (per ora 0, implementare quando avremo coordinate)
      const kmTotali = 0;

      const reportData: ReportVisiteData = {
        nomeAgente: user.email?.split('@')[0] || 'Agente',
        dataInizio: data,
        dataFine: data, // Stesso giorno
        periodoFormattato: formatDateItalian(data),
        numVisite: visite.length,
        numClienti,
        fatturatoTotale,
        kmTotali,
        visite,
      };

      // 6. Genera PDF
      const pdfBlob = await generateReportVisite(reportData);

      // 7. Salva su device
      const filename = generateVisiteFilename(data, data);
      const filePath = await savePdfToDevice(pdfBlob, filename);

      if (!filePath) {
        alert('Download PDF annullato');
        setGenerating(false);
        return;
      }

      // 8. Salva metadata nel DB
      const metadataForDB: DocumentMetadata = {
        data_inizio: data,
        data_fine: data,
        num_visite: visite.length,
        num_clienti: numClienti,
        fatturato_tot: fatturatoTotale,
        km_tot: kmTotali,
      };

      await saveDocumentMetadata({
        document_type: 'report_planning',
        title: `Report Visite - ${formatDateItalian(data)}`,
        filename,
        file_path: filePath,
        metadata: metadataForDB,
        file_size: pdfBlob.size,
      });

      // 9. Success!
      alert('✅ Report generato e salvato!');
      setShowModal(false);
      if (onSuccess) onSuccess();

    } catch (e: any) {
      console.error('[Report] Errore generazione:', e);
      alert(`Errore: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: '12px 24px',
          borderRadius: 8,
          border: 'none',
          background: '#2563eb',
          color: 'white',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        📄 Genera Report
      </button>

      {/* Modal Conferma */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => !generating && setShowModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
            }}
          />

          {/* Modal */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            borderRadius: 16,
            padding: 32,
            maxWidth: 500,
            width: '90%',
            zIndex: 9999,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              📄 Genera Report Visite
            </h2>

            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
              Verrà generato un PDF con il riepilogo completo della giornata del <strong>{formatDateItalian(data)}</strong>, 
              incluse tutte le visite effettuate, fatturati e note.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={generating}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: 'white',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  opacity: generating ? 0.5 : 1,
                }}
              >
                Annulla
              </button>

              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: generating ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  fontWeight: 600,
                  cursor: generating ? 'not-allowed' : 'pointer',
                }}
              >
                {generating ? '⏳ Generazione...' : '✅ Genera PDF'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
