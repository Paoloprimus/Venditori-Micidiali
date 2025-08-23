'use client';
import React, { useState } from 'react';

export function SaveNoteButton({ accountId, contactId, getText } : { accountId?: string; contactId?: string; getText: () => string; }){
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const onSave = async () => {
    setLoading(true); setMsg(null);
    try {
      const body = { account_id: accountId || null, contact_id: contactId || null, body: getText() };
      const res = await fetch('/api/memory/upsert', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setMsg('Nota salvata ✔');
    } catch (e:any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={onSave} disabled={loading} className="btn px-3 py-2 rounded-lg bg-blue-600 text-white">
        {loading ? 'Salvataggio…' : 'Salva come nota'}
      </button>
      {msg && <span className="text-sm text-gray-600">{msg}</span>}
    </div>
  );
}
