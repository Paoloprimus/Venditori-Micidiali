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
  data?: string;        // Opzionale (solo per modalità diretta da Planning)
  accountIds?: string[]; // Opzionale (solo per modalità diretta da Planning)
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

export default function GenerateReportVisiteButton({ data, accountIds, onSuccess, onClose }: Props) {
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

      // 1. Recupera Piano per orario inizio (START UFFICIALE)
      // Cerchiamo lo start time solo se il report è giornaliero
      let planStartTime: Date | null = null;
      if (formData.dataInizio === formData.dataFine) {
          const { data: plan } = await supabase
              .from('daily_plans')
              .select('route_data')
              .eq('user_id', user.id)
              .eq('data', formData.dataInizio)
              .single();
          
          if (plan?.route_data?.started_at) {
              planStartTime = new Date(plan.route_data.started_at);
              console.log('[Report] Start Piano (DB):', planStartTime.toLocaleString());
          }
      }

      // 2. Recupera visite del periodo
      let visitsQuery = supabase
        .from('visits')
        .select('id, account_id, tipo, data_visita, esito, importo_vendita, notes, durata')
        .eq('user_id', user.id)
        .gte('data_visita', `${formData.dataInizio}T00:00:00`)
        .lte('data_visita', `${formData.dataFine}T23:59:59`)
        .order('data_visita', { ascending: true }); // Cronologico

      // Se siamo in direct mode, filtriamo solo i clienti del piano
      if (isDirectMode && accountIds) {
        visitsQuery = visitsQuery.in('account_id', accountIds);
      }

      const { data: visitsData, error: visitsError } = await visitsQuery;
      if (visitsError) throw visitsError;

      if (!visitsData || visitsData.length === 0) {
        alert('Nessuna visita trovata nel periodo selezionato');
        return;
      }

      // 3. Recupera dati clienti
      const clientIds = [...new Set(visitsData.map(v => v.account_id))];
      const { data: clientsData, error: clientsError } = await supabase
        .from('accounts')
        .select('id, name_enc, name_iv, city, latitude, longitude')
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

      // 5. Calcoli KM e TEMPI
      let kmTotali = 0;
      let prevLat: number | undefined;
      let prevLon: number | undefined;
      let totalVisitMinutes = 0;

      // --- LOGICA TEMPI ---
      const firstVisit = visitsData[0];
      const lastVisit
