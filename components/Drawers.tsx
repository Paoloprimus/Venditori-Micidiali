"use client";
import { useState } from "react";

export function useDrawers() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  return { leftOpen, rightOpen, openLeft:()=>setLeftOpen(true), closeLeft:()=>setLeftOpen(false),
    openRight:()=>setRightOpen(true), closeRight:()=>setRightOpen(false) };
}

export function LeftDrawer({ open, onClose }: { open:boolean; onClose:()=>void }) {
  return (
    <aside className={`drawer ${open ? "open":""}`} style={{ left:0 }}>
      <div className="topbar"><button className="iconbtn" onClick={onClose}>Chiudi</button><div className="title">Conversazioni</div></div>
      <div className="list">
        <div className="row"><div className="title">Esempio chat</div><div className="helper">Ultima attività • 12:45</div></div>
      </div>
    </aside>
  );
}

export function RightDrawer({ open, onClose }: { open:boolean; onClose:()=>void }) {
  return (
    <aside className={`drawer right ${open ? "open":""}`}>
      <div className="topbar"><button className="iconbtn" onClick={onClose}>Chiudi</button><div className="title">Costi & utilizzo</div></div>
      <div className="list">
        <div className="row"><div className="title">Questa chat</div><div className="helper">IN 0 • OUT 0 • Totale €0,00</div></div>
        <div className="row"><div className="title">Periodo (30g)</div><div className="helper">Totale €0,00</div></div>
      </div>
    </aside>
  );
}
