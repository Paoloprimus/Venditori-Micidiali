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

type Props = {
  data: string; // formato: "2025-11-08"
  accountIds: string[]; // IDs clienti del piano
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

// Format durata
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

      // 2. Recupera Piano per orario inizio (START UFFICIALE)
      let planStartTime: Date | null = null;
      const { data: plan } = await supabase
          .from('daily_plans')
          .select('route_data')
          .eq('user_id', user.id)
          .eq('data', data)
          .single();
      
      if (plan?.route_data?.started_at) {
          planStartTime = new Date(plan.route_data.started_at);
          console.log('[Report] Start Piano (DB):', planStartTime.toLocaleString());
      }

      // 3. Recupera visite della giornata
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('id, account_id, tipo, data_visita, esito, importo_vendita, notes, durata')
        .eq('user_id', user.id)
        .gte('data_visita', `${data}T00:00:00`)
        .lte('data_visita', `${data}T23:59:59`)
        .in('account_id', accountIds)
        .order('data_visita', { ascending: true }); // Cronologico

      if (visitsError) throw visitsError;

      if (!visitsData || visitsData.length === 0) {
        alert('Nessuna visita trovata per questa giornata');
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

      // --- LOGICA TEMPI ROBUSTA ---
      const firstVisit = visitsData[0];
      const lastVisit = visitsData[visitsData.length - 1];

      // Calcoliamo quando è iniziata effettivamente la prima visita
      const firstVisitEndTime = new Date(firstVisit.data_visita).getTime();
      const firstVisitStartTime = firstVisitEndTime - ((firstVisit.durata || 0) * 60000);
      
      // L'inizio della giornata è il MINIMO tra "Avvia Piano" e "Inizio Prima Visita"
      // Questo corregge i casi in cui l'utente preme "Avvia" in ritardo (dopo aver già fatto visite)
      let startDayMs = firstVisitStartTime;
      if (planStartTime) {
         const planStartMs = planStartTime.getTime();
         if (planStartMs < firstVisitStartTime) {
            startDayMs = planStartMs; // Start piano valido (prima della visita)
         } else {
            console.warn('[Report] Start Piano successivo alla prima visita, ignorato.');
         }
      }

      // Fine giornata = Fine ultima visita
      const endDayMs = new Date(lastVisit.data_visita).getTime();
      
      const totalWorkMinutes = Math.max(0, Math.round((endDayMs - startDayMs) / 60000));

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

      const numClienti = accountIds.length;
      const fatturatoTotale = visite.reduce((sum, v) => sum + (v.importoVendita || 0), 0);

      const reportData: ReportVisiteData = {
        nomeAgente: user.email?.split('@')[0] || 'Agente',
        dataInizio: data,
        dataFine: data,
        periodoFormattato: formatDateItalian(data),
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
      const filename = generateVisiteFilename(data, data);
      const filePath = await savePdfToDevice(pdfBlob, filename);

      if (!filePath) {
        alert('Download PDF annullato');
        setGenerating(false);
        return;
      }

      // 9. Salva metadata
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

      alert(`✅ Report generato!\nTempo Totale: ${formatDuration(totalWorkMinutes)}\nTempo Visite: ${formatDuration(totalVisitMinutes)}\nTempo Spostamenti: ${formatDuration(travelMinutes)}`);
      setShowModal(false);
      if (onSuccess) onSuccess();
      if (onClose) onClose();

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
          <div
            onClick={() => !generating && setShowModal(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
            }}
          />
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
              Verrà generato un PDF con il riepilogo completo della giornata del <strong>{formatDateItalian(data)}</strong>.
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
