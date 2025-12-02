/**
 * ============================================================================
 * COMPONENTE: Drawers (navigazione laterale destra e sinistra)
 * ============================================================================
 * 
 * PERCORSO: /components/Drawers.tsx
 * 
 * REFACTORED: I contenuti dei drawer sono stati estratti in:
 * - components/drawers/DrawerDati.tsx
 * - components/drawers/DrawerDocs.tsx
 * - components/drawers/DrawerImpostazioni.tsx
 * 
 * ============================================================================
 */

"use client";
import { useEffect, useState } from "react";

// Drawer content components (estratti per mantenibilità)
import DrawerDati from './drawers/DrawerDati';
import DrawerDocs from './drawers/DrawerDocs';
import DrawerImpostazioni from './drawers/DrawerImpostazioni';

/* ----------------------- Hook stato drawer sx/dx ----------------------- */
export type RightDrawerContent = 'dati' | 'docs' | 'impostazioni' | null;

export function useDrawers() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightContent, setRightContent] = useState<RightDrawerContent>(null);
  
  return {
    leftOpen,
    rightOpen: rightContent !== null,
    rightContent,
    openLeft: () => setLeftOpen(true),
    closeLeft: () => setLeftOpen(false),
    openDati: () => setRightContent('dati'),
    openDocs: () => setRightContent('docs'),
    openImpostazioni: () => setRightContent('impostazioni'),
    closeRight: () => setRightContent(null),
  };
}

/* ---------------------------- Tipi conversazioni ---------------------------- */
type Conv = { id: string; title: string; updated_at?: string };

/* -------------------------------- LeftDrawer -------------------------------- */
export function LeftDrawer({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect?: (c: Conv) => void;
}) {
  const [items, setItems] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const handleSelect = (conv: Conv) => {
    if (onSelect) {
      onSelect(conv);
    } else {
      onClose();
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('repping_settings');
          const data = saved ? JSON.parse(saved) : {};
          data.homePageMode = 'chat';
          localStorage.setItem('repping_settings', JSON.stringify(data));
        } catch {}
        window.dispatchEvent(new CustomEvent('repping:homePageModeChanged', { detail: { mode: 'chat' } }));
        window.location.href = '/';
      }
    }
  };

  async function load(reset = false) {
    if (loading) return;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({ limit: "20", offset: String(reset ? 0 : offset) });
    const res = await fetch(`/api/conversations/list?${q.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.details || data?.error || "Errore");
      setLoading(false);
      return;
    }
    const newItems: Conv[] = data.items || [];
    setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
    if (data.nextOffset != null) {
      setOffset(data.nextOffset);
      setHasMore(true);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function remove(id: string) {
    if (!confirm("Eliminare questa sessione?")) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.details || data?.error || `Errore eliminazione (HTTP ${res.status})`);
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
    await load(true);
  }

  async function createNew() {
    const t = prompt("Titolo nuova sessione:");
    const title = (t ?? "").trim();
    if (!title) return;

    const res = await fetch("/api/conversations/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.details || data?.error || "Errore creazione");
      return;
    }
    const conv: Conv = data?.conversation ?? data?.item ?? data;
    if (!conv?.id) {
      alert("Errore: ID sessione mancante nella risposta");
      return;
    }
    setItems((prev) => [conv, ...prev]);
    handleSelect(conv);
  }

  return (
    <aside className={`drawer ${open ? "open" : ""}`}>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Sessioni</div>
        <div className="spacer" />
        <button className="iconbtn" onClick={() => load(true)}>↻</button>
      </div>

      <div className="list">
        <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <button className="btn" onClick={createNew}>Crea + nomina nuova sessione</button>
        </div>

        {error && <div className="row" style={{ color: "#F59E0B" }}>Errore: {error}</div>}

        {items.map((c) => (
          <div key={c.id} className="row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => handleSelect(c)} title={c.title}>
              <div className="title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.title}
              </div>
            </div>
            <button className="iconbtn" title="Elimina" onClick={() => remove(c.id)}>🗑️</button>
          </div>
        ))}

        {hasMore && items.length > 0 && !loading && (
          <button className="iconbtn" onClick={() => load(false)}>Carica altro…</button>
        )}

        {loading && <div className="helper">Caricamento…</div>}
        {!loading && items.length === 0 && <div className="helper">Nessuna sessione.</div>}
      </div>
    </aside>
  );
}

/* ------------------------------- RightDrawer ------------------------------- */
export function RightDrawer({
  open,
  content,
  onClose,
}: {
  open: boolean;
  content: RightDrawerContent;
  onClose: () => void;
}) {
  return (
    <aside className={`drawer right ${open ? "open" : ""}`}>
      {content === 'dati' && <DrawerDati onClose={onClose} />}
      {content === 'docs' && <DrawerDocs onClose={onClose} />}
      {content === 'impostazioni' && <DrawerImpostazioni onClose={onClose} />}
    </aside>
  );
}

/* ---------------------- WRAPPER CON BACKDROP ---------------------- */
export function DrawersWithBackdrop({
  leftOpen,
  rightOpen,
  rightContent,
  onCloseLeft,
  onCloseRight,
  onSelectConversation,
}: {
  leftOpen: boolean;
  rightOpen: boolean;
  rightContent: RightDrawerContent;
  onCloseLeft: () => void;
  onCloseRight: () => void;
  onSelectConversation?: (c: Conv) => void;
}) {
  return (
    <>
      {/* Backdrop */}
      {(leftOpen || rightOpen) && (
        <div
          onClick={() => {
            if (leftOpen) onCloseLeft();
            if (rightOpen) onCloseRight();
          }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1999,
            cursor: 'pointer',
          }}
        />
      )}

      {/* Drawer */}
      <div style={{ position: 'relative', zIndex: 2001 }}>
        <LeftDrawer open={leftOpen} onClose={onCloseLeft} onSelect={onSelectConversation} />
        <RightDrawer open={rightOpen} content={rightContent} onClose={onCloseRight} />
      </div>
    </>
  );
}
