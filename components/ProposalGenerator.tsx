'use client';
import React, { useState } from 'react';

export function ProposalGenerator(){
  const [accountId, setAccountId] = useState('');
  const [contactId, setContactId] = useState('');
  const [products, setProducts] = useState<string>('');
  const [obiettivi, setObiettivi] = useState('');
  const [preferenze, setPreferenze] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true); setResult(null);
    try {
      const prods = products.split(',').map(s => s.trim()).filter(Boolean).map(id => ({ id, qta: 1 }));
      const body = { account_id: accountId, contact_id: contactId || null, products: prods, obiettivi, preferenze };
      const res = await fetch('/api/proposals/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setResult(data);
    } catch (e:any) {
      setResult({ ok:false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <input className="border rounded p-2" placeholder="account_id (uuid)" value={accountId} onChange={e=>setAccountId(e.target.value)} />
        <input className="border rounded p-2" placeholder="contact_id (uuid, opzionale)" value={contactId} onChange={e=>setContactId(e.target.value)} />
        <input className="border rounded p-2" placeholder="product ids separati da virgola" value={products} onChange={e=>setProducts(e.target.value)} />
        <textarea className="border rounded p-2" placeholder="Obiettivi del cliente" value={obiettivi} onChange={e=>setObiettivi(e.target.value)} />
        <textarea className="border rounded p-2" placeholder="Preferenze (tono, focus, ecc.)" value={preferenze} onChange={e=>setPreferenze(e.target.value)} />
      </div>
      <button onClick={submit} disabled={loading} className="btn px-4 py-2 rounded-lg bg-blue-600 text-white">
        {loading ? 'Generazione…' : 'Genera bozza'}
      </button>
      {result && (
        <pre className="bg-gray-100 p-3 rounded overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
