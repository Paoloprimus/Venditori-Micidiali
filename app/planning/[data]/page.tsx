'use client';

/**
 * PAGINA: Editor Piano Giornaliero
 * * PERCORSO: /app/planning/[data]/page.tsx
 * URL: https://reping.app/planning/2025-11-05
 * * DESCRIZIONE:
 * Editor per creare e modificare piani di visita giornalieri.
 * Include algoritmo AI per suggerimenti intelligenti e ottimizzazione percorso.
 * * FUNZIONALITÀ:
 * - Modalità Smart: AI suggerisce 5-10 clienti ottimali
 * - Modalità Avanzata: selezione manuale con tutti i clienti
 * - Algoritmo punteggi AI (latenza, distanza, revenue, note)
 * - Ottimizzazione percorso geografico (TSP)
 * - Riordinamento manuale (Su/Giù)
 * - Salvataggio piano in daily_plans
 * - Status: draft → active → completed
 */

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useDrawers, DrawersWithBackdrop } from '@/components/Drawers';
import TopBar from '@/components/home/TopBar';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';

type Client = {
  id: string;
  name: string;
  city: string;
  tipo_locale: string;
  latitude: number;
  longitude: number;
  ultimo_esito: string | null;
  ultimo_esito_at: string | null;
  volume_attuale: number | null;
  custom: any;
};

type ScoredClient = Client & {
  score: number;
  scoreBreakdown: {
    latency: number;
    distance: number;
    revenue: number;
    notes: number;
  };
  daysAgo: number;
};

type DailyPlan = {
  id?: string;
  data: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  account_ids: string[];
  route_data: any;
  notes: string;
};

export default function PlanningEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { crypto, ready } = useCrypto();
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  const actuallyReady = crypto && typeof crypto.isUnlocked === 'function' && crypto.isUnlocked();

  async function logout() {
    try { sessionStorage.removeItem("repping:pph"); } catch {}
    try { localStorage.removeItem("repping:pph"); } catch {}
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Stato
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [mode, setMode] = useState<'smart' | 'advanced'>('smart');
  const [numClients, setNumClients] = useState(6);
  const [scoredClients, setScoredClients] = useState<ScoredClient[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [planNotes, setPlanNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const dataStr = params.data as string; // YYYY-MM-DD

  // Carica dati
  useEffect(() => {
    if (actuallyReady) {
      loadData();
    }
  }, [actuallyReady, dataStr]);

  async function loadData() {
    setLoading(true);
    try {
      if (!crypto || typeof crypto.decryptFields !== 'function') {
        console.error('Crypto non disponibile o decryptFields non presente');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Carica clienti
      const { data: clientsData, error: clientsError } = await supabase
        .from('accounts')
        .select('id, name_enc, name_iv, city, tipo_locale, latitude, longitude, ultimo_esito, ultimo_esito_at, volume_attuale, custom')
        .eq('user_id', user.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (clientsError) throw clientsError;

      // Decifra nomi clienti
      const decryptedClients: Client[] = [];
      
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
      
      for (const c of clientsData || []) {
        try {
          const recordForDecrypt = {
            ...c,
            name_enc: hexToBase64(c.name_enc),
            name_iv: hexToBase64(c.name_iv),
          };
          
          const decAny = await crypto.decryptFields(
            'table:accounts',
            'accounts',
            c.id,
            recordForDecrypt,
            ['name']
          );
          
          const dec = toObj(decAny);
          
          decryptedClients.push({
            id: c.id,
            name: String(dec.name ?? 'Cliente senza nome'),
            city: c.city || '',
            tipo_locale: c.tipo_locale || '',
            latitude: parseFloat(c.latitude),
            longitude: parseFloat(c.longitude),
            ultimo_esito: c.ultimo_esito,
            ultimo_esito_at: c.ultimo_esito_at,
            volume_attuale: c.volume_attuale ? parseFloat(c.volume_attuale) : null,
            custom: c.custom || {},
          });
        } catch (e) {
          console.error('[Planning] Errore decrypt cliente:', e);
          decryptedClients.push({
            id: c.id,
            name: `Cliente #${c.id.slice(0, 8)}`,
            city: c.city || '',
            tipo_locale: c.tipo_locale || '',
            latitude: parseFloat(c.latitude),
            longitude: parseFloat(c.longitude),
            ultimo_esito: c.ultimo_esito,
            ultimo_esito_at: c.ultimo_esito_at,
            volume_attuale: c.volume_attuale ? parseFloat(c.volume_attuale) : null,
            custom: c.custom || {},
          });
        }
      }

      setClients(decryptedClients);

      // Carica piano esistente
      const { data: planData, error: planError } = await supabase
        .from('daily_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('data', dataStr)
        .maybeSingle();

      if (planError && planError.code !== 'PGRST116') throw planError;

      if (planData) {
        setPlan(planData);
        setSelectedIds(planData.account_ids || []);
        setPlanNotes(planData.notes || '');
      }

      setIsDirty(false);

    } catch (e: any) {
      console.error('Errore caricamento dati:', e);
      alert(`Errore: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Calcola punteggi AI
  useEffect(() => {
    if (clients.length === 0) return;
    const scored = clients.map(client => calculateScore(client));
    scored.sort((a, b) => b.score - a.score);
    setScoredClients(scored);
  }, [clients]);

  // Calcola punteggio AI
  function calculateScore(client: Client): ScoredClient {
    const today = new Date(dataStr);

    let latencyScore = 0;
    let daysAgo = 0;
    if (client.ultimo_esito_at) {
      const lastVisit = new Date(client.ultimo_esito_at);
      daysAgo = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo >= 30) latencyScore = 100;
      else if (daysAgo >= 21) latencyScore = 80;
      else if (daysAgo >= 14) latencyScore = 60;
      else if (daysAgo >= 7) latencyScore = 40;
      else if (daysAgo >= 3) latencyScore = 20;
      else latencyScore = 10;
    } else {
      latencyScore = 100;
      daysAgo = 999;
    }

    let distanceScore = 50;
    if (selectedIds.length > 0) {
      const selectedClients = clients.filter(c => selectedIds.includes(c.id));
      const distances = selectedClients.map(sc => 
        calculateDistance(client.latitude, client.longitude, sc.latitude, sc.longitude)
      );
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      if (avgDistance < 5) distanceScore = 100;
      else if (avgDistance < 10) distanceScore = 80;
      else if (avgDistance < 20) distanceScore = 60;
      else if (avgDistance < 30) distanceScore = 40;
      else distanceScore = 20;
    }

    let revenueScore = 0;
    if (client.volume_attuale) {
      if (client.volume_attuale >= 1000) revenueScore = 100;
      else if (client.volume_attuale >= 750) revenueScore = 80;
      else if (client.volume_attuale >= 500) revenueScore = 60;
      else if (client.volume_attuale >= 250) revenueScore = 40;
      else revenueScore = 20;
    } else {
      revenueScore = 30;
    }

    let notesScore = 0;
    const notes = client.custom?.notes || '';
    const notesLower = notes.toLowerCase();
    const urgentKeywords = ['urgente', 'richiamare', 'importante', 'priorit', 'subito', 'asap'];
    const positiveKeywords = ['interessato', 'caldo', 'ordine', 'acquisto'];
    if (urgentKeywords.some(kw => notesLower.includes(kw))) {
      notesScore = 100;
    } else if (positiveKeywords.some(kw => notesLower.includes(kw))) {
      notesScore = 60;
    } else if (notes.trim()) {
      notesScore = 30;
    }

    const finalScore = Math.round(
      (latencyScore * 0.32) + (distanceScore * 0.28) + (revenueScore * 0.25) + (notesScore * 0.20)
    );

    return {
      ...client,
      score: finalScore,
      scoreBreakdown: { latency: latencyScore, distance: distanceScore, revenue: revenueScore, notes: notesScore },
      daysAgo,
    };
  }

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  function handleSmartSuggestion() {
    const topClients = scoredClients.slice(0, numClients);
    const ids = topClients.map(c => c.id);
    setSelectedIds(ids);
    setIsDirty(true);
  }

  function optimizeRoute() {
    if (selectedIds.length <= 1) return;
    const selectedClientsList = selectedIds.map(id => clients.find(c => c.id === id)).filter((c): c is Client => !!c);
    const ordered: Client[] = [];
    const remaining = [...selectedClientsList];
    
    // Inizia dal primo della lista corrente (o potremmo scegliere il più vicino all'ufficio se avessimo le coordinate)
    ordered.push(remaining.shift()!);
    
    while (remaining.length > 0) {
      const current = ordered[ordered.length - 1];
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dist = calculateDistance(current.latitude, current.longitude, remaining[i].latitude, remaining[i].longitude);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
      ordered.push(remaining.splice(nearestIdx, 1)[0]);
    }
    
    setSelectedIds(ordered.map(c => c.id));
    setIsDirty(true);
  }

  function toggleClient(id: string) {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
    setIsDirty(true);
  }

  // 🆕 Sposta visita SU
  function moveUp(index: number) {
    if (index === 0) return;
    const newIds = [...selectedIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    setSelectedIds(newIds);
    setIsDirty(true);
  }

  // 🆕 Sposta visita GIÙ
  function moveDown(index: number) {
    if (index === selectedIds.length - 1) return;
    const newIds = [...selectedIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    setSelectedIds(newIds);
    setIsDirty(true);
  }

  async function savePlan() {
    if (selectedIds.length === 0) {
      alert('Seleziona almeno un cliente');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const planData = {
        user_id: user.id,
        data: dataStr,
        account_ids: selectedIds,
        route_data: {},
        notes: planNotes,
        status: plan?.status || 'draft',
      };

      let updatedPlan;
      if (plan?.id) {
        const { data, error } = await supabase.from('daily_plans').update(planData).eq('id', plan.id).select().single();
        if (error) throw error;
        updatedPlan = data;
      } else {
        const { data, error } = await supabase.from('daily_plans').insert(planData).select().single();
        if (error) throw error;
        updatedPlan = data;
      }

      setPlan(updatedPlan);
      setIsDirty(false);
      
    } catch (e: any) {
      console.error('Errore salvataggio:', e);
      alert(`Errore: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function activatePlan() {
    if (!plan?.id) {
      alert('Devi prima salvare il piano');
      return;
    }
    if (selectedIds.length === 0) {
      alert('Seleziona almeno un cliente per attivare il piano');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('daily_plans').update({ status: 'active' }).eq('id', plan.id);
      if (error) throw error;
      router.push(`/planning/${dataStr}/execute`);
    } catch (e: any) {
      console.error('Errore attivazione:', e);
      alert(`Errore: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  if (!actuallyReady) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>🔐 Sblocco crittografia...</h2>
        <p style={{ color: '#6b7280' }}>Attendere il caricamento del sistema di cifratura.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>⏳ Caricamento...</h2>
      </div>
    );
  }

  // ✅ FIX VISUALIZZAZIONE: Mappa gli ID all'oggetto cliente per mantenere l'ordine
  const selectedClients = selectedIds
    .map(id => clients.find(c => c.id === id))
    .filter((c): c is Client => !!c);

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <TopBar
          title="✏️ Piano Giornaliero"
          onOpenLeft={openLeft}
          onOpenDati={openDati}
          onOpenDocs={openDocs}
          onOpenImpostazioni={openImpostazioni}
          onLogout={logout}
        />
      </div>

      <DrawersWithBackdrop
        leftOpen={leftOpen}
        onCloseLeft={closeLeft}
        rightOpen={rightOpen}
        rightContent={rightContent}
        onCloseRight={closeRight}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '90px 24px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => router.push('/planning')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer',
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            ← Torna al Calendario
          </button>

          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            {formatDate(dataStr)}
          </h1>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ 
              padding: '4px 12px', 
              borderRadius: 6, 
              background: plan?.status === 'active' ? '#dbeafe' : '#f3f4f6',
              color: plan?.status === 'active' ? '#1e40af' : '#6b7280',
              fontSize: 13,
              fontWeight: 600,
            }}>
              {plan?.status === 'draft' && '📝 Bozza'}
              {plan?.status === 'active' && '▶️ Attivo'}
              {plan?.status === 'completed' && '✅ Completato'}
              {!plan && '📝 Nuovo Piano'}
            </span>

            <span style={{ fontSize: 14, color: '#6b7280' }}>
              {selectedIds.length} {selectedIds.length === 1 ? 'visita' : 'visite'} pianificate
            </span>
          </div>
        </div>

        {/* Modalità */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => setMode('smart')}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: mode === 'smart' ? '2px solid #2563eb' : '1px solid #d1d5db',
                background: mode === 'smart' ? '#eff6ff' : 'white',
                color: mode === 'smart' ? '#1e40af' : '#6b7280',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🤖 Piano Smart
            </button>

            <button
              onClick={() => setMode('advanced')}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: mode === 'advanced' ? '2px solid #2563eb' : '1px solid #d1d5db',
                background: mode === 'advanced' ? '#eff6ff' : 'white',
                color: mode === 'advanced' ? '#1e40af' : '#6b7280',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⚙️ Editor Avanzato
            </button>
          </div>

          {/* Modalità Smart */}
          {mode === 'smart' && (
            <div style={{ background: '#f9fafb', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
                🤖 Suggerimenti AI Intelligenti
              </h2>

              <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
                L'intelligenza artificiale seleziona automaticamente i clienti migliori da visitare oggi 
                in base a latenza, distanza, volume vendite e note urgenti.
              </p>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 12, fontWeight: 600 }}>
                  Quanti clienti vuoi visitare oggi?
                </label>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <input
                    type="range"
                    min="5"
                    max="10"
                    value={numClients}
                    onChange={(e) => setNumClients(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', minWidth: 40 }}>
                    {numClients}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSmartSuggestion}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✨ Genera Suggerimenti AI
              </button>
            </div>
          )}

          {/* Modalità Avanzata */}
          {mode === 'advanced' && (
            <div style={{ background: '#f9fafb', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
                ⚙️ Selezione Manuale Clienti
              </h2>

              <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
                Tutti i {clients.length} clienti ordinati per punteggio AI. Seleziona quelli che vuoi visitare.
              </p>

              <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>✓</th>
                      <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Punteggio</th>
                      <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Cliente</th>
                      <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Città</th>
                      <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Ultimo Esito</th>
                      <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Giorni Fa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoredClients.map((client) => (
                      <tr key={client.id} style={{ background: selectedIds.includes(client.id) ? '#eff6ff' : 'white' }}>
                        <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(client.id)}
                            onChange={() => toggleClient(client.id)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: 4, 
                            background: client.score >= 80 ? '#dcfce7' : client.score >= 60 ? '#fef3c7' : '#f3f4f6',
                            color: client.score >= 80 ? '#15803d' : client.score >= 60 ? '#92400e' : '#6b7280',
                            fontWeight: 600,
                          }}>
                            {client.score}
                          </span>
                        </td>
                        <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb', fontWeight: 500 }}>
                          {client.name}
                        </td>
                        <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                          {client.city}
                        </td>
                        <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                          {client.ultimo_esito || '-'}
                        </td>
                        <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                          {client.daysAgo === 999 ? 'Mai' : `${client.daysAgo}gg`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Clienti Selezionati */}
        {selectedIds.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600 }}>
                📍 Visite Pianificate ({selectedIds.length})
              </h2>

              <button
                onClick={optimizeRoute}
                disabled={selectedIds.length <= 1}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: selectedIds.length <= 1 ? '#f3f4f6' : 'white',
                  cursor: selectedIds.length <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                🗺️ Ottimizza Percorso
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {selectedClients.map((client, idx) => (
                <div key={client.id} style={{ 
                  padding: 16, 
                  background: 'white', 
                  borderRadius: 8, 
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      {/* Numero sequenza */}
                      <div style={{ 
                        width: 28, 
                        height: 28, 
                        borderRadius: '50%', 
                        background: '#2563eb', 
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13
                      }}>
                        {idx + 1}
                      </div>
                    </div>

                    {/* Controlli Riordino */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button 
                        onClick={() => moveUp(idx)} 
                        disabled={idx === 0}
                        style={{ 
                          opacity: idx === 0 ? 0.3 : 1, 
                          cursor: idx === 0 ? 'default' : 'pointer',
                          fontSize: 12,
                          background: 'none',
                          border: 'none'
                        }}
                      >
                        ▲
                      </button>
                      <button 
                        onClick={() => moveDown(idx)} 
                        disabled={idx === selectedClients.length - 1}
                        style={{ 
                          opacity: idx === selectedClients.length - 1 ? 0.3 : 1, 
                          cursor: idx === selectedClients.length - 1 ? 'default' : 'pointer',
                          fontSize: 12,
                          background: 'none',
                          border: 'none'
                        }}
                      >
                        ▼
                      </button>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{client.name}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        {client.city} • {client.tipo_locale}
                        {client.ultimo_esito_at && (
                          <> • Ultima visita: {new Date(client.ultimo_esito_at).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleClient(client.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid #ef4444',
                      background: 'white',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Rimuovi
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note Giornata */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>📝 Note Giornata</h2>
          
          <textarea
            value={planNotes}
            onChange={(e) => {
              setPlanNotes(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Es. Focus su zona Verona Est, consegne nuovi prodotti..."
            rows={4}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 14,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Azioni */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => router.push('/planning')}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ← Annulla
          </button>

          <button
            onClick={savePlan}
            disabled={saving || selectedIds.length === 0 || !isDirty}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              background: saving || selectedIds.length === 0 || !isDirty ? '#9ca3af' : '#10b981',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: saving || selectedIds.length === 0 || !isDirty ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? '⏳ Salvataggio...' : (!isDirty && plan?.id ? '✅ Piano Salvato' : '💾 Salva Piano')}
          </button>

          {/* Bottone Avvia Giornata (solo se draft e salvato) */}
          {plan?.status === 'draft' && plan?.id && (
            <button
              onClick={activatePlan}
              disabled={saving || selectedIds.length === 0}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: 'none',
                background: saving || selectedIds.length === 0 ? '#9ca3af' : '#2563eb',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: saving || selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              🟢 Avvia Giornata
            </button>
          )}

          {/* Bottone Vai alle Visite (se piano attivo o completato) */}
          {(plan?.status === 'active' || plan?.status === 'completed') && (
            <button
              onClick={() => router.push(`/planning/${dataStr}/execute`)}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#10b981',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ▶️ Vai alle Visite
            </button>
          )}
        </div>
      </div>
    </>
  );
}
