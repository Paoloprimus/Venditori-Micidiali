'use client';

import React, { useEffect, useState } from 'react';
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
  // JOIN con accounts
  account_name_enc?: string;
  account_name_iv?: string;
};

type PlainVisit = {
  id: string;
  tipo: 'visita' | 'chiamata';
  data_visita: string;
  cliente_nome: string;
  esito: string;
  durata: number | null;
  note: string;
  created_at: string;
};

export default function VisitsPage(): JSX.Element {
  const crypto = useCrypto();
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  const [rows, setRows] = useState<PlainVisit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Filtri
  const [filterTipo, setFilterTipo] = useState<'tutti' | 'visita' | 'chiamata'>('tutti');
  const [q, setQ] = useState<string>('');

  // Logout
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  // Auth check
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setAuthChecked(true);
    })();
  }, []);

  // Carica visite
  async function loadVisits(): Promise<void> {
    if (!userId || !crypto) return;
    setLoading(true);

    try {
      // Query con JOIN su accounts per prendere nome cliente
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          user_id,
          account_id,
          tipo,
          data_visita,
          durata,
          esito,
          note_conversazione_enc,
          note_conversazione_iv,
          created_at,
          accounts!inner(name_enc, name_iv)
        `)
        .eq('user_id', userId)
        .order('data_visita', { ascending: false });

      if (error) {
        console.error('[/visits] load error:', error);
        setLoading(false);
        return;
      }

      // Decifra nome clienti e note
      const plain: PlainVisit[] = [];
      for (const r of (data || [])) {
        let clienteNome = 'Cliente Sconosciuto';
        let noteDecrypted = '';

        // Decifra nome cliente
        if (r.accounts && Array.isArray(r.accounts) && r.accounts.length > 0) {
          const acc = r.accounts[0];
          if (acc.name_enc && acc.name_iv) {
            try {
              clienteNome = await crypto.decryptText(
                { ciphertext: acc.name_enc, iv: acc.name_iv },
                'clients'
              );
            } catch (err) {
              console.error('[/visits] decrypt name error:', err);
            }
          }
        }

        // Decifra note conversazione
        if (r.note_conversazione_enc && r.note_conversazione_iv) {
          try {
            noteDecrypted = await crypto.decryptText(
              { ciphertext: r.note_conversazione_enc, iv: r.note_conversazione_iv },
              'visits'
            );
          } catch (err) {
            console.error('[/visits] decrypt note error:', err);
          }
        }

        plain.push({
          id: r.id,
          tipo: r.tipo,
          data_visita: r.data_visita,
          cliente_nome: clienteNome,
          esito: r.esito || '—',
          durata: r.durata,
          note: noteDecrypted,
          created_at: r.created_at,
        });
      }

      setRows(plain);
    } catch (err) {
      console.error('[/visits] unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId && crypto) loadVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, crypto]);

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
