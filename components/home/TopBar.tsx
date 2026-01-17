// components/home/TopBar.tsx
"use client";
import React from "react";
import { APP_NAME } from "@/lib/config";

type Props = {
  title: string;
  onOpenLeft: () => void;
  onOpenDati: () => void;
  onOpenDocs: () => void;
  onOpenImpostazioni: () => void;
  onLogout: () => void;
  userName?: string;
};

export default function TopBar({ 
  title, 
  onOpenLeft, 
  onOpenDati,
  onOpenDocs,
  onOpenImpostazioni,
  onLogout 
}: Props) {
  const brand = APP_NAME; // "Repping"

  return (
    <div className="topbar" style={{ justifyContent: "space-between" }}>
      {/* Drawer sinistro (conversazioni) */}
      <button className="iconbtn" aria-label="Apri conversazioni" onClick={onOpenLeft}>
        ☰
      </button>

{/* Centro: Icona + Repping (bold, cliccabile) + titolo chat */}
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
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer",
      userSelect: "none",
    }}
    onClick={() => window.location.href = '/'}
  >
    {/* Icona R lime su sfondo nero */}
    <svg 
      width="28" 
      height="28" 
      viewBox="0 0 512 512" 
      style={{ borderRadius: 6, flexShrink: 0 }}
    >
      <rect width="512" height="512" fill="#1e1e1e" rx="96"/>
      <text 
        x="256" 
        y="380" 
        fontFamily="Outfit, system-ui, sans-serif" 
        fontSize="360" 
        fontWeight="900" 
        fill="#BEFF00" 
        textAnchor="middle"
      >
        R
      </text>
    </svg>
    <span 
      className="title" 
      style={{ 
        whiteSpace: "nowrap", 
        fontWeight: 600,
      }}
    >
      {brand}
    </span>
  </div>
  {!!title?.trim() && (
    <span className="title" style={{ whiteSpace: "nowrap" }}>
      {" "}{title.trim()}
    </span>
  )}
</div>

      {/* Azioni a destra */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="iconbtn"
          aria-label="Gestione"
          onClick={onOpenDati}
          title="Gestione"
        >
          📝
        </button>
        <button
          className="iconbtn"
          aria-label="Documenti"
          onClick={onOpenDocs}
          title="Documenti"
        >
          📁
        </button>
        <button
          className="iconbtn"
          aria-label="Impostazioni"
          onClick={onOpenImpostazioni}
          title="Impostazioni"
        >
          ⚙️
        </button>
        <button className="iconbtn" onClick={onLogout}>
          Esci
        </button>
      </div>
    </div>
  );
}
