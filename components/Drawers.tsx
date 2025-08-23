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

type Usage = { tokensIn:number; tokensOut:number; costTotal:number };

/** Rimane qui per compatibilità, ma non verrà più usato. */
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

  return (
    <aside className={`drawer ${open ? "open":""}`}>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Sessioni</div>
        <div className="spacer" />
        <button className="iconbtn" onClick={()=>load(true)}>↻</button>
        {/* RIMOSSI: pulsanti Nuova / Rinomina / Elimina */}
      </div>
      <div className="list">
        {error && <div className="row" style={{ color:"#F59E0B" }}>Errore: {error}</div>}
        {items.map(c => (
          <div key={c.id} className="row" style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ flex:1, cursor:"pointer" }} onClick={()=>onSelect(c)} title={c.title}>
              <div className="title" style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                <div className="helper">
                  Aggiornata: {new Date(c.updated_at).toLocaleString(undefined, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
            </div>
          </div>
        ))}
        {hasMore && !loading && (
          <button className="iconbtn" onClick={()=>load(false)}>Carica altro…</button>
        )}
        {loading && <div className="helper">Caricamento…</div>}
        {!loading && items.length === 0 && <div className="helper">Nessuna conversazione.</div>}
      </div>
    </aside>
  );
}

/** NUOVO: Drawer destro per Impostazioni (vuoto per ora). */
export function RightDrawer({
  open, onClose
}: { open:boolean; onClose:()=>void }) {
  return (
    <aside
      className={`drawer right ${open ? "open":""}`}
      // NB: supponiamo che lo stile .drawer.right lo posizioni a destra; se non presente, aggiungi CSS:
      // .drawer.right { right: 0; left: auto; }
    >
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Impostazioni</div>
        <div className="spacer" />
      </div>
      <div className="list">
        {/* Vuoto per ora */}
      </div>
    </aside>
  );
}
