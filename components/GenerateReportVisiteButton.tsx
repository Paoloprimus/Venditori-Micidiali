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
  formatDateItalian,
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
  data?: string; // formato: "2025-11-08" (opzionale se passato da form)
  accountIds?: string[]; // IDs clienti del piano (opzionale)
  onSuccess?: () => void;
  onClose?: () => void;
};

// --- Helpers per calcolo distanze e tempi ---

// OSRM per distanza stradale
async function getRoadDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) return 0;
    return json.routes[0].distance / 1000;
  } catch { return 0; }
}

// Haversine (fallback)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Format durata (minuti -> Xh Ym)
function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function GenerateReportButton({ data, accountIds, onSuccess, onClose }: Props) {
  const { crypto } = useCrypto();
  const [generating, setGenerating] = useState(false);
  
  // Se data e accountIds sono passati, siamo in "modalità diretta" (dal planning)
  const isDirectMode = !!(data && accountIds);

  async function handleGenerate(formData: FormData) {
    if (!crypto || typeof crypto.decryptFields !== 'function') {
      alert('Crittografia non disponibile');
      return;
    }

    setGenerating(true);
    try {
      // 1. Recupera user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      // 2. Recupera Piano per orario inizio (START UFFICIALE)
      // Solo se siamo in mode giornaliero (data singola)
      let planStartTime: Date | null = null;
      const targetDate = formData.dataInizio;
      
      if (formData.dataInizio === formData.dataFine) {
        const { data: plan } = await supabase
            .from('daily_plans')
            .select('route_data')
            .eq('user_id', user.id)
            .eq('data', targetDate)
            .single();
        
        if (plan?.route_data?.started_at) {
            planStartTime = new Date(plan.route_data.started_at);
            console.log('[Report] Start Piano (DB):', planStartTime.toLocaleString());
        }
      }

      // 3. Recupera visite del periodo
      // Ordinate per data_visita (che è il timestamp di chiusura/salvataggio)
      let visitsQuery = supabase
        .from('visits')
        .select('id, account_id, tipo, data_visita, esito, importo_vendita, notes, durata')
        .eq('user_id', user.id)
        .gte('data_visita', `${formData.dataInizio}T00:00:00`)
        .lte('data_visita', `${formData.dataFine}T23:59:59`)
        .order('data_visita', { ascending: true }); // Cronologico

      // Se siamo in direct mode, filtriamo per gli account specifici del piano
      if (isDirectMode && accountIds) {
        visitsQuery = visitsQuery.in('account_id', accountIds);
      }

      const { data: visitsData, error: visitsError } = await visitsQuery;
      if (visitsError) throw visitsError;

      if (!visitsData || visitsData.length === 0) {
        alert('Nessuna visita trovata nel periodo selezionato');
        setGenerating(false);
        return;
      }

      // 4. Recupera dati clienti
      const clientIds = [...new Set(visitsData.map(v => v.account_id))];
      const { data: clientsData, error: clientsError } = await supabase
        .from('accounts')
        .select('id, name_enc, name_iv, city, latitude, longitude')
        .in('id', clientIds);

      if (clientsError) throw clientsError;

      // 5. Decifra nomi clienti
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
            c.id,
            recordForDecrypt,
            ['name']
          );

          const dec = toObj(decAny);

          accountsMap.set(c.id, {
            name: String(dec.name ?? 'Cliente senza nome'),
            city: c.city || '',
            lat: c.latitude ? parseFloat(c.latitude) : undefined,
            lon: c.longitude ? parseFloat(c.longitude) : undefined
          });
        } catch (e) {
          console.error('[Report] Errore decrypt cliente:', c.id, e);
          accountsMap.set(c.id, { name: 'Sconosciuto', city: '' });
        }
      }

      // 6. Calcoli KM e TEMPI
      let kmTotali = 0;
      let prevLat: number | undefined;
      let prevLon: number | undefined;
      let totalVisitMinutes = 0;

      // --- LOGICA TEMPI ---
      const firstVisit = visitsData[0];
      const lastVisit = visitsData[visitsData.length - 1];

      // Calcoliamo quando è iniziata effettivamente la prima visita
      const firstVisitEndTime = new Date(firstVisit.data_visita).getTime();
      const firstVisitStartTime = firstVisitEndTime - ((firstVisit.durata || 0) * 60000);
      
      // L'inizio della giornata è il MINIMO tra "Avvia Piano" e "Inizio Prima Visita"
      // Questo corregge i casi in cui l'utente preme "Avvia" in ritardo o mai
      let startDayMs = firstVisitStartTime;
      
      if (planStartTime) {
         const planStartMs = planStartTime.getTime();
         // Se il piano è stato avviato PRIMA della prima visita (caso normale), usiamo quello
         // Se è stato avviato DOPO (dimenticanza), usiamo l'inizio della visita
         if (planStartMs < firstVisitStartTime) {
            startDayMs = planStartMs; 
         } else {
            console.warn('[Report] Start Piano successivo alla prima visita, uso inizio visita.');
         }
      }

      // Fine giornata = Fine ultima visita
      const endDayMs = new Date(lastVisit.data_visita).getTime();
      
      // Tempo totale lavoro
      const totalWorkMinutes = Math.max(0, Math.round((endDayMs - startDayMs) / 60000));

      // Ciclo visite per KM e Durata Visite
      for (const visit of visitsData) {
        const account = accountsMap.get(visit.account_id);
        
        // Km: calcola distanza dalla tappa precedente
        if (account?.lat && account?.lon) {
          if (prevLat !== undefined && prevLon !== undefined) {
            const dist = await getRoadDistance(prevLat, prevLon, account.lat, account.lon);
            kmTotali += dist;
          }
          prevLat = account.lat;
          prevLon = account.lon;
        }

        // Tempo visite (somma delle durate effettive registrate)
        totalVisitMinutes += (visit.durata || 0);
      }

      // Tempo viaggio = Tempo Totale (da inizio a fine) - Tempo passato effettivamente in visita
      // Se per qualche motivo (es. test rapidi) il totale è minore delle visite, mettiamo 0
      const travelMinutes = Math.max(0, totalWorkMinutes - totalVisitMinutes);

      // 7. Prepara dati per report
      const visite: VisitaDetail[] = visitsData.map((v) => {
        const client = accountsMap.get(v.account_id);
        const dataOra = new Date(v.data_visita).toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit'
        });

        return {
          dataOra,
          nomeCliente: client?.name || 'N/A',
          cittaCliente: client?.city || '',
          tipo: v.tipo || 'visita',
          esito: v.esito || 'altro',
          importoVendita: v.importo_vendita ? parseFloat(v.importo_vendita as any) : null,
          noteVisita: v.notes || null,
          durataMinuti: v.durata || null,
        };
      });

      const numClienti = clientIds.length;
      const fatturatoTotale = visite.reduce((sum, v) => sum + (v.importoVendita || 0), 0);

      const reportData: ReportVisiteData = {
        nomeAgente: user.email?.split('@')[0] || 'Agente',
        dataInizio: formData.dataInizio,
        dataFine: formData.dataFine,
        periodoFormattato: formatDateItalian(formData.dataInizio),
        numVisite: visite.length,
        numClienti,
        fatturatoTotale,
        kmTotali,
        tempoTotaleOre: formatDuration(totalWorkMinutes),
        tempoVisiteOre: formatDuration(totalVisitMinutes),
        tempoViaggioOre: formatDuration(travelMinutes),
        visite,
      };

      // 8. Genera e salva PDF
      const pdfBlob = await generateReportVisite(reportData);
      const filename = generateVisiteFilename(formData.dataInizio, formData.dataFine);
      const filePath = await savePdfToDevice(pdfBlob, filename);

      if (!filePath) {
        alert('Download PDF annullato');
        setGenerating(false);
        return;
      }

      // 9. Salva metadata nel DB
      const metadataForDB: DocumentMetadata = {
        data_inizio: formData.dataInizio,
        data_fine: formData.dataFine,
        num_visite: visite.length,
        num_clienti: numClienti,
        fatturato_tot: fatturatoTotale,
        km_tot: kmTotali,
      };

      await saveDocumentMetadata({
        document_type: 'report_planning',
        title: `Report Visite - ${formatDateItalian(formData.dataInizio)}`,
        filename,
        file_path: filePath,
        metadata: metadataForDB,
        file_size: pdfBlob.size,
      });

      alert(`✅ Report generato!\nTempo Totale: ${formatDuration(totalWorkMinutes)}\nTempo Visite: ${formatDuration(totalVisitMinutes)}\nTempo Spostamenti: ${formatDuration(travelMinutes)}`);
      
      if (onClose) onClose();
      if (onSuccess) onSuccess();

    } catch (e: any) {
      console.error('[Report] Errore generazione:', e);
      alert(`Errore: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  }

  // Render differenziato: Bottone diretto o Form
  if (isDirectMode && data) {
    return (
      <button
        onClick={() => handleGenerate({
          periodoType: 'giorno',
          dataInizio: data,
          dataFine: data
        })}
        disabled={generating}
        style={{
          padding: '12px 24px',
          borderRadius: 8,
          border: 'none',
          background: generating ? '#9ca3af' : '#2563eb',
          color: 'white',
          fontWeight: 600,
          cursor: generating ? 'not-allowed' : 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {generating ? '⏳ Generazione...' : '📄 Genera Report Giornata'}
      </button>
    );
  }

  return (
    <ReportVisiteForm
      onBack={onClose || (() => {})}
      onGenerate={handleGenerate}
    />
  );
}
