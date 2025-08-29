"use client";
import { useEffect, useState } from "react";

export function useDrawers() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [topOpen, setTopOpen] = useState(false); // riusato per il drawer destro
  return {
    leftOpen, topOpen,
    openLeft: ()=>setLeftOpen(true), closeLeft: ()=>setLeftOpen(false),
    openTop: ()=>setTopOpen(true), closeTop: ()=>setTopOpen(false),
  };
}

type Conv = { id:string; title:string; updated_at?:string };

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

  async function remove(id: string) {
    if (!confirm("Eliminare questa sessione?")) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.details || data?.error || "Errore eliminazione");
      return;
    }
    setItems(prev => prev.filter(x => x.id !== id));
  }

  // Crea una nuova sessione chiedendo il titolo e la apre subito (stato interno)
  async function createNew() {
    const t = prompt("Titolo nuova sessione:");
    const title = (t ?? "").trim();
    if (!title) return;
    const res = await fetch("/api/conversations/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.details || data?.error || "Errore creazione");
      return;
    }
    const conv: Conv = data?.conversation ?? data?.item ?? data;
    if (!conv?.id) {
      alert("Errore: ID sessione mancante nella risposta");
      return;
    }
    setItems(prev => [conv, ...prev]);
    onSelect(conv); // nessuna navigazione: resta su /
  }

  return (
    <aside className={`drawer ${open ? "open":""}`}>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Sessioni</div>
        <div className="spacer" />
        <button className="iconbtn" onClick={()=>load(true)}>↻</button>
      </div>

      <div className="list">
        {/* Pulsante per creare rapidamente una nuova sessione */}
        <div className="row" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
          <button className="btn" onClick={createNew}>+ Nuova sessione</button>
        </div>

        {error && <div className="row" style={{ color:"#F59E0B" }}>Errore: {error}</div>}

        {items.map(c => (
          <div key={c.id} className="row" style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div
              style={{ flex:1, cursor:"pointer" }}
              onClick={()=>onSelect(c)}
              title={c.title}
            >
              <div className="title" style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {c.title}
              </div>
            </div>
            <button className="iconbtn" title="Elimina" onClick={()=>remove(c.id)}>🗑️</button>
          </div>
        ))}

        {hasMore && items.length > 0 && !loading && (
          <button className="iconbtn" onClick={() => load(false)}>
            Carica altro…
          </button>
        )}

        {loading && <div className="helper">Caricamento…</div>}
        {!loading && items.length === 0 && <div className="helper">Nessuna sessione.</div>}
      </div>
    </aside>
  );
}

/** Drawer destro Impostazioni (vuoto per ora). */
export function RightDrawer({
  open, onClose
}: { open:boolean; onClose:()=>void }) {
  return (
    <aside className={`drawer right ${open ? "open":""}`}>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose
