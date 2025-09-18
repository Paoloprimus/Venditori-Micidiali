// components/home/TopBar.tsx
"use client";
import React, { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/config"; // ← prende "Repping" da env (fallback incluso)

type Props = {
  title: string;          // nome chat (es. "gio 18/09/25, 15:02" o quello che usi)
  onOpenLeft: () => void;
  onOpenTop: () => void;
  onLogout: () => void;
  userName?: string;
};

export default function TopBar({ title, onOpenLeft, onOpenTop, onLogout }: Props) {
  const [docsOpen, setDocsOpen] = useState(false);

  const brand = APP_NAME; // "Repping"

  // Data formattata in stile "gio 18/09/25"
  const today = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date());

  // Chiudi popup con ESC
  useEffect(() => {
    if (!docsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDocsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docsOpen]);

  return (
    <>
      <div className="topbar" style={{ justifyContent: "space-between" }}>
        {/* Drawer sinistro (conversazioni) */}
        <button className="iconbtn" aria-label="Apri conversazioni" onClick={onOpenLeft}>☰</button>

        {/* Centro: Repping (bold) + titolo chat + " - " + data */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <span className="title" style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
            {brand}
          </span>
          {!!title?.trim() && (
            <span className="title" style={{ whiteSpace: "nowrap" }}>
              {" "}{title.trim()}
            </span>
          )}
          <span
            style={{
              color: "var(--muted, #64748b)",
              fontSize: "0.9em",
              whiteSpace: "nowrap",
            }}
          >
            {" - "}{today}
          </span>
        </div>

        {/* Azioni a destra */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="iconbtn"
            aria-label="Apri Docs"
            onClick={() => setDocsOpen(true)}
            title="Docs"
          >
            📂
          </button>
          <button className="iconbtn" aria-label="Apri impostazioni" onClick={onOpenTop}>⚙</button>
          <button className="iconbtn" onClick={onLogout}>Esci</button>
        </div>
      </div>

      {/* Popup Docs */}
      {docsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Docs"
          className="fixed inset-0 z-30 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/30" onClick={() => setDocsOpen(false)} />
          <div className="relative z-40 w-full max-w-md rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm">Docs</h2>
              <button className="iconbtn" aria-label="Chiudi Docs" onClick={() => setDocsOpen(false)} title="Chiudi">
                ✕
              </button>
            </div>
            <div className="text-sm text-slate-700">
              Qui mostreremo i tuoi documenti. (Contenuto in arrivo)
            </div>
          </div>
        </div>
      )}
    </>
  );
}

