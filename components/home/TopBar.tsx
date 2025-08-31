"use client";
import React, { useEffect, useState } from "react";

type Props = {
  title: string;
  onOpenLeft: () => void;
  onOpenTop: () => void;
  onLogout: () => void;
};

export default function TopBar({ title, onOpenLeft, onOpenTop, onLogout }: Props) {
  const [docsOpen, setDocsOpen] = useState(false);

  // Chiudi con ESC
  useEffect(() => {
    if (!docsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDocsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docsOpen]);

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" aria-label="Apri conversazioni" onClick={onOpenLeft}>☰</button>

        <div
          className="title"
          style={{ flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {title}
        </div>

        <div className="spacer" />

        {/* 📂 Nuovo bottone Docs */}
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

      {/* Popup Docs (semplice, neutro, pronto da popolare in futuro) */}
      {docsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Docs"
          className="fixed inset-0 z-30 flex items-center justify-center"
        >
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDocsOpen(false)}
          />
          {/* pannello */}
          <div className="relative z-40 w-full max-w-md rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm">Docs</h2>
              <button
                className="iconbtn"
                aria-label="Chiudi Docs"
                onClick={() => setDocsOpen(false)}
                title="Chiudi"
              >
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
