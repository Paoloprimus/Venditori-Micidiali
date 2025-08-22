"use client";
import { useState } from "react";

/** Stato apertura pannelli (icone aprono/chiudono) */
export function useDrawers() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  return {
    leftOpen, topOpen,
    openLeft: ()=>setLeftOpen(true), closeLeft: ()=>setLeftOpen(false),
    openTop: ()=>setTopOpen(true), closeTop: ()=>setTopOpen(false),
  };
}

/** Drawer sinistro (apri/chiudi da icone) */
export function LeftDrawer({
  open, onClose
}: { open:boolean; onClose:()=>void }) {
  return (
    <aside className={`drawer ${open ? "open":""}`}>
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
        {/* TODO: popolare con elenco reale da DB nello step successivo */}
      </div>
    </aside>
  );
}

/** Top sheet (apri/chiudi da icone) */
type Usage = { tokensIn:number; tokensOut:number; costTotal:number };

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
