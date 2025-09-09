"use client";
import React, { useEffect, useState } from "react";

type Props = {
  title: string;          // oggi: conv.title oppure "Venditore Micidiale"
  onOpenLeft: () => void;
  onOpenTop: () => void;
  onLogout: () => void;
  userName?: string;
};

export default function TopBar({ title, onOpenLeft, onOpenTop, onLogout, userName }: Props) {
  const [docsOpen, setDocsOpen] = useState(false);

  const appName = "Micidiale!";

  // Data formattata in stile "sab 06/09/25"
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

  // Mostra solo il primo nome (parte prima dello spazio)
  const firstName = userName ? userName.split(" ")[0] : "";

  return (
    <>
      <div className="topbar" style={{ justifyContent: "space-between" }}>
        {/* Drawer sinistro (conversazioni) */}
        <button className="iconbtn" aria-label="Apri conversazioni" onClick={onOpenLeft}>☰</button>

        {/* Centro: Nome + AppName + Data */}
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
          {firstName && <span style={{ fontWeight: 500 }}>{firstName}</span>}
          <span className="title" style={{ whiteSpace: "nowrap" }}>{appName}</span>
          <span
            style={{
              color: "var(--muted, #64748b)",
              fontSize: "0.9em",
              whiteSpace: "nowrap",
            }}
          >
            – {today}
          </span>
        </div>

        {/* Azioni a destra */}
        <div style={{ display: "flex", gap: 8 }}>
          {/* 📂 Docs */}
          <button
            className="iconbtn"
            aria-label="Apri Docs"
            onClick={() => setDocsOpen(true)}
            title="Docs"
          >
            📂
          </button>

          {/* ⚙ Drawer destro */}
          <button className="iconbtn" aria-label="Apri impostazioni" onClick={onOpenTop}>⚙</button>

          {/* Esci */}
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
