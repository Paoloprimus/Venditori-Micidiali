'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import { useDrawers, DrawersWithBackdrop } from '@/components/Drawers';
import TopBar from '@/components/home/TopBar';

type ClientOption = {
  id: string;
  name: string;
};

export default function AddVisitPage() {
  const router = useRouter();
  const crypto = useCrypto();
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [form, setForm] = useState({
    account_id: '',
    tipo: 'visita' as 'visita' | 'chiamata',
    data_visita: new Date().toISOString().split('T')[0],
    durata: '',
    esito: 'altro' as 'ordine_acquisito' | 'da_richiamare' | 'no_interesse' | 'info_richiesta' | 'altro',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  useEffect(() => {
    (async () => {
      if (!crypto?.crypto) return;
      setLoadingClients(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('accounts')
          .select('id, name_enc, name_iv')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading clients:', error);
          return;
        }

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

        const clientList: ClientOption[] = [];
        for (const acc of (data || [])) {
          if (acc.name_enc && acc.name_iv) {
            try {
              const accountForDecrypt = {
                name_enc: hexToBase64(acc.name_enc),
                name_iv: hexToBase64(acc.name_iv),
              };

              const decAny = await (crypto.crypto as any).decryptFields(
                "table:accounts", "accounts", '', accountForDecrypt, ["name"]
              );
              const dec = toObj(decAny);
              clientList.push({
                id: acc.id,
                name: String(dec.name ?? 'Cliente'),
              });
            } catch (err) {
              console.error('Decrypt error:', err);
            }
          }
        }
        setClients(clientList.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Error loading clients:', err);
      } finally {
        setLoadingClients(false);
      }
    })();
  }, [crypto]);

  async function handleSubmit() {
    if (!form.account_id) {
      alert('Seleziona un cliente');
      return;
    }
    if (!form.data_visita) {
      alert('Data visita obbligatoria');
      return;
    }

    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const payload: any = {
        user_id: user.id,
        account_id: form.account_id,
        tipo: form.tipo,
        data_visita: new Date(form.data_visita).toISOString(),
        esito: form.esito,
      };

      if (form.durata.trim()) {
        const dur = parseInt(form.durata.trim());
        if (!isNaN(dur) && dur > 0) {
          payload.durata = dur;
        }
      }

      if (form.note.trim()) {
        payload.notes = form.note.trim();
      }

      const { error } = await supabase.from('visits').insert(payload);
      if (error) throw error;

      setSuccess(true);
      setTimeout(() => router.push('/visits'), 1500);
    } catch (e: any) {
      console.error('[AddVisit] Error:', e);
      alert(e?.message || 'Errore durante il salvataggio');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <TopBar
          title="Nuova Visita"
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

      <div style={{ paddingTop: 70, padding: '70px 16px 16px', maxWidth: 600, margin: '0 auto' }}>
        {success && (
          <div style={{ padding: 16, background: '#d1fae5', border: '1px solid #10b981', borderRadius: 8, marginBottom: 16, textAlign: 'center', color: '#065f46', fontWeight: 500 }}>
            ✅ Visita salvata con successo!
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Cliente *</label>
            <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} disabled={busy || loadingClients} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}>
              <option value="">-- Seleziona cliente --</option>
              {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            {loadingClients && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Caricamento clienti...</div>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Tipo *</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1, padding: 12, border: form.tipo === 'visita' ? '2px solid #2563eb' : '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', textAlign: 'center', background: form.tipo === 'visita' ? '#eff6ff' : 'white' }}>
                <input type="radio" name="tipo" value="visita" checked={form.tipo === 'visita'} onChange={() => setForm({ ...form, tipo: 'visita' })} style={{ marginRight: 8 }} />
                🚗 Visita
              </label>
              <label style={{ flex: 1, padding: 12, border: form.tipo === 'chiamata' ? '2px solid #2563eb' : '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', textAlign: 'center', background: form.tipo === 'chiamata' ? '#eff6ff' : 'white' }}>
                <input type="radio" name="tipo" value="chiamata" checked={form.tipo === 'chiamata'} onChange={() => setForm({ ...form, tipo: 'chiamata' })} style={{ marginRight: 8 }} />
                📞 Chiamata
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Data *</label>
            <input type="date" value={form.data_visita} onChange={(e) => setForm({ ...form, data_visita: e.target.value })} disabled={busy} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Durata (minuti)</label>
            <input type="number" placeholder="es. 30" value={form.durata} onChange={(e) => setForm({ ...form, durata: e.target.value })} disabled={busy} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Esito</label>
            <select value={form.esito} onChange={(e) => setForm({ ...form, esito: e.target.value as any })} disabled={busy} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}>
              <option value="ordine_acquisito">✅ Ordine acquisito</option>
              <option value="da_richiamare">📞 Da richiamare</option>
              <option value="no_interesse">❌ Nessun interesse</option>
              <option value="info_richiesta">ℹ️ Info richiesta</option>
              <option value="altro">📝 Altro</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Note conversazione</label>
            <textarea placeholder="Cosa è successo durante la visita..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} disabled={busy} rows={5} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, resize: 'vertical' }} />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>💡 Le note sono accessibili all'AI per suggerimenti intelligenti</div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => router.push('/visits')} disabled={busy} style={{ flex: 1, padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', background: 'white' }}>Annulla</button>
            <button onClick={handleSubmit} disabled={busy || !form.account_id || !form.data_visita} style={{ flex: 1, padding: '12px 16px', background: busy ? '#9ca3af' : '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: busy ? 'not-allowed' : 'pointer' }}>{busy ? 'Salvataggio...' : '✅ Salva Visita'}</button>
          </div>
        </div>
      </div>
    </>
  );
}
