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
  data?: string; // Opzionale: data pre-impostata (es. dal planning)
  accountIds?: string[]; // Opzionale: lista account pre-filtrata
};

// Funzione matematica per calcolare distanza in km (Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raggio Terra in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function GenerateReportVisiteButton({ onSuccess, onClose, data, accountIds }: Props) {
  const { crypto } = useCrypto();

  // Se data e accountIds sono passati (es. da Planning), usiamo quelli per bypassare il form
  const isDirectMode = !!(data && accountIds);

  // Se siamo in direct mode, non mostriamo il form iniziale ma eseguiamo subito
  // Per semplicità in questo componente riutilizziamo la logica esistente triggerata dal form

  async function handleGenerate(formData: FormData) {
    if (!crypto || typeof crypto.decryptFields !== 'function') {
      alert('Crittografia non disponibile');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      // 1. Query visite
      // Se abbiamo accountIds specifici (dal planning), filtriamo anche per quelli
      let visitsQuery = supabase
        .from('visits')
        .select('id, account_id, tipo, data_visita, esito, importo_vendita, notes')
        .eq('user_id', user.id)
        .gte('data_visita', `${formData.dataInizio}T00:00:00`)
        .lte('data_visita', `${formData.dataFine}T23:59:59`)
        .order('data_visita', { ascending: true }); // Fondamentale per il calcolo percorso

      if (isDirectMode && accountIds) {
        visitsQuery = visitsQuery.in('account_id', accountIds);
      }

      const { data: visitsData, error: visitsError } = await visitsQuery;
      if (visitsError) throw visitsError;

      if (!visitsData || visitsData.length === 0) {
        alert('Nessuna visita trovata nel periodo selezionato');
        return;
      }

      // 2. Ottieni ID unici
      const uniqueAccountIds = [...new Set(visitsData.map(v => v.account_id))];

      // 3. Carica clienti con COORDINATE
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name_enc, name_iv, city, latitude, longitude')
        .in('id', uniqueAccountIds);

      if (accountsError) throw accountsError;

      // 4. Decifra e Mappa
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

      const accountsMap = new Map<string, { name: string; city: string; lat?: number; lon?: number }>();
      
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
            acc.id,
            recordForDecrypt,
            ['name']
          );

          const dec = toObj(decAny);

          accountsMap.set(acc.id, {
            name: String(dec.name ?? 'Cliente senza nome'),
            city: acc.city || '',
            lat: acc.latitude ? parseFloat(acc.latitude) : undefined,
            lon: acc.longitude ? parseFloat(acc.longitude) : undefined
          });
        } catch (e) {
          console.error('[Report] Errore decrypt:', e);
          accountsMap.set(acc.id, { name: 'Cliente sconosciuto', city: '' });
        }
      }

      // 5. Calcolo KM e Preparazione Dati
      let kmTotali = 0;
      let prevLat: number | undefined;
      let prevLon: number | undefined;

      const visite: VisitaDetail[] = visitsData.map(v => {
        const account = accountsMap.get(v.account_id);
        
        // --- Logica Calcolo KM ---
        if (account?.lat && account?.lon) {
          if (prevLat !== undefined && prevLon !== undefined) {
            // Se c'era una tappa precedente, calcola distanza
            const dist = calculateDistance(prevLat, prevLon, account.lat, account.lon);
            kmTotali += dist;
          }
          // Aggiorna posizione corrente
          prevLat = account.lat;
          prevLon = account.lon;
        }
        // -------------------------

        const dataOra = new Date(v.data_visita).toLocaleString('it-IT', {
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit'
        });

        return {
          dataOra,
          nomeCliente: account?.name || 'Sconosciuto',
          cittaCliente: account?.city || '',
          tipo: v.tipo,
          esito: v.esito || 'altro',
          importoVendita: v.importo_vendita ? parseFloat(v.importo_vendita as any) : null,
          noteVisita: v.notes || null,
        };
      });

      // 6. Totali e PDF
      const numVisite = visite.length;
      const numClienti = uniqueAccountIds.length;
      const fatturatoTotale = visite.reduce((sum, v) => sum + (v.importoVendita || 0), 0);

      const formatDate = (d: string) => new Date(d).toLocaleDateString('it-IT');
      const periodoFormattato = formData.dataInizio === formData.dataFine 
        ? formatDate(formData.dataInizio) 
        : `${formatDate(formData.dataInizio)} - ${formatDate(formData.dataFine)}`;

      const reportData: ReportVisiteData = {
        nomeAgente: user.email?.split('@')[0] || 'Agente',
        dataInizio: formData.dataInizio,
        dataFine: formData.dataFine,
        periodoFormattato,
        numVisite,
        numClienti,
        fatturatoTotale,
        kmTotali, // Passiamo i KM calcolati
        visite,
      };

      const pdfBlob = await generateReportVisite(reportData);
      const filename = generateVisiteFilename(formData.dataInizio, formData.dataFine);
      const filePath = await savePdfToDevice(pdfBlob, filename);

      if (filePath) {
        const metadataForDB: DocumentMetadata = {
          data_inizio: formData.dataInizio,
          data_fine: formData.dataFine,
          num_visite: numVisite,
          num_clienti: numClienti,
          fatturato_tot: fatturatoTotale,
          km_tot: kmTotali,
        };
        
        await saveDocumentMetadata({
          document_type: 'report_planning', 
          title: `Report Visite - ${periodoFormattato}`,
          filename,
          file_path: filePath,
          metadata: metadataForDB,
          file_size: pdfBlob.size,
        });

        alert(`✅ Report Generato!\n\n📊 Statistiche:\nVisite: ${numVisite}\nFatturato: €${fatturatoTotale.toFixed(2)}\nPercorso: ${kmTotali.toFixed(1)} km`);
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }

    } catch (e: any) {
      console.error('[Report] Errore:', e);
      alert(`Errore: ${e.message}`);
    }
  }

  // Se siamo in modalità diretta (dal planning), eseguiamo subito al click
  if (isDirectMode && data) {
    return (
      <button
        onClick={() => handleGenerate({
          periodoType: 'giorno',
          dataInizio: data,
          dataFine: data
        })}
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
        📄 Genera Report Giornata
      </button>
    );
  }

  // Altrimenti mostra il form standard
  return (
    <ReportVisiteForm
      onBack={onClose || (() => {})}
      onGenerate={handleGenerate}
    />
  );
}
