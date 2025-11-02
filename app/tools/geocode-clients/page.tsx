'use client';

/**
 * GEOCODE CLIENTS TOOL
 * 
 * Tool per geocodare i clienti esistenti che non hanno coordinate GPS.
 * 
 * FUNZIONAMENTO:
 * 1. Carica clienti senza coordinate (latitude IS NULL)
 * 2. Decifra indirizzi usando crypto
 * 3. Geocoda usando OpenStreetMap Nominatim
 * 4. Aggiorna database con coordinate
 * 
 * LIMITI:
 * - Rate limit Nominatim: 1 req/sec
 * - Processa max 100 clienti per sessione
 * 
 * @created 2025-11-02
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import { useDrawers, DrawersWithBackdrop } from '@/components/Drawers';
import TopBar from '@/components/home/TopBar';
import { geocodeAddressWithDelay } from '@/lib/geocoding';

export default function GeocodeClientsPage() {
  const router = useRouter();
  const { crypto, ready, unlock, prewarm } = useCrypto();
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  const actuallyReady = ready || !!(crypto as any)?.isUnlocked?.();

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, processed: 0, success: 0, failed: 0 });

  const [pass, setPass] = useState<string>('');
  const [unlocking, setUnlocking] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (actuallyReady) {
      setChecking(false);
    } else {
      const hasPass = !!(sessionStorage.getItem('repping:pph') || localStorage.getItem('repping:pph'));
      const delay = hasPass ? 5000 : 1000;
      const timer = setTimeout(() => setChecking(false), delay);
      return () => clearTimeout(timer);
    }
  }, [actuallyReady]);

  async function handleUnlock() {
    if (!pass.trim()) {
      alert('Inserisci la passphrase');
      return;
    }
    setUnlocking(true);
    try {
      await unlock(pass);
      await prewarm(['table:accounts']);
      sessionStorage.setItem('repping:pph', pass);
      localStorage.setItem('repping:pph', pass);
    } catch (e: any) {
      alert('Passphrase errata');
      console.error('Unlock error:', e);
    } finally {
      setUnlocking(false);
    }
  }

  async function logout() {
    try { sessionStorage.removeItem('repping:pph'); } catch {}
    try { localStorage.removeItem('repping:pph'); } catch {}
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  function addLog(msg: string) {
    console.log('[Geocode]', msg);
    setLog(prev => [...prev, msg]);
  }

  async function handleGeocode() {
    if (!crypto || !actuallyReady) {
      alert('Sistema crypto non pronto. Riprova.');
      return;
    }

    if (!confirm('Geocodare tutti i clienti senza coordinate?\n\nATTENZIONE: Operazione lenta (1 cliente/secondo per rate limit).')) {
      return;
    }

    setBusy(true);
    setLog([]);
    setProgress('Avvio geocoding...');
    setStats({ total: 0, processed: 0, success: 0, failed: 0 });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      addLog('✅ Utente autenticato');
      
      // Inizializza scope
      const scope = 'table:accounts';
      try {
        await (crypto as any).getOrCreateScopeKeys(scope);
        addLog('✅ Scope crypto inizializzato');
      } catch (e) {
        console.error('[Geocode] Errore inizializzazione scope:', e);
        throw new Error('Errore inizializzazione crypto');
      }

      // Carica clienti SENZA coordinate
      addLog('📊 Caricamento clienti senza coordinate...');
      
      const { data: clients, error: loadError } = await supabase
        .from('accounts')
        .select('id, address_enc, address_iv, city')
        .eq('user_id', user.id)
        .or('latitude.is.null,longitude.is.null')
        .order('created_at', { ascending: true })
        .limit(100);

      if (loadError) throw loadError;

      if (!clients || clients.length === 0) {
        addLog('✅ Nessun cliente da geocodare!');
        setProgress('✅ Tutti i clienti hanno già coordinate');
        return;
      }

      const total = clients.length;
      setStats(s => ({ ...s, total }));
      addLog(`📍 Trovati ${total} clienti da geocodare`);
      addLog('');

      // Helper per conversione hex/base64
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
              if (it && typeof it === 'object' && "name" in it) acc[it.name] = it.value ?? "";
              return acc;
            }, {})
          : ((x ?? {}) as Record<string, unknown>);

      // Processa uno alla volta
      let processed = 0;
      let success = 0;
      let failed = 0;

      for (const client of clients) {
        processed++;
        setProgress(`Geocoding ${processed}/${total}: ${client.city}...`);

        try {
          // Decifra indirizzo
          if (!client.address_enc || !client.address_iv) {
            addLog(`⚠️ ${processed}/${total}: Cliente senza indirizzo cifrato`);
            failed++;
            setStats({ total, processed, success, failed });
            continue;
          }

          const clientForDecrypt = {
            address_enc: hexToBase64(client.address_enc),
            address_iv: hexToBase64(client.address_iv),
          };

          const decAny = await (crypto as any).decryptFields(
            scope, 'accounts', '', clientForDecrypt, ['address']
          );
          const dec = toObj(decAny);
          const address = String(dec.address ?? '');

          if (!address) {
            addLog(`⚠️ ${processed}/${total}: Indirizzo vuoto dopo decrypt`);
            failed++;
            setStats({ total, processed, success, failed });
            continue;
          }

          // Geocoda (con rate limiting)
          addLog(`🔍 ${processed}/${total}: Geocoding "${address.substring(0, 50)}..."...`);
          
          const coords = await geocodeAddressWithDelay(address, client.city || 'Italia');

          if (!coords) {
            addLog(`❌ ${processed}/${total}: Coordinate non trovate`);
            failed++;
            setStats({ total, processed, success, failed });
            continue;
          }

          // Aggiorna database
          const { error: updateError } = await supabase
            .from('accounts')
            .update({
              latitude: coords.latitude,
              longitude: coords.longitude,
            })
            .eq('id', client.id);

          if (updateError) {
            addLog(`❌ ${processed}/${total}: Errore update DB - ${updateError.message}`);
            failed++;
            setStats({ total, processed, success, failed });
            continue;
          }

          addLog(`✅ ${processed}/${total}: ${client.city} - [${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}]`);
          success++;
          setStats({ total, processed, success, failed });

        } catch (e: any) {
          addLog(`❌ ${processed}/${total}: Errore - ${e.message}`);
          failed++;
          setStats({ total, processed, success, failed });
        }
      }

      addLog('');
      addLog('🎉 GEOCODING COMPLETATO!');
      addLog(`✅ Successo: ${success}/${total}`);
      addLog(`❌ Falliti: ${failed}/${total}`);
      setProgress('✅ COMPLETATO!');

    } catch (e: any) {
      addLog(`❌ ERRORE FATALE: ${e.message}`);
      setProgress(`❌ Errore: ${e.message}`);
      alert(`Errore durante geocoding:\n${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <TopBar
          title="🗺️ Geocode Clienti"
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

      {checking ? (
        <div style={{ paddingTop: 70, padding: '70px 16px 16px', textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
          <div style={{ fontSize: 18, color: '#6b7280', marginTop: 100 }}>⏳ Caricamento...</div>
        </div>
      ) : !actuallyReady || !crypto ? (
        <div style={{ paddingTop: 70, padding: '70px 16px 16px', maxWidth: 500, margin: '0 auto' }}>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 32, textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>🔐 Sblocca i dati cifrati</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280' }}>
              Inserisci la passphrase per accedere agli indirizzi
            </p>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Passphrase"
              disabled={unlocking}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 15,
                marginBottom: 16,
              }}
            />
            <button
              onClick={handleUnlock}
              disabled={unlocking || !pass.trim()}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: unlocking || !pass.trim() ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: unlocking || !pass.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {unlocking ? '⏳ Sblocco...' : '🔓 Sblocca'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ paddingTop: 70, padding: '70px 16px 16px', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <h3 style={{ margin: 0, color: '#92400e', fontSize: 16, fontWeight: 600 }}>⚠️ ATTENZIONE - Rate Limiting</h3>
            <p style={{ margin: '8px 0 0', color: '#92400e', fontSize: 14 }}>
              Il geocoding usa OpenStreetMap Nominatim (gratuito).<br/>
              Limite: 1 richiesta/secondo. Operazione lenta ma necessaria.
            </p>
          </div>

          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>🗺️ Geocoding Clienti</h2>
            
            <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px' }}><strong>Cosa fa:</strong></p>
              <ul style={{ margin: '8px 0', paddingLeft: 24 }}>
                <li>Trova clienti senza coordinate GPS</li>
                <li>Decifra gli indirizzi</li>
                <li>Chiama OpenStreetMap per ottenere lat/long</li>
                <li>Aggiorna il database</li>
              </ul>

              <p style={{ margin: '16px 0 8px' }}><strong>Tempo stimato:</strong></p>
              <ul style={{ margin: '8px 0', paddingLeft: 24 }}>
                <li>~1 secondo per cliente (rate limit)</li>
                <li>80 clienti = ~1.5 minuti</li>
              </ul>
            </div>

            <button
              onClick={handleGeocode}
              disabled={busy || !crypto || !actuallyReady}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: busy ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? '⏳ Geocoding in corso...' : '🚀 Avvia Geocoding'}
            </button>
          </div>

          {stats.total > 0 && (
            <div style={{ background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#0369a1' }}>{stats.total}</div>
                  <div style={{ fontSize: 12, color: '#0c4a6e' }}>Totali</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#0369a1' }}>{stats.processed}</div>
                  <div style={{ fontSize: 12, color: '#0c4a6e' }}>Processati</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#15803d' }}>{stats.success}</div>
                  <div style={{ fontSize: 12, color: '#14532d' }}>Successo</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#dc2626' }}>{stats.failed}</div>
                  <div style={{ fontSize: 12, color: '#7f1d1d' }}>Falliti</div>
                </div>
              </div>
            </div>
          )}

          {progress && (
            <div style={{ background: '#eff6ff', border: '1px solid #3b82f6', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1e40af' }}>{progress}</div>
            </div>
          )}

          {log.length > 0 && (
            <div style={{ background: '#1f2937', borderRadius: 8, padding: 16, maxHeight: 400, overflow: 'auto' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#d1d5db', whiteSpace: 'pre-wrap' }}>
                {log.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
