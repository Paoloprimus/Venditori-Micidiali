'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import { useDrawers, DrawersWithBackdrop } from '@/components/Drawers';
import TopBar from '@/components/home/TopBar';

// Tipi
type ClientData = {
  id: string;
  created_at: string;
  name: string;
  contact_name: string;
  city: string;
  tipo_locale: string;
  email: string;
  phone: string;
  vat_number: string;
  address: string;
  notes: string;
  latitude?: string;
  longitude?: string;
};

type Visit = {
  id: string;
  data_visita: string;
  tipo: 'visita' | 'chiamata';
  esito: string;
  durata: number | null;
  importo_vendita: number | null;
  notes: string;
};

type ClientStats = {
  totaleVisite: number;
  totaleChiamate: number;
  totaleVendite: number;
  ultimaVisita: string | null;
  mediaDurataVisita: number;
  visiteMese: number;
  venditeMese: number;
};

const DEFAULT_SCOPES = ["table:accounts", "table:visits"];

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const { crypto, ready, unlock, prewarm } = useCrypto();
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();
  
  const actuallyReady = ready || !!(crypto as any)?.isUnlocked?.();
  
  const [client, setClient] = useState<ClientData | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Stato per note editabili
  const [editingNotes, setEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Auth check
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      setUserId(error ? null : data.user?.id ?? null);
      setAuthChecked(true);
    })();
  }, []);

  // Auto-unlock
  useEffect(() => {
    if (!authChecked || !crypto) return;
    if (typeof crypto.isUnlocked === 'function' && crypto.isUnlocked()) return;
    
    const pass = sessionStorage.getItem('repping:pph') || localStorage.getItem('repping:pph') || '';
    if (!pass) return;
    
    (async () => {
      try {
        await unlock(pass);
        await prewarm(DEFAULT_SCOPES);
      } catch (e) {
        console.error('[ClientDetail] Unlock failed:', e);
      }
    })();
  }, [authChecked, crypto, unlock, prewarm]);

  // Carica dati cliente
  useEffect(() => {
    if (!actuallyReady || !crypto || !userId || !clientId) return;
    loadClientData();
  }, [actuallyReady, crypto, userId, clientId]);

  async function loadClientData() {
    setLoading(true);
    setError(null);
    
    try {
      // Carica account
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (accountError) throw accountError;
      if (!accountData) throw new Error('Cliente non trovato');
      
      // Decifra i campi
      const hexToBase64 = (hexStr: any): string => {
        if (!hexStr || typeof hexStr !== 'string') return '';
        if (!hexStr.startsWith('\\x')) return hexStr;
        const hex = hexStr.slice(2);
        const bytes = hex.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
        return bytes;
      };
      
      const recordForDecrypt = {
        name_enc: hexToBase64(accountData.name_enc),
        name_iv: hexToBase64(accountData.name_iv),
        contact_name_enc: hexToBase64(accountData.contact_name_enc),
        contact_name_iv: hexToBase64(accountData.contact_name_iv),
        email_enc: hexToBase64(accountData.email_enc),
        email_iv: hexToBase64(accountData.email_iv),
        phone_enc: hexToBase64(accountData.phone_enc),
        phone_iv: hexToBase64(accountData.phone_iv),
        vat_number_enc: hexToBase64(accountData.vat_number_enc),
        vat_number_iv: hexToBase64(accountData.vat_number_iv),
        address_enc: hexToBase64(accountData.address_enc),
        address_iv: hexToBase64(accountData.address_iv),
      };
      
      await (crypto as any).getOrCreateScopeKeys('table:accounts');
      
      const toObj = (x: any): Record<string, unknown> =>
        Array.isArray(x)
          ? x.reduce((acc: Record<string, unknown>, it: any) => {
              if (it && typeof it === 'object' && 'name' in it) acc[it.name] = it.value ?? '';
              return acc;
            }, {})
          : ((x ?? {}) as Record<string, unknown>);
      
      const decAny = await (crypto as any).decryptFields(
        'table:accounts',
        'accounts',
        clientId,
        recordForDecrypt,
        ['name', 'contact_name', 'email', 'phone', 'vat_number', 'address']
      );
      
      const dec = toObj(decAny);
      
      const clientData: ClientData = {
        id: accountData.id,
        created_at: accountData.created_at,
        name: String(dec.name ?? ''),
        contact_name: String(dec.contact_name ?? ''),
        city: accountData.city || '',
        tipo_locale: accountData.tipo_locale || '',
        email: String(dec.email ?? ''),
        phone: String(dec.phone ?? ''),
        vat_number: String(dec.vat_number ?? ''),
        address: String(dec.address ?? ''),
        notes: accountData.notes || '',
        latitude: accountData.latitude,
        longitude: accountData.longitude,
      };
      
      setClient(clientData);
      setTempNotes(clientData.notes);
      
      // Carica visite
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .eq('account_id', clientId)
        .order('data_visita', { ascending: false });
      
      if (!visitsError && visitsData) {
        setVisits(visitsData.map((v: any) => ({
          id: v.id,
          data_visita: v.data_visita,
          tipo: v.tipo,
          esito: v.esito || '—',
          durata: v.durata,
          importo_vendita: v.importo_vendita,
          notes: v.notes || '',
        })));
      }
      
    } catch (e: any) {
      console.error('[ClientDetail] Error:', e);
      setError(e.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  }

  // Statistiche calcolate
  const stats: ClientStats = useMemo(() => {
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const visiteList = visits.filter(v => v.tipo === 'visita');
    const chiamateList = visits.filter(v => v.tipo === 'chiamata');
    const visiteMese = visits.filter(v => new Date(v.data_visita) >= monthAgo);
    
    return {
      totaleVisite: visiteList.length,
      totaleChiamate: chiamateList.length,
      totaleVendite: visits.reduce((sum, v) => sum + (v.importo_vendita || 0), 0),
      ultimaVisita: visits.length > 0 ? visits[0].data_visita : null,
      mediaDurataVisita: visiteList.length > 0 
        ? Math.round(visiteList.reduce((sum, v) => sum + (v.durata || 0), 0) / visiteList.length)
        : 0,
      visiteMese: visiteMese.length,
      venditeMese: visiteMese.reduce((sum, v) => sum + (v.importo_vendita || 0), 0),
    };
  }, [visits]);

  // Salva note
  async function saveNotes() {
    if (!client) return;
    setSavingNotes(true);
    
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ notes: tempNotes })
        .eq('id', client.id);
      
      if (error) throw error;
      
      setClient({ ...client, notes: tempNotes });
      setEditingNotes(false);
    } catch (e: any) {
      alert('Errore salvataggio: ' + e.message);
    } finally {
      setSavingNotes(false);
    }
  }

  // Logout
  async function logout() {
    try { sessionStorage.removeItem('repping:pph'); } catch {}
    try { localStorage.removeItem('repping:pph'); } catch {}
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  // Export PDF (placeholder - implementazione futura)
  function exportPDF() {
    alert('Export PDF in sviluppo - coming soon!');
  }

  // Loading states
  if (!authChecked) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Verifico sessione...</div>;
  }

  if (!userId) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        Non autenticato. <a href="/login">Login</a>
      </div>
    );
  }

  if (!actuallyReady || !crypto) {
    const hasPass = typeof window !== 'undefined' && 
      (sessionStorage.getItem('repping:pph') || localStorage.getItem('repping:pph'));
    
    if (hasPass) {
      return (
        <div style={{ padding: 24, textAlign: 'center', marginTop: 100 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔓</div>
          <div style={{ fontSize: 18, color: '#6b7280' }}>Sblocco dati in corso...</div>
        </div>
      );
    }
    
    return (
      <div style={{ padding: 24, textAlign: 'center', marginTop: 100 }}>
        <div style={{ fontSize: 18, color: '#6b7280' }}>Cifratura non pronta</div>
        <button 
          onClick={() => router.push('/clients')}
          style={{ marginTop: 16, padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db' }}
        >
          ← Torna ai clienti
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', marginTop: 100 }}>
        <div style={{ fontSize: 18, color: '#6b7280' }}>Caricamento scheda cliente...</div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div style={{ padding: 24, textAlign: 'center', marginTop: 100 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, color: '#ef4444', marginBottom: 16 }}>{error || 'Cliente non trovato'}</div>
        <button 
          onClick={() => router.push('/clients')}
          style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db' }}
        >
          ← Torna ai clienti
        </button>
      </div>
    );
  }

  return (
    <>
      {/* TopBar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <TopBar
          title="Scheda Cliente"
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

      <div style={{ paddingTop: 70, padding: '80px 16px 40px', maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Header con nome e azioni */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <button 
              onClick={() => router.push('/clients')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#6b7280', 
                cursor: 'pointer',
                fontSize: 14,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ← Torna alla lista
            </button>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
              {client.name || 'Cliente senza nome'}
            </h1>
            <div style={{ color: '#6b7280', fontSize: 14 }}>
              {client.tipo_locale && <span style={{ marginRight: 12 }}>🏪 {client.tipo_locale}</span>}
              {client.city && <span>📍 {client.city}</span>}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={exportPDF}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              📄 Esporta PDF
            </button>
            <button
              onClick={() => router.push('/tools/add-visit?client=' + client.id)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#2563eb',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ➕ Nuova Visita
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: 12, 
          marginBottom: 24,
        }}>
          <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 12, color: '#166534', marginBottom: 4 }}>💰 Vendite Totali</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>€{stats.totaleVendite.toFixed(2)}</div>
          </div>
          <div style={{ padding: 16, background: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: 12, color: '#1e40af', marginBottom: 4 }}>🚗 Visite</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>{stats.totaleVisite}</div>
          </div>
          <div style={{ padding: 16, background: '#fef3c7', borderRadius: 12, border: '1px solid #fde68a' }}>
            <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>📞 Chiamate</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#92400e' }}>{stats.totaleChiamate}</div>
          </div>
          <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>⏱️ Durata Media</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#374151' }}>{stats.mediaDurataVisita} min</div>
          </div>
        </div>

        {/* Info mensili + ultima visita */}
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          marginBottom: 24,
          flexWrap: 'wrap',
        }}>
          <div style={{ 
            flex: 1, 
            minWidth: 200,
            padding: 16, 
            background: '#faf5ff', 
            borderRadius: 12, 
            border: '1px solid #e9d5ff' 
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed', marginBottom: 8 }}>📅 Ultimo Mese</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              {stats.visiteMese} attività • <span style={{ color: '#059669', fontWeight: 500 }}>€{stats.venditeMese.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ 
            flex: 1, 
            minWidth: 200,
            padding: 16, 
            background: '#f9fafb', 
            borderRadius: 12, 
            border: '1px solid #e5e7eb' 
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>🕐 Ultima Attività</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              {stats.ultimaVisita 
                ? new Date(stats.ultimaVisita).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
                : 'Nessuna attività registrata'}
            </div>
          </div>
        </div>

        {/* Griglia: Dati Anagrafici + Note */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
          
          {/* Dati Anagrafici */}
          <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📋 Dati Anagrafici</h2>
            
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Nome Azienda</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{client.name || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Contatto</div>
                <div style={{ fontSize: 14 }}>{client.contact_name || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Indirizzo</div>
                <div style={{ fontSize: 14 }}>{client.address || '—'}{client.city ? `, ${client.city}` : ''}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Telefono</div>
                  <div style={{ fontSize: 14 }}>
                    {client.phone ? (
                      <a href={`tel:${client.phone}`} style={{ color: '#2563eb' }}>{client.phone}</a>
                    ) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Email</div>
                  <div style={{ fontSize: 14 }}>
                    {client.email ? (
                      <a href={`mailto:${client.email}`} style={{ color: '#2563eb' }}>{client.email}</a>
                    ) : '—'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>P.IVA</div>
                  <div style={{ fontSize: 14 }}>{client.vat_number || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Cliente dal</div>
                  <div style={{ fontSize: 14 }}>
                    {new Date(client.created_at).toLocaleDateString('it-IT')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div style={{ background: '#fffbeb', padding: 20, borderRadius: 12, border: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>📝 Note</h2>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ✏️ Modifica
                </button>
              )}
            </div>
            
            {editingNotes ? (
              <div>
                <textarea
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 120,
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    resize: 'vertical',
                    marginBottom: 12,
                  }}
                  placeholder="Aggiungi note sul cliente..."
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#10b981',
                      color: 'white',
                      cursor: savingNotes ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {savingNotes ? 'Salvo...' : '✓ Salva'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false);
                      setTempNotes(client.notes);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: '1px solid #d1d5db',
                      background: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ 
                fontSize: 14, 
                color: client.notes ? '#374151' : '#9ca3af',
                whiteSpace: 'pre-wrap',
                minHeight: 60,
              }}>
                {client.notes || 'Nessuna nota per questo cliente.'}
              </div>
            )}
          </div>
        </div>

        {/* Storico Attività */}
        <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📅 Storico Attività</h2>
          
          {visits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div>Nessuna attività registrata per questo cliente.</div>
              <button
                onClick={() => router.push('/tools/add-visit?client=' + client.id)}
                style={{
                  marginTop: 16,
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ➕ Registra prima attività
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Data</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Tipo</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Esito</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>Importo</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Durata</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 8px' }}>
                        {new Date(v.data_visita).toLocaleDateString('it-IT')}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          background: v.tipo === 'visita' ? '#dbeafe' : '#fef3c7',
                          color: v.tipo === 'visita' ? '#1e40af' : '#92400e',
                        }}>
                          {v.tipo === 'visita' ? '🚗 Visita' : '📞 Chiamata'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#6b7280' }}>{v.esito}</td>
                      <td style={{ 
                        padding: '12px 8px', 
                        textAlign: 'right',
                        color: v.importo_vendita ? '#059669' : '#9ca3af',
                        fontWeight: v.importo_vendita ? 500 : 400,
                      }}>
                        {v.importo_vendita ? `€${v.importo_vendita.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#6b7280' }}>
                        {v.durata ? `${v.durata} min` : '—'}
                      </td>
                      <td style={{ 
                        padding: '12px 8px', 
                        color: '#6b7280',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {v.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

