'use client';

/**
 * PAGINA: Execute Piano Giornaliero
 * * PERCORSO: /app/planning/[data]/execute/page.tsx
 * URL: https://reping.app/planning/2025-11-05/execute
 * * DESCRIZIONE:
 * Interfaccia per eseguire le visite del piano giornaliero.
 * Mostra un cliente alla volta con possibilità di:
 * - Saltare (salva visita con esito='altro')
 * - Spostare in basso (riordina temporaneamente)
 * - Completare (salva visita con ordine)
 * * FIX:
 * - Corretto decryptFields passando c.id invece di stringa vuota
 */

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import { useDrawers, DrawersWithBackdrop } from '@/components/Drawers';
import TopBar from '@/components/home/TopBar';
import GenerateReportButton from '@/components/GenerateReportButton';

type Client = {
  id: string;
  name: string;
  city: string;
  tipo_locale: string;
  ultimo_esito: string | null;
  ultimo_esito_at: string | null;
  volume_attuale: number | null;
  custom: any;
};

type DailyPlan = {
  id: string;
  data: string;
  status: string;
  account_ids: string[];
  notes: string;
};

export default function ExecutePlanPage() {
  const router = useRouter();
  const params = useParams();
  const { crypto } = useCrypto();
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();
  
  const actuallyReady = crypto && typeof crypto.isUnlocked === 'function' && crypto.isUnlocked();
  const dataStr = params.data as string;

  async function logout() {
    try { sessionStorage.removeItem("repping:pph"); } catch {}
    try { localStorage.removeItem("repping:pph"); } catch {}
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  
  // Form
  const [ordine, setOrdine] = useState('');
  const [noteVisita, setNoteVisita] = useState('');
  const [saving, setSaving] = useState(false);

  // Stats
  const [completed, setCompleted] = useState(0);
  const [skipped, setSkipped] = useState(0);

  // Carica piano e clienti
  useEffect(() => {
    if (actuallyReady) {
      loadData();
    }
  }, [actuallyReady, dataStr]);

  async function loadData() {
    setLoading(true);
    try {
      if (!crypto || typeof crypto.decryptFields !== 'function') {
        console.error('Crypto non disponibile');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Carica piano
      const { data: planData, error: planError } = await supabase
        .from('daily_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('data', dataStr)
        .single();

      if (planError) throw planError;

      if (!planData || planData.status !== 'active') {
        alert('Piano non attivo. Torna al planning per attivarlo.');
        router.push(`/planning/${dataStr}`);
        return;
      }

      setPlan(planData);
      setOrderedIds([...planData.account_ids]);

      // Carica clienti del piano
      const { data: clientsData, error: clientsError } = await supabase
        .from('accounts')
        .select('id, name_enc, name_iv, city, tipo_locale, ultimo_esito, ultimo_esito_at, volume_attuale, custom')
        .eq('user_id', user.id)
        .in('id', planData.account_ids);

      if (clientsError) throw clientsError;

      // Decifra nomi (STESSO PATTERN /clients)
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

      const decryptedClients: Client[] = [];
      for (const c of clientsData || []) {
        try {
          const recordForDecrypt = {
            ...c,
            name_enc: hexToBase64(c.name_enc),
            name_iv: hexToBase64(c.name_iv),
          };

          // ✅ FIX: Passiamo c.id invece di '' come associatedData
          const decAny = await crypto.decryptFields(
            'table:accounts',
            'accounts',
            c.id, // <--- ERA '', ORA È c.id
            recordForDecrypt,
            ['name']
          );

          const dec = toObj(decAny);

          decryptedClients.push({
            id: c.id,
            name: String(dec.name ?? 'Cliente senza nome'),
            city: c.city || '',
            tipo_locale: c.tipo_locale || '',
            ultimo_esito: c.ultimo_esito,
            ultimo_esito_at: c.ultimo_esito_at,
            volume_attuale: c.volume_attuale ? parseFloat(c.volume_attuale) : null,
            custom: c.custom || {},
          });
        } catch (e) {
          console.error('[Execute] Errore decrypt:', e);
          // Fallback in caso di errore
          decryptedClients.push({
            id: c.id,
            name: 'Errore Decrypt',
            city: c.city || '',
            tipo_locale: c.tipo_locale || '',
            ultimo_esito: c.ultimo_esito,
            ultimo_esito_at: c.ultimo_esito_at,
            volume_attuale: c.volume_attuale ? parseFloat(c.volume_attuale) : null,
            custom: c.custom || {},
          });
        }
      }

      setClients(decryptedClients);

    } catch (e: any) {
      console.error('[Execute] Errore caricamento:', e);
      alert(`Errore: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Cliente corrente
  const currentClient = clients.find(c => c.id === orderedIds[currentIndex]);
  const isLast = currentIndex === orderedIds.length - 1;
  const isComplete = currentIndex >= orderedIds.length;

  // Salva visita
  async function saveVisit(esito: 'ordine_acquisito' | 'altro', ordineValue?: string) {
    if (!currentClient) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const visitData = {
        user_id: user.id,
        account_id: currentClient.id,
        tipo: 'visita',  // Tipo fisso per planning giornaliero
        data_visita: new Date(dataStr).toISOString(),
        esito: esito,
        importo_vendita: ordineValue ? parseFloat(ordineValue) : null,
        notes: noteVisita || null,
      };

      const { error } = await supabase
        .from('visits')
        .insert(visitData);

      if (error) throw error;

      console.log(`✅ Visita salvata: ${esito}`);

      // Stats
      if (esito === 'altro') setSkipped(prev => prev + 1);
      else if (esito === 'ordine_acquisito') setCompleted(prev => prev + 1);

      // Reset form
      setOrdine('');
      setNoteVisita('');

      // Prossimo cliente
      setCurrentIndex(prev => prev + 1);

    } catch (e: any) {
      console.error('[Execute] Errore salvataggio visita:', e);
      alert(`Errore: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  // AZIONI
  async function handleSkip() {
    await saveVisit('altro');
  }

  function handlePostpone() {
    if (isLast) return; // Disabilitato se ultimo

    // Sposta cliente +1 nella lista
    const newOrder = [...orderedIds];
    const temp = newOrder[currentIndex];
    newOrder[currentIndex] = newOrder[currentIndex + 1];
    newOrder[currentIndex + 1] = temp;
    setOrderedIds(newOrder);
  }

  async function handleComplete() {
    if (!ordine.trim()) {
      alert('Inserisci importo vendita');
      return;
    }
    await saveVisit('ordine_acquisito', ordine);
  }

  // Fine giornata
  useEffect(() => {
    if (isComplete && plan) {
      finishDay();
    }
  }, [isComplete, plan]);

  async function finishDay() {
    try {
      // Aggiorna status piano
      const { error } = await supabase
        .from('daily_plans')
        .update({ status: 'completed' })
        .eq('id', plan!.id);

      if (error) throw error;

      console.log('✅ Piano completato');
    } catch (e: any) {
      console.error('[Execute] Errore completamento:', e);
    }
  }

  if (!actuallyReady) {
    return (
      <>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <TopBar
            title="🎯 Esecuzione Visite"
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

        <div style={{ maxWidth: 600, margin: '0 auto', padding: '90px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>🔐 Sblocco crittografia...</h2>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <TopBar
            title="🎯 Esecuzione Visite"
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

        <div style={{ maxWidth: 600, margin: '0 auto', padding: '90px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>⏳ Caricamento piano...</h2>
        </div>
      </>
    );
  }

  // ============== SCHERMATA FINALE ============== 
  if (isComplete) {
    return (
      <>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <TopBar
            title="🎯 Esecuzione Visite"
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

        <div style={{ maxWidth: 600, margin: '0 auto', padding: '90px 24px', textAlign: 'center' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>🎉 Giornata Completata!</h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 16, 
              marginTop: 24,
              marginBottom: 32,
              padding: 24,
              background: '#f9fafb',
              borderRadius: 12,
            }}>
              <div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>✅ Completate</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>{completed}</div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>⏭️ Saltate</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>{skipped}</div>
              </div>
            </div>

            {/* NUOVO: Bottone Genera Report */}
            <div style={{ marginBottom: 24 }}>
              <GenerateReportButton 
                data={dataStr}
                accountIds={orderedIds}
              />
            </div>

            <button
              onClick={() => router.push(`/planning/${dataStr}`)}
              style={{
                padding: '12px 32px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              🔙 Torna al Planning
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!currentClient) {
    return (
      <>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <TopBar
            title="🎯 Esecuzione Visite"
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

        <div style={{ maxWidth: 600, margin: '0 auto', padding: '90px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#ef4444' }}>❌ Cliente non trovato</h2>
          <button
            onClick={() => router.push(`/planning/${dataStr}`)}
            style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer' }}
          >
            Torna al Piano
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* TopBar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <TopBar
          title="🎯 Esecuzione Visite"
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

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '90px 24px 40px' }}>
      {/* Header Progress */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Visita {currentIndex + 1} di {orderedIds.length}
          </h1>
          <button
            onClick={() => router.push(`/planning/${dataStr}`)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            🔙 Esci
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: `${((currentIndex) / orderedIds.length) * 100}%`,
            height: '100%',
            background: '#10b981',
            transition: 'width 0.3s',
          }} />
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, color: '#6b7280' }}>
          <span>✅ Fatte: {completed}</span>
          <span>⏭️ Saltate: {skipped}</span>
          <span>📍 Rimanenti: {orderedIds.length - currentIndex}</span>
        </div>
      </div>

      {/* Card Cliente */}
      <div style={{ background: 'white', borderRadius: 16, border: '2px solid #e5e7eb', padding: 32, marginBottom: 24 }}>
        {/* Info Cliente */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{currentClient.name}</h2>
          <div style={{ fontSize: 16, color: '#6b7280', marginBottom: 16 }}>
            📍 {currentClient.city} • {currentClient.tipo_locale}
          </div>

          {/* Stats Cliente */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Ultima Visita</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {currentClient.ultimo_esito_at 
                  ? new Date(currentClient.ultimo_esito_at).toLocaleDateString()
                  : 'Mai visitato'}
              </div>
              {currentClient.ultimo_esito && (
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  Esito: {currentClient.ultimo_esito}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Fatturato YTD</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {currentClient.volume_attuale 
                  ? `€${currentClient.volume_attuale.toFixed(2)}`
                  : '€0.00'}
              </div>
            </div>
          </div>

          {/* Note Cliente */}
          {currentClient.custom?.notes && (
            <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px solid #fbbf24' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>📝 Note:</div>
              <div style={{ fontSize: 14, color: '#78350f' }}>{currentClient.custom.notes}</div>
            </div>
          )}
        </div>

        {/* Form Visita */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
              💰 Importo Vendita (€) *
            </label>
            <input
              type="number"
              step="0.01"
              value={ordine}
              onChange={(e) => setOrdine(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: 12,
                fontSize: 16,
                borderRadius: 8,
                border: '2px solid #d1d5db',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
              📝 Note Visita
            </label>
            <textarea
              value={noteVisita}
              onChange={(e) => setNoteVisita(e.target.value)}
              placeholder="Aggiungi note sulla visita..."
              rows={3}
              style={{
                width: '100%',
                padding: 12,
                fontSize: 14,
                borderRadius: 8,
                border: '2px solid #d1d5db',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* Azioni */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <button
            onClick={handleSkip}
            disabled={saving}
            style={{
              padding: '14px',
              borderRadius: 8,
              border: '2px solid #f59e0b',
              background: 'white',
              color: '#f59e0b',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.5 : 1,
            }}
          >
            ⏭️ Saltato
          </button>

          <button
            onClick={handlePostpone}
            disabled={saving || isLast}
            style={{
              padding: '14px',
              borderRadius: 8,
              border: '2px solid #6b7280',
              background: 'white',
              color: '#6b7280',
              fontWeight: 600,
              cursor: (saving || isLast) ? 'not-allowed' : 'pointer',
              opacity: (saving || isLast) ? 0.5 : 1,
            }}
          >
            ⬇️ Spostato
          </button>

          <button
            onClick={handleComplete}
            disabled={saving || !ordine.trim()}
            style={{
              padding: '14px',
              borderRadius: 8,
              border: 'none',
              background: (!ordine.trim() || saving) ? '#9ca3af' : '#10b981',
              color: 'white',
              fontWeight: 600,
              cursor: (!ordine.trim() || saving) ? 'not-allowed' : 'pointer',
            }}
          >
            ✅ Fatto
          </button>
        </div>
      </div>

      {/* Prossimi Clienti */}
      {currentIndex < orderedIds.length - 1 && (
        <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#6b7280' }}>
            📋 Prossimi Clienti:
          </div>
          {orderedIds.slice(currentIndex + 1, currentIndex + 4).map((id, idx) => {
            const client = clients.find(c => c.id === id);
            return client ? (
              <div key={id} style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                {idx + 1}. {client.name} ({client.city})
              </div>
            ) : null;
          })}
          {orderedIds.length - currentIndex > 4 && (
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              ... e altri {orderedIds.length - currentIndex - 4}
            </div>
          )}
        </div>
      )}
    </div>
  </>
  );
}
