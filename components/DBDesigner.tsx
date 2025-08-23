'use client';
import React, { useState } from 'react';

export function DBDesigner(){
  const [prompt, setPrompt] = useState('Vorrei campo priorità su contatti e garanzia_mesi sui prodotti');
  const [proposal, setProposal] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const propose = async () => {
    setMsg(null);
    const res = await fetch('/api/custom-fields/propose', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt }) });
    const data = await res.json();
    if (!data.ok) { setMsg(data.error || 'Errore'); return; }
    setProposal(data.proposal);
  };

  const apply = async () => {
    setMsg(null);
    const res = await fetch('/api/custom-fields/apply', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ proposal }) });
    const data = await res.json();
    if (!data.ok) { setMsg(data.error || 'Errore'); return; }
    setMsg(`Campi salvati: ${data.count}`);
  };

  return (
    <div className="space-y-4">
      <textarea className="border rounded p-2 w-full min-h-[120px]" value={prompt} onChange={e=>setPrompt(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={propose} className="btn px-3 py-2 rounded bg-blue-600 text-white">Proponi schema</button>
        <button onClick={apply} disabled={!proposal} className="btn px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50">Applica</button>
      </div>
      {proposal && (
        <pre className="bg-gray-100 p-3 rounded overflow-auto text-sm">{JSON.stringify(proposal, null, 2)}</pre>
      )}
      {msg && <div className="text-sm text-gray-600">{msg}</div>}
    </div>
  );
}
