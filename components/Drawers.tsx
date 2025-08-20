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
        <div className="row"><div className="title">Chat corrente</div><div className="helper">Ultima attività • adesso</div></div>
      </div>
    </aside>
  );
}

type Usage = { tokensIn: number; tokensOut: number; costTotal: number };

export function RightDrawer({ open, onClose, usage }: { open:boolean; onClose:()=>void; usage: Usage | null }) {
  const u = usage ?? { tokensIn: 0, tokensOut: 0, costTotal: 0 };
  return (
    <aside className={`drawer right ${open ? "open":""}`}>
      <div className="topbar"><button className="iconbtn" onClick={onClose}>Chiudi</button><div className="title">Costi & utilizzo</div></div>
      <div className="list">
        <div className="row">
          <div className="title">Questa chat</div>
          <div className="helper">IN {u.tokensIn} • OUT {u.tokensOut} • Totale €{u.costTotal.toFixed(4)}</div>
        </div>
        <div className="row"><div className="title">Periodo (30g)</div><div className="helper">Coming soon</div></div>
      </div>
    </aside>
  );
}
