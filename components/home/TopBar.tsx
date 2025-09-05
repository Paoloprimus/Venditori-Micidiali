"use client";
import React, { useEffect, useState } from "react";

type Props = {
  title: string;          // oggi: conv.title oppure "Venditore Micidiale"
  onOpenLeft: () => void;
  onOpenTop: () => void;
  onLogout: () => void;
  userName?: string;      // ⬅️ nuovo
};

export default function TopBar({ title, onOpenLeft, onOpenTop, onLogout, userName }: Props) {
  const [docsOpen, setDocsOpen] = useState(false);

  const appName = "Venditore Micidiale";
  const sessionTitle = title && title !== appName ? title : "";

  useEffect(() => {
    if (!docsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDocsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docsOpen]);

  // Mostra solo il primo nome (parte prima dello spazio)
  const firstName = userName ? userName.split(" ")[0] : null;

  return (
    <>
      <div className="topbar">
        {/* Drawer sinistro (conversazioni) */}
        <button className="iconbtn" aria-label="Apri conversazioni" onClick={onOpenLeft}>☰</button>

        {/* Nome app + titolo sessione */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <span className="title" style={{ whiteSpace: "nowrap" }}>{appName}</span>
          {sessionTitle && <span aria-hidden="true">·</span>}
          {sessionTitle && (
            <span
              title={sessionTitle}
              style={{
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "var(--muted, #64748b)",
                fontSize: "0.9em",
              }}
            >
              {sessionTitle}
            </span>
          )}
        </div>

        {/* Spacer */}
        <div className="spacer" />

        {/* Nome utente */}
        {firstName && (
          <span style={{ marginRight: 12, fontWeight: 500 }}>{firstName}</span>
        )}

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
