"use client";
import { useState } from "react";
import { useDrawers, LeftDrawer, RightDrawer } from "@/components/Drawers";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Bubble = { role:"user"|"assistant"; content:string };

export default function HomeClient({ email }: { email: string }) {
  const supabase = createSupabaseBrowser();
  const { leftOpen, rightOpen, openLeft, closeLeft, openRight, closeRight } = useDrawers();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [terse, setTerse] = useState(false);
  const [estim, setEstim] = useState<string | null>(null);

  async function send() {
    const content = input.trim(); if (!content) return;
    setBubbles(b => [...b, { role:"user", content }]);
    setInput("");
    // chiamata "dummy" all'endpoint: niente LLM ancora
    const res = await fetch("/api/messages/send", {
      method:"POST", headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ content, terse })
    });
    const data = await res.json();
    if (data?.estimate) setEstim(`Stima costo: ~€${data.estimate.toFixed(4)}`);
    setBubbles(b => [...b, { role:"assistant", content: data.reply ?? "Ok." }]);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" aria-label="Apri conversazioni" onClick={openLeft}>☰</button>
        <div className="title" style={{ flex:1 }}>AIxPMI Assistant</div>
        <span className="badge">Modello: GPT-5</span>
        <button className="iconbtn" aria-label="Apri costi" onClick={openRight}>📊</button>
        <button className="iconbtn" onClick={logout}>Esci ({email})</button>
      </div>

      <div className="container">
        <div className="thread">
          {bubbles.length === 0 && (
            <div className="helper">Benvenuto! Inizia una nuova conversazione oppure prova: “Automatizzare email clienti”.</div>
          )}
          {bubbles.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "me":""}`}>{m.content}</div>
          ))}
        </div>
      </div>

      <div className="composer">
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Scrivi qui la tua domanda… (Invio per inviare)"
          onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } }} />
        <button className="iconbtn" onClick={()=>setTerse(t=>!t)}>{terse ? "Risposta breve: ON":"Risposta breve: OFF"}</button>
        <button className="btn" onClick={send}>Invia</button>
      </div>

      {estim && <div className="container helper" style={{ paddingBottom:12 }}>{estim}</div>}

      <LeftDrawer open={leftOpen} onClose={closeLeft} />
      <RightDrawer open={rightOpen} onClose={closeRight} />
    </>
  );
}
