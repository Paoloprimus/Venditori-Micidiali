'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDrawers, DrawersWithBackdrop } from '@/components/Drawers';
import TopBar from '@/components/home/TopBar';
import { supabase } from '@/lib/supabase/client';

type ProductForm = {
  codice: string;
  descrizione: string;
  um: string;
  giacenza: number;
  prezzo: string;
  scontoMerce: string;
  scontoFattura: string;
};

export default function QuickAddProductPage() {
  const router = useRouter();
  
  // Drawer
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  // Logout
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const [form, setForm] = useState<ProductForm>({
    codice: '',
    descrizione: '',
    um: '',
    giacenza: 0,
    prezzo: '',
    scontoMerce: '',
    scontoFattura: '',
  });

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  function updateField(field: keyof ProductForm, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function reset() {
    setForm({
      codice: '',
      descrizione: '',
      um: '',
      giacenza: 0,
      prezzo: '',
      scontoMerce: '',
      scontoFattura: '',
    });
    setSuccess(false);
  }

  async function handleSubmit() {
    // Validazioni
    if (!form.codice.trim()) {
      alert('Codice prodotto obbligatorio');
      return;
    }
    if (!form.descrizione.trim()) {
      alert('Descrizione obbligatoria');
      return;
    }

    setBusy(true);

    try {
      // Prepara payload
      const payload: any = {
        codice: form.codice.trim(),
        descrizione_articolo: form.descrizione.trim(),
        title: form.descrizione.trim(), // Per compatibilità
      };

      // Campi opzionali
      if (form.um.trim()) {
        payload.unita_misura = form.um.trim();
      }
      
      payload.giacenza = Math.max(0, Math.floor(Number(form.giacenza) || 0));

      if (form.prezzo.trim()) {
        const prezzo = parseFloat(form.prezzo.trim());
        if (!isNaN(prezzo) && prezzo > 0) {
          payload.base_price = prezzo;
        }
      }

      if (form.scontoMerce.trim()) {
        payload.sconto_merce = form.scontoMerce.trim();
      }

      if (form.scontoFattura.trim()) {
        const sconto = parseFloat(form.scontoFattura.trim());
        if (!isNaN(sconto) && sconto >= 0 && sconto <= 100) {
          payload.sconto_fattura = sconto;
        }
      }

      payload.is_active = true;

      console.log('[QuickAddProduct] Payload:', payload);

      // POST a API upsert
      const res = await fetch('/api/products/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log('[QuickAddProduct] ✅ Prodotto salvato:', data);

      setSuccess(true);
      setTimeout(() => {
        reset();
      }, 2000);

    } catch (e: any) {
      console.error('[QuickAddProduct] ❌ Errore:', e);
      alert(e?.message || 'Errore durante il salvataggio');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* TopBar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <TopBar
          title="Aggiungi Prodotto"
          onOpenLeft={openLeft}
          onOpenDati={openDati}
          onOpenDocs={openDocs}
          onOpenImpostazioni={openImpostazioni}
          onLogout={logout}
        />
      </div>

      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        {/* Spacer per TopBar */}
        <div style={{ height: 70 }} />

        {success && (
          <div style={{
            padding: 16,
            marginBottom: 16,
            background: '#10b981',
            color: 'white',
            borderRadius: 8,
            fontWeight: 600,
          }}>
            ✓ Prodotto salvato con successo!
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          {/* Codice */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Codice Prodotto *
            </label>
            <input
              type="text"
              value={form.codice}
              onChange={(e) => updateField('codice', e.target.value)}
              placeholder="Es: A123"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
            />
          </div>

          {/* Descrizione */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Descrizione *
            </label>
            <input
              type="text"
              value={form.descrizione}
              onChange={(e) => updateField('descrizione', e.target.value)}
              placeholder="Es: Panettone classico"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
            />
          </div>

          {/* UM */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Unità di Misura
            </label>
            <input
              type="text"
              value={form.um}
              onChange={(e) => updateField('um', e.target.value)}
              placeholder="Es: SC, KG, LT"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
            />
          </div>

          {/* Giacenza */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Giacenza
            </label>
            <input
              type="number"
              min="0"
              value={form.giacenza}
              onChange={(e) => updateField('giacenza', parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
            />
          </div>

          {/* Prezzo */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Prezzo Base (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.prezzo}
              onChange={(e) => updateField('prezzo', e.target.value)}
              placeholder="Es: 4.50"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
            />
          </div>

          {/* Sconto Merce */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Sconto Merce
            </label>
            <input
              type="text"
              value={form.scontoMerce}
              onChange={(e) => updateField('scontoMerce', e.target.value)}
              placeholder="Es: 1 cassa ogni 10"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
            />
          </div>

          {/* Sconto Fattura */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Sconto Fattura (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.scontoFattura}
              onChange={(e) => updateField('scontoFattura', e.target.value)}
              placeholder="Es: 10"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
            />
          </div>

          {/* Bottoni */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              onClick={handleSubmit}
              disabled={busy}
              style={{
                flex: 1,
                padding: 12,
                background: busy ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? 'Salvataggio...' : '✓ Salva Prodotto'}
            </button>
            
            <button
              onClick={reset}
              disabled={busy}
              style={{
                padding: 12,
                background: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Reset
            </button>
          </div>

          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => router.push('/products')}
              style={{
                width: '100%',
                padding: 10,
                background: 'transparent',
                color: '#2563eb',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              ← Torna alla lista prodotti
            </button>
          </div>
        </div>
      </div>

      {/* Drawer con backdrop */}
      <DrawersWithBackdrop
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        rightContent={rightContent}
        onCloseLeft={closeLeft}
        onCloseRight={closeRight}
      />
    </>
  );
}
