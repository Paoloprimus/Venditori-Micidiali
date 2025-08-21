"use client";
import { useEffect, useState } from "react";
import { useDrawers, LeftDrawer, RightDrawer } from "./Drawers";
import { createSupabaseBrowser } from "../lib/supabase/client";

type Bubble = { role:"user"|"assistant"; content:string };
type Usage = { tokensIn:number; tokensOut:number; costTotal:number };

export default function HomeClient({ email }: { email: string }) {
  const supabase = createSupabaseBrowser();
  const { leftOpen, rightOpen, openLeft, closeLeft, openRight, closeRight } = useDrawers();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [terse, setTerse] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [modelBadge, setModelBadge] = useState<string>("…");

  async function refreshUsage() {
    const res = await fetch("/api/usage/current-chat");
    const data = await res.json();
    if (!data?.error) setUsage({ tokensIn: data.tokensIn ?? 0, tokensOut: data.tokensOut ?? 0, costTotal: data.costTotal ?? 0 });
  }

  useEffect(() => {
    refreshUsage();
    fetch("/api/model").then(r=>r.json()).then(d=>setModelBadge(d?.model ?? "n/d")).catch(()=>setModelBadge("n/d"));
  }, []);

  async function send() {
    setServerError(null);
    const content = input.trim(); if (!content) return;
    setBubbles(b => [...b, { role:"user", content }]);
    setInput("");
    const res = await fetch("/api/messages/send", {
      method:"POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ content, terse })
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data?.details || data?.error || "Errore server");
      setBubbles(b => [...b, { role:"assistant", content: "⚠️ Errore nel modello. Apri 📊 per dettagli." }]);
      return;
    }
    setBubbles(b => [...b, { role:"assistant", content: data.reply ?? "Ok." }]);
    await refreshUsage();
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
        <span className="badge">Modello: {modelBadge}</span>
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
          {serverError && <div className="helper" style={{ color:"#F59E0B" }}>Errore LLM: {serverError}</div>}
        </div>
      </div>

      <div className="composer">
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Scrivi qui la tua domanda… (Invio per inviare)"
          onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } }} />
        <button className="iconbtn" onClick={()=>setTerse(t=>!t)}>{terse ? "Risposta breve: ON":"Risposta breve: OFF"}</button>
        <button className="btn" onClick={send}>Invia</button>
      </div>

      <LeftDrawer open={leftOpen} onClose={closeLeft} />
      <RightDrawer open={rightOpen} onClose={closeRight} usage={usage} />
    </>
  );
}
