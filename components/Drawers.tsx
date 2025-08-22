"use client";
import { useEffect, useState } from "react";

export function useDrawers() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  return {
    leftOpen, topOpen,
    openLeft: ()=>setLeftOpen(true), closeLeft: ()=>setLeftOpen(false),
    openTop: ()=>setTopOpen(true), closeTop: ()=>setTopOpen(false),
  };
}

type Usage = { tokensIn:number; tokensOut:number; costTotal:number };

export function TopSheet({
  open, onClose, usage, model
}: { open:boolean; onClose:()=>void; usage:Usage|null; model:string }) {
  const u = usage ?? { tokensIn:0, tokensOut:0, costTotal:0 };
  return (
    <aside className={`topsheet ${open ? "open":""}`}>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Costi & utilizzo</div>
        <div className="spacer" />
      </div>
      <div className="list">
        <div className="row">
          <div className="title">Modello in uso</div>
          <div className="helper">{model || "n/d"}</div>
        </div>
        <div className="row">
          <div className="title">Questa chat</div>
          <div className="helper">
            IN {u.tokensIn} • OUT {u.tokensOut} • Totale €{u.costTotal.toFixed(4)}
          </div>
        </div>
        <div className="row">
          <div className="title">Periodo (30g)</div>
          <div className="helper">Coming soon</div>
        </div>
      </div>
    </aside>
  );
}

type Conv = { id:string; title:string; updated_at:string; total_cost:number };

export function LeftDrawer({
  open, onClose, onSelect
}: { open:boolean; onClose:()=>void; onSelect:(c:Conv)=>void }) {
  const [items, setItems] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  async function load(reset=false) {
    if (loading) return;
    setLoading(true); setError(null);
    const q = new URLSearchParams({ limit: "20", offset: String(reset ? 0 : offset) });
    const res = await fetch(`/api/conversations/list?${q.toString()}`);
    const data = await res.json();
    if (!res.ok) { setError(data?.details||data?.error||"Errore"); setLoading(false); return; }
    const newItems: Conv[] = data.items || [];
    setItems(prev => reset ? newItems : [...prev, ...newItems]);
    if (data.nextOffset != null) {
      setOffset(data.nextOffset);
      setHasMore(true);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  }

  useEffect(()=>{ if (open) load(true); }, [open]);

  async function createNew() {
    const t = prompt("Titolo nuova chat:", "Nuova chat");
    const res = await fetch("/api/conversations/new", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t||"Nuova chat" }) });
    const data = await res.json();
    if (res.ok) {
      setItems(prev => [data.conversation, ...prev]);
      onSelect(data.conversation);
    } else {
      alert(data?.details || data?.error || "Errore creazione");
    }
  }

  async function rename(id: string, current: string) {
    const t = prompt("Rinomina chat:", current);
    if (!t || t.trim() === "" || t === current) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t }) });
    const data = await res.json();
    if (res.ok) {
      setItems(prev => prev.map(x => x.id === id ? { ...x, title: t } : x));
    } else {
      alert(data?.details || data?.error || "Errore rinomina");
    }
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questa chat?")) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setItems(prev => prev.filter(x => x.id !== id));
    } else {
      alert(data?.details || data?.error || "Errore eliminazione");
    }
  }

  return (
    <aside className={`drawer ${open ? "open":""}`}>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Conversazioni</div>
        <div className="spacer" />
        <button className="iconbtn" onClick={()=>load(true)}>↻</button>
        <button className="btn" onClick={createNew}>Nuova</button>
      </div>
      <div className="list">
        {error && <div className="row" style={{ color:"#F59E0B" }}>Errore: {error}</div>}
        {items.map(c => (
          <div key={c.id} className="row" style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ flex:1 }}>
              <div className="title" style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
              <div className="helper">Aggiornata: {new Date(c.updated_at).toLocaleString()} • Tot €{Number(c.total_cost||0).toFixed(4)}</div>
            </div>
            <button className="iconbtn" title="Apri" onClick={()=>onSelect(c)}>Apri</button>
            <button className="iconbtn" title="Rinomina" onClick={()=>rename(c.id, c.title)}>✏️</button>
            <button className="iconbtn" title="Elimina" onClick={()=>remove(c.id)}>🗑️</button>
          </div>
        ))}
        {hasMore && !loading && (
          <button className="iconbtn" onClick={()=>load(false)}>Carica altro…</button>
        )}
        {loading && <div className="helper">Caricamento…</div>}
        {!loading && items.length === 0 && <div className="helper">Nessuna conversazione. Crea la prima con “Nuova”.</div>}
      </div>
    </aside>
  );
}
