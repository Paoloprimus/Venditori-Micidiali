// components/GenerateReportVisiteButton.tsx
'use client';

// ... imports (uguali a prima)
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
  data?: string;
  accountIds?: string[];
};

// OSRM / Haversine helpers (uguali a prima)
async function getRoadDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> {
    // ... (copia la funzione getRoadDistance dal turno precedente) ...
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
        const res = await fetch(url);
        if (!res.ok) return 0;
        const json = await res.json();
        if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) return 0;
        return json.routes[0].distance / 1000;
    } catch { return 0; }
}
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // ... (copia la funzione calculateDistance dal turno precedente per fallback) ...
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

// Helper per formattare minuti in "Xh Ym"
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function GenerateReportVisiteButton({ onSuccess, onClose, data, accountIds }: Props) {
  const { crypto } = useCrypto();
  const isDirectMode = !!(data && accountIds);

  async function handleGenerate(formData: FormData) {
    if (!crypto || typeof crypto.decryptFields !== 'function') {
      alert('Crittografia non disponibile');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      // 1. Fetch Plan (per avere l'orario di inizio giornata)
      // Solo se siamo in direct mode (giornaliero). Se è periodo, skip start time logic.
      let dayStartTime: Date | null = null;
      if (isDirectMode && data) {
        const { data: plan } = await supabase
            .from('daily_plans')
            .select('updated_at') // updated_at è quando è passato ad 'active'
            .eq('user_id', user.id)
            .eq('data', data)
            .single();
        if (plan?.updated_at) {
            dayStartTime = new Date(plan.updated_at);
        }
      }

      // 2. Query visite (come prima)
      let visitsQuery = supabase
        .from('visits')
        .select('id, account_id, tipo, data_visita, esito, importo_vendita, notes, durata') // Aggiunto durata
        .eq('user_id', user.id)
        .gte('data_visita', `${formData.dataInizio}T00:00:00`)
        .lte('data_visita', `${formData.dataFine}T23:59:59`)
        .order('data_visita', { ascending: true });

      if (isDirectMode && accountIds) {
        visitsQuery = visitsQuery.in('account_id', accountIds);
      }

      const { data: visitsData, error: visitsError } = await visitsQuery;
      if (visitsError) throw visitsError;
      if (!visitsData || visitsData.length === 0) { alert('Nessuna visita'); return; }

      // ... (Caricamento e decrypt account identico a prima - Ometto per brevità, USA QUELLO DI PRIMA)
      // Placeholder per recupero accounts
      const uniqueAccountIds = [...new Set(visitsData.map(v => v.account_id))];
      const { data: accountsData } = await supabase.from('accounts').select('id, name_enc, name_iv, city, latitude, longitude').in('id', uniqueAccountIds);
      const accountsMap = new Map<string, any>();
      // ... Decrypt logic here (copia dal file precedente) ...
      // Assumiamo accountsMap popolata
      const hexToBase64 = (hexStr: any) => { if (!hexStr || typeof hexStr !== 'string') return ''; if (!hexStr.startsWith('\\x')) return hexStr; return hexStr.slice(2).match(/.{1,2}/g)?.map((b:any) => String.fromCharCode(parseInt(b, 16))).join('') || ''; };
      for (const acc of accountsData || []) {
          try {
             const dec = await (crypto as any).decryptFields('table:accounts', 'accounts', acc.id, {...acc, name_enc: hexToBase64(acc.name_enc), name_iv: hexToBase64(acc.name_iv)}, ['name']);
             accountsMap.set(acc.id, { name: dec.name || 'Cliente', city: acc.city, lat: acc.latitude ? parseFloat(acc.latitude) : undefined, lon: acc.longitude ? parseFloat(acc.longitude) : undefined });
          } catch { accountsMap.set(acc.id, { name: 'Err', city: '' }); }
      }
      // Fine placeholder

      // 3. CALCOLO KM e TEMPI
      let kmTotali = 0;
      let prevLat: number | undefined;
      let prevLon: number | undefined;
      
      let totalVisitMinutes = 0;

      // Calcolo tempi totali
      // Inizio = dayStartTime (se disponibile) oppure inizio prima visita
      // Fine = fine ultima visita
      const firstVisitEnd = new Date(visitsData[0].data_visita);
      const lastVisitEnd = new Date(visitsData[visitsData.length - 1].data_visita);
      
      const startTime = dayStartTime || new Date(firstVisitEnd.getTime() - ((visitsData[0].durata || 0) * 60000));
      const endTime = lastVisitEnd;
      
      const totalWorkMinutes = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000));

      for (const visit of visitsData) {
        const account = accountsMap.get(visit.account_id);
        
        // Km
        if (account?.lat && account?.lon) {
          if (prevLat !== undefined && prevLon !== undefined) {
            const dist = await getRoadDistance(prevLat, prevLon, account.lat, account.lon);
            kmTotali += dist;
          }
          prevLat = account.lat;
          prevLon = account.lon;
        }

        // Tempo visite
        totalVisitMinutes += (visit.durata || 0);
      }

      // Tempo viaggio = Totale - Visite
      const travelMinutes = Math.max(0, totalWorkMinutes - totalVisitMinutes);

      // Preparazione dati PDF
      const visite: VisitaDetail[] = visitsData.map(v => {
        const account = accountsMap.get(v.account_id);
        return {
          dataOra: new Date(v.data_visita).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }), // Solo ora
          nomeCliente: account?.name || 'Sconosciuto',
          cittaCliente: account?.city || '',
          tipo: v.tipo,
          esito: v.esito || 'altro',
          importoVendita: v.importo_vendita ? parseFloat(v.importo_vendita as any) : null,
          noteVisita: v.notes || null,
          durataMinuti: v.durata || null,
        };
      });

      // ... (Format date e build reportData)
       const formatDate = (d: string) => new Date(d).toLocaleDateString('it-IT');
       const periodoFormattato = formData.dataInizio === formData.dataFine ? formatDate(formData.dataInizio) : `${formatDate(formData.dataInizio)} - ${formatDate(formData.dataFine)}`;
       const fatturatoTotale = visite.reduce((sum, v) => sum + (v.importoVendita || 0), 0);

      const reportData: ReportVisiteData = {
        nomeAgente: user.email?.split('@')[0] || 'Agente',
        dataInizio: formData.dataInizio,
        dataFine: formData.dataFine,
        periodoFormattato,
        numVisite: visite.length,
        numClienti: uniqueAccountIds.length,
        fatturatoTotale,
        kmTotali,
        // Nuovi campi
        tempoTotaleOre: formatDuration(totalWorkMinutes),
        tempoVisiteOre: formatDuration(totalVisitMinutes),
        tempoViaggioOre: formatDuration(travelMinutes),
        visite,
      };

      const pdfBlob = await generateReportVisite(reportData);
      const filename = generateVisiteFilename(formData.dataInizio, formData.dataFine);
      const filePath = await savePdfToDevice(pdfBlob, filename);
      
      if (filePath) {
         const metadataForDB: DocumentMetadata = {
          data_inizio: formData.dataInizio,
          data_fine: formData.dataFine,
          num_visite: visite.length,
          num_clienti: uniqueAccountIds.length,
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
        alert(`✅ Report Generato!`);
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }

    } catch (e: any) {
      console.error('[Report] Errore:', e);
      alert(`Errore: ${e.message}`);
    }
  }

  if (isDirectMode && data) {
    return (
      <button onClick={() => handleGenerate({ periodoType: 'giorno', dataInizio: data, dataFine: data })} style={{ padding: '12px 24px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        📄 Genera Report Giornata
      </button>
    );
  }

  return <ReportVisiteForm onBack={onClose || (() => {})} onGenerate={handleGenerate} />;
}
