'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import { useDrawers, DrawersWithBackdrop } from '@/components/Drawers';
import TopBar from '@/components/home/TopBar';

// Tipi
type RawVisit = {
  id: string;
  user_id: string;
  account_id: string;
  tipo: 'visita' | 'chiamata';
  data_visita: string;
  durata: number | null;
  esito: string | null;
  note_conversazione_enc: string | null;
  note_conversazione_iv: string | null;
  created_at: string;
};

type RawAccount = {
  name_enc?: any;
  name_iv?: any;
};

type PlainVisit = {
  id: string;
  account_id: string;
  tipo: 'visita' | 'chiamata';
  data_visita: string;
  cliente_nome: string;
  esito: string;
  durata: number | null;
  note: string;
  created_at: string;
};

const DEFAULT_SCOPES = [
  "table:accounts", "table:visits"
];

export default function VisitsPage(): JSX.Element {
  const { crypto, ready, unlock, prewarm } = useCrypto();
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  const actuallyReady = ready || !!(crypto as any)?.isUnlocked?.();

  const [rows, setRows] = useState<PlainVisit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const unlockingRef = useRef(false);

  // Filtri
  const [filterTipo, setFilterTipo] = useState<'tutti' | 'visita' | 'chiamata'>('tutti');
  const [q, setQ] = useState<string>('');

  // Logout
  async function logout() {
    try { sessionStorage.removeItem("repping:pph"); } catch {}
    try { localStorage.removeItem("repping:pph"); } catch {}
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  // Auth check
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;
      if (error) {
        setUserId(null);
      } else {
        setUserId(data.user?.id ?? null);
      }
      setAuthChecked(true);
    })();
    return () => { alive = false; };
  }, []);

  // Auto-unlock FORZATO: sblocca e carica dati
  useEffect(() => {
    if (!authChecked || !crypto) return;
    
    console.log('[/visits] 🔍 Check unlock status:', {
      isUnlocked: crypto.isUnlocked?.(),
      unlockingInProgress: unlockingRef.current,
    });
    
    // Se già unlocked, skip
    if (typeof crypto.isUnlocked === 'function' && crypto.isUnlocked()) {
      console.log('[/visits] ✅ Crypto già unlocked');
      return;
    }
    
    // Se già sta unlockando, skip
    if (unlockingRef.current) {
      console.log('[/visits] ⏳ Unlock già in corso');
      return;
    }

    // Prova a leggere la passphrase
    const pass = 
      typeof window !== 'undefined'
        ? (sessionStorage.getItem('repping:pph') || localStorage.getItem('repping:pph') || '')
        : '';

    console.log('[/visits] 🔑 Passphrase trovata:', !!pass);
    
    if (!pass) {
      console.log('[/visits] ❌ Nessuna passphrase in storage');
      return;
    }

    // FORZA unlock + caricamento dati
    (async () => {
      try {
        unlockingRef.current = true;
        
        console.log('[/visits] 🔓 Avvio unlock...');
        await unlock(pass);
        console.log('[/visits] ✅ Unlock completato!');
        
        console.log('[/visits] 🔧 Avvio prewarm...');
        await prewarm(DEFAULT_SCOPES);
        console.log('[/visits] ✅ Prewarm completato!');
        
        // 🚀 FORZA caricamento dati dopo unlock
        console.log('[/visits] 📊 Carico i dati...');
        await loadVisits();
        console.log('[/visits] ✅ Dati caricati!');
        
      } catch (e: any) {
        const msg = String(e?.message || e || '');
        console.error('[/visits] ❌ Unlock fallito:', msg);
        
        // Se fallisce, pulisci passphrase invalida
        if (!/OperationError/i.test(msg)) {
          sessionStorage.removeItem('repping:pph');
          localStorage.removeItem('repping:pph');
        }
      } finally {
        unlockingRef.current = false;
      }
    })();
  }, [authChecked, crypto, unlock, prewarm]);

  // Carica visite
  async function loadVisits(): Promise<void> {
    if (!crypto || !userId) return;
    setLoading(true);

    try {
      // Query visite
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', userId)
        .order('data_visita', { ascending: false });

      if (visitsError) {
        console.error('[/visits] load error:', visitsError);
        setLoading(false);
        return;
      }

      // Query accounts per prendere nomi clienti
      const accountIds = [...new Set((visitsData || []).map((v: any) => v.account_id))];
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name_enc, name_iv')
        .in('id', accountIds);

      if (accountsError) {
        console.error('[/visits] accounts load error:', accountsError);
      }

      // Crea mappa accounts
      const accountsMap = new Map<string, RawAccount>();
      for (const acc of (accountsData || [])) {
        accountsMap.set(acc.id, acc);
      }

      // Helper conversione hex -> base64
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

      // ✅ Forza creazione scope keys PRIMA di decifrare
      try {
        console.log('[/visits] 🔧 Creo scope keys prima di decifrare...');
        await (crypto as any).getOrCreateScopeKeys('table:accounts');
        await (crypto as any).getOrCreateScopeKeys('table:visits');
        console.log('[/visits] ✅ Scope keys creati');
      } catch (e) {
        console.error('[/visits] ❌ Errore creazione scope keys:', e);
      }

      // Decifra tutte le visite
      const plain: PlainVisit[] = [];

      for (const r of (visitsData || [])) {
        try {
          let clienteNome = 'Cliente Sconosciuto';
          let noteDecrypted = '';

          // Decifra nome cliente
          const account = accountsMap.get(r.account_id);
          if (account && account.name_enc && account.name_iv) {
            try {
              const accountForDecrypt = {
                name_enc: hexToBase64(account.name_enc),
                name_iv: hexToBase64(account.name_iv),
              };

              const decAny = await (crypto as any).decryptFields(
                "table:accounts",
                "accounts",
                '',
                accountForDecrypt,
                ["name"]
              );
              const dec = toObj(decAny);
              clienteNome = String(dec.name ?? 'Cliente Sconosciuto');
            } catch (err) {
              console.error('[/visits] decrypt name error:', err);
            }
          }

          // Decifra note conversazione
          if (r.note_conversazione_enc && r.note_conversazione_iv) {
            try {
              const visitForDecrypt = {
                note_conversazione_enc: hexToBase64(r.note_conversazione_enc),
                note_conversazione_iv: hexToBase64(r.note_conversazione_iv),
              };

              const decAny = await (crypto as any).decryptFields(
                "table:visits",
                "visits",
                '',
                visitForDecrypt,
                ["note_conversazione"]
              );
              const dec = toObj(decAny);
              noteDecrypted = String(dec.note_conversazione ?? '');
            } catch (err) {
              console.error('[/visits] decrypt note error:', err);
            }
          }

          plain.push({
            id: r.id,
            account_id: r.account_id,
            tipo: r.tipo,
            data_visita: r.data_visita,
            cliente_nome: clienteNome,
            esito: r.esito || '—',
            durata: r.durata,
            note: noteDecrypted,
            created_at: r.created_at,
          });
        } catch (e) {
          console.warn('[/visits] decrypt error for', r.id, e);
          plain.push({
            id: r.id,
            account_id: r.account_id,
            tipo: r.tipo,
            data_visita: r.data_visita,
            cliente_nome: 'Errore decifratura',
            esito: r.esito || '—',
            durata: r.durata,
            note: '',
            created_at: r.created_at,
          });
        }
      }

      setRows(plain);
    } catch (err) {
      console.error('[/visits] unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filtra visite
  const filtered = rows.filter((v) => {
    if (filterTipo !== 'tutti' && v.tipo !== filterTipo) return false;
    if (q.trim() && !v.cliente_nome.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  // Formatta data
  function formatDate(isoStr: string): string {
    const d = new Date(isoStr);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Render
  if (!authChecked) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        Caricamento...
      </div>
    );
  }

  if (!userId) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        Non autenticato. <a href="/login">Login</a>
      </div>
    );
  }

  return (
    <>
      {/* TopBar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <TopBar
          title="Visite & Chiamate"
          onOpenLeft={openLeft}
          onOpenDati={openDati}
          onOpenDocs={openDocs}
          onOpenImpostazioni={openImpostazioni}
          onLogout={logout}
        />
      </div>

      {/* Drawers */}
      <DrawersWithBackdrop
        leftOpen={leftOpen}
        onCloseLeft={closeLeft}
        rightOpen={rightOpen}
        rightContent={rightContent}
        onCloseRight={closeRight}
      />

      {/* Main Content */}
      <div style={{ paddingTop: 60, padding: '70px 16px 16px' }}>
        {/* Header + Filtri */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {/* Filtro Tipo */}
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value as any)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                background: 'white',
              }}
            >
              <option value="tutti">Tutti i tipi</option>
              <option value="visita">Solo visite</option>
              <option value="chiamata">Solo chiamate</option>
            </select>

            {/* Ricerca */}
            <input
              type="text"
              placeholder="Cerca cliente..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
              }}
            />

            {/* Bottone Aggiungi */}
            <button
              onClick={() => window.location.href = '/tools/add-visit'}
              style={{
                padding: '8px 16px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ➕ Nuova
            </button>
          </div>

          {/* Contatore */}
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            {filtered.length} {filtered.length === 1 ? 'visita' : 'visite'}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            Caricamento visite...
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            {rows.length === 0 ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                  Nessuna visita registrata
                </div>
                <div style={{ fontSize: 14 }}>
                  Inizia a registrare le tue visite e chiamate ai clienti
                </div>
              </>
            ) : (
              'Nessuna visita trovata con questi filtri'
            )}
          </div>
        )}

        {/* Tabella Visite */}
        {!loading && filtered.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Data</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Cliente</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Esito</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Durata</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => alert(`Dettaglio visita: ${v.id}\n\nFunzionalità in arrivo...`)}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 8px' }}>{formatDate(v.data_visita)}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          background: v.tipo === 'visita' ? '#dbeafe' : '#fef3c7',
                          color: v.tipo === 'visita' ? '#1e40af' : '#92400e',
                        }}
                      >
                        {v.tipo === 'visita' ? '🚗 Visita' : '📞 Chiamata'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>{v.cliente_nome}</td>
                    <td style={{ padding: '12px 8px', color: '#6b7280' }}>{v.esito}</td>
                    <td style={{ padding: '12px 8px', color: '#6b7280' }}>
                      {v.durata ? `${v.durata} min` : '—'}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
