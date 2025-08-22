"use client";
import { useState } from "react";

/** Gestione stato apertura pannelli */
export function useDrawers() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  return {
    leftOpen, topOpen,
    openLeft: ()=>setLeftOpen(true), closeLeft: ()=>setLeftOpen(false),
    openTop: ()=>setTopOpen(true), closeTop: ()=>setTopOpen(false),
  };
}

/** Drawer sinistro (con chiusura via swipe verso sinistra) */
export function LeftDrawer({
  open, onClose
}: { open:boolean; onClose:()=>void }) {

  // swipe per chiusura
  let startX = 0; let moved = false;
  function onTouchStart(e: React.TouchEvent) {
    startX = e.touches[0].clientX; moved = false;
  }
  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX;
    if (dx < -60) { moved = true; onClose(); }
  }

  return (
    <aside
      className={`drawer ${open ? "open":""}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Conversazioni</div>
        <div className="spacer" />
      </div>
      <div className="list">
        <div className="row">
          <div className="title">Chat corrente</div>
          <div className="helper">Ultima attività • adesso</div>
        </div>
        {/* TODO: popolare con elenco reale da DB nel passo successivo */}
      </div>
    </aside>
  );
}

/** Top sheet (ex drawer destro) che scende dall’alto; chiusura con swipe verso l’alto */
type Usage = { tokensIn:number; tokensOut:number; costTotal:number };

export function TopSheet({
  open, onClose, usage, model
}: { open:boolean; onClose:()=>void; usage:Usage|null; model:string }) {

  const u = usage ?? { tokensIn:0, tokensOut:0, costTotal:0 };

  // swipe per chiusura (verso l’alto)
  let startY = 0; let moved = false;
  function onTouchStart(e: React.TouchEvent) {
    startY = e.touches[0].clientY; moved = false;
  }
  function onTouchMove(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - startY;
    if (dy < -80) { moved = true; onClose(); }
  }

  return (
    <aside
      className={`topsheet ${open ? "open":""}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
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
          <div className="helper">IN {u.tokensIn} • OUT {u.tokensOut} • Totale €{u.costTotal.toFixed(4)}</div>
        </div>
        <div className="row">
          <div className="title">Periodo (30g)</div>
          <div className="helper">Coming soon</div>
        </div>
      </div>
    </aside>
  );
}
