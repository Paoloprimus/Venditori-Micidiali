// components/GenerateReportVisiteButton.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import ReportVisiteForm from './ReportVisiteForm';
import {
  generateReportVisite,
  savePdfToDevice,
  saveDocumentMetadata,
  generateVisiteFilename,
  type ReportVisiteData,
  type VisitaDetail,
  type DocumentMetadata 
} from '@/lib/pdf';

type FormData = {
  periodoType: 'giorno' | 'settimana' | 'personalizzato';
  dataInizio: string;
  dataFine: string;
};

type Props = {
  onSuccess?: () => void;
  onClose?: () => void;
};

export default function GenerateReportVisiteButton({ onSuccess, onClose }: Props) {
  const { crypto } = useCrypto();

  async function handleGenerate(formData: FormData) {
    if (!crypto || typeof crypto.decryptFields !== 'function') {
      alert('Crittografia non disponibile');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      // 1. Query visite nel periodo
      let visitsQuery = supabase
        .from('visits')
        .select('id, account_id, tipo, data_visita, esito, importo_vendita, notes')
        .eq('user_id', user.id)
        .gte('data_visita', `${formData.dataInizio}T00:00:00`)
        .lte('data_visita', `${formData.dataFine}T23:59:59`)
        .order('data_visita', { ascending: true });

      const { data: visitsData, error: visitsError } = await visitsQuery;
      if (visitsError) throw visitsError;

      if (!visitsData || visitsData.length === 0) {
        alert('Nessuna visita trovata nel periodo selezionato');
        return;
      }

      // 2. Ottieni account_ids unici
      const accountIds = [...new Set(visitsData.map(v => v.account_id))];

      // 3. Carica tutti i clienti
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name_enc, name_iv, city')
        .in('id', accountIds);

      if (accountsError) throw accountsError;

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

      const accountsMap = new Map<string, { name: string; city: string }>();
      
      for (const acc of accountsData || []) {
        try {
          const recordForDecrypt = {
            ...acc,
            name_enc: hexToBase64(acc.name_enc),
            name_iv: hexToBase64(acc.name_iv),
          };

          const decAny = await (crypto as any).decryptFields(
            'table:accounts',
            'accounts',
            '',
            recordForDecrypt,
            ['name']
          );

          const dec = toObj(decAny);

          accountsMap.set(acc.id, {
            name: String(dec.name ?? 'Cliente senza nome'),
            city: acc.city || '',
          });
        } catch (e) {
          console.error('[ReportVisite] Errore decrypt cliente:', e);
          accountsMap.set(acc.id, {
            name: 'Cliente sconosciuto',
            city: acc.city || '',
          });
        }
      }

      // 5. Prepara dati visite per PDF
      const visite: VisitaDetail[] = visitsData.map(v => {
        const account = accountsMap.get(v.account_id);
        const dataOra = new Date(v.data_visita).toLocaleString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return {
          dataOra,
          nomeCliente: account?.name || 'Cliente sconosciuto',
          cittaCliente: account?.city || '',
          tipo: v.tipo,
          esito: v.esito || 'altro',
          importoVendita: v.importo_vendita ? parseFloat(v.importo_vendita as any) : null,
          noteVisita: v.notes || null,
        };
      });

      // 6. Calcola statistiche
      const numVisite = visite.length;
      const numClienti = accountIds.length;
      const fatturatoTotale = visite.reduce((sum, v) => sum + (v.importoVendita || 0), 0);
      
      // TODO: Calcolare km dai daily_plans se disponibili
      const kmTotali = 0;

      // 7. Formatta periodo
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
      };

      let periodoFormattato: string;
      if (formData.dataInizio === formData.dataFine) {
        periodoFormattato = formatDate(formData.dataInizio);
      } else {
        periodoFormattato = `${formatDate(formData.dataInizio)} - ${formatDate(formData.dataFine)}`;
      }

      const reportData: ReportVisiteData = {
        nomeAgente: user.email?.split('@')[0] || 'Agente',
        dataInizio: formData.dataInizio,
        dataFine: formData.dataFine,
        periodoFormattato,
        numVisite,
        numClienti,
        fatturatoTotale,
        kmTotali,
        visite,
      };

      // 8. Genera PDF
      const pdfBlob = await generateReportVisite(reportData);

      // 9. Salva su device
      const filename = generateVisiteFilename(formData.dataInizio, formData.dataFine);
      const filePath = await savePdfToDevice(pdfBlob, filename);

      if (!filePath) {
        alert('Download PDF annullato');
        return;
      }

      // 10. Salva metadata nel DB
      const metadataForDB: DocumentMetadata = {
        data_inizio: formData.dataInizio,
        data_fine: formData.dataFine,
        num_visite: numVisite,
        num_clienti: numClienti,
        fatturato_tot: fatturatoTotale,
        km_tot: kmTotali,
      };
      
      await saveDocumentMetadata({
        document_type: 'report_planning', // Manteniamo 'report_planning' per compatibilità DB
        title: `Report Visite - ${periodoFormattato}`,
        filename,
        file_path: filePath,
        metadata: metadataForDB,
        file_size: pdfBlob.size,
      });

      // 11. Success!
      alert('✅ Report generato e salvato!');
      if (onClose) onClose();
      if (onSuccess) onSuccess();

    } catch (e: any) {
      console.error('[ReportVisite] Errore generazione:', e);
      alert(`Errore: ${e.message}`);
    }
  }

  return (
    <ReportVisiteForm
      onBack={onClose || (() => {})}
      onGenerate={handleGenerate}
    />
  );
}
