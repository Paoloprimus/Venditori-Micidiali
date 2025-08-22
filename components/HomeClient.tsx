"use client";
import { useEffect, useRef, useState } from "react";
import { useDrawers, LeftDrawer, TopSheet } from "./Drawers";
import { createSupabaseBrowser } from "../lib/supabase/client";

type Bubble = { role:"user"|"assistant"; content:string };
type Usage = { tokensIn:number; tokensOut:number; costTotal:number };

export default function HomeClient({ email }: { email: string }) {
  const supabase = createSupabaseBrowser();
  const { leftOpen, topOpen, openLeft, closeLeft, openTop, closeTop } = useDrawers();

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [modelBadge, setModelBadge] = useState<string>("…");

  // --- Textarea auto-resize ---
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  function autoResize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 164; // deve combaciare con CSS
    el.style.height = Math.min(el.scrollHeight, max) + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }

  // --- API helpers ---
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
    setInput(""); autoResize();
    const res = await fetch("/api/messages/send", {
      method:"POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ content, terse: false })
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data?.details || data?.error || "Errore server");
      setBubbles(b => [...b, { role:"assistant", content: "⚠️ Errore nel modello. Apri il pannello dall’alto per dettagli." }]);
      return;
    }
    setBubbles(b => [...b, { role:"assistant", content: data.reply ?? "Ok." }]);
    await refreshUsage();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // --- Maniglia SINISTRA: swipe orizzontale dal "grip" interno (no bordo di sistema) ---
  let leftPointerId: number | null = null;
  let leftStartX = 0;
  function leftDown(e: React.PointerEvent) {
    leftPointerId = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(leftPointerId);
    leftStartX = e.clientX;
  }
  function leftMove(e: React.PointerEvent) {
    if (leftPointerId == null) return;
    const dx = e.clientX - leftStartX;
    if (dx > 60) { openLeft(); leftUp(e); }
  }
  function leftUp(e: React.PointerEvent) {
    if (leftPointerId != null) {
      (e.currentTarget as HTMLElement).releasePointerCapture(leftPointerId);
      leftPointerId = null;
    }
  }

  // --- Maniglia TOP: swipe verticale dal "grabber" interno (evita pull-to-refresh) ---
  let topPointerId: number | null = null;
  let topStartY = 0;
  function topDown(e: React.PointerEvent) {
    topPointerId = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(topPointerId);
    topStartY = e.clientY;
  }
  function topMove(e: React.PointerEvent) {
    if (topPointerId == null) return;
    const dy = e.clientY - topStartY;
    if (dy > 80) { openTop(); topUp(e); }
  }
  function topUp(e: React.PointerEvent) {
    if (topPointerId != null) {
      (e.currentTarget as HTMLElement).releasePointerCapture(topPointerId);
      topPointerId = null;
    }
  }

  return (
    <>
      {/* Maniglie interne per gesti web-safe */}
      <div
        className="handle-left"
        onPointerDown={leftDown}
        onPointerMove={leftMove}
        onPointerUp={leftUp}
        onClick={openLeft}
        aria-label="Apri conversazioni"
      />
      <div
        className="handle-top"
        onPointerDown={topDown}
        onPointerMove={topMove}
        onPointerUp={topUp}
        onClick={openTop}
        aria-label="Apri costi & utilizzo"
      >
        <div className="grabber" />
      </div>

      {/* TOP BAR (icone sempre disponibili come fallback) */}
      <div className="topbar">
        <button className="iconbtn" aria-label="Apri conversazioni" onClick={openLeft}>☰</button>
        <div className="title">AIxPMI Assistant</div>
        <div className="spacer" />
        <button className="iconbtn" aria-label="Apri costi & utilizzo" onClick={openTop}>📊</button>
        <button className="iconbtn" onClick={logout}>Esci</button>
      </div>

      {/* THREAD */}
      <div className="container">
        <div className="thread">
          {bubbles.length === 0 && (
            <div className="helper">
              Benvenuto! Inizia una nuova conversazione, apri le conversazioni dal <b>grip a sinistra</b> o con il bottone ☰.
              Apri i costi & modello dal <b>grabber in alto</b> o con il bottone 📊.
            </div>
          )}
          {bubbles.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "me":""}`}>{m.content}</div>
          ))}
          {serverError && <div className="helper" style={{ color:"#F59E0B" }}>Errore LLM: {serverError}</div>}
        </div>
      </div>

      {/* COMPOSER – mobile-first */}
      <div className="composer">
        <div className="inputwrap">
          <textarea
            ref={taRef}
            value={input}
            onChange={e=>{ setInput(e.target.value); autoResize(); }}
            placeholder="Scrivi qui la tua domanda…"
            onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } }}
          />
        </div>
        <div className="actions">
          <div className="left">
            <button className="iconbtn" onClick={()=>alert("Modalità vocale (fake): da collegare in seguito.")}>🎙️ Voce</button>
          </div>
          <div className="right">
            <button className="btn" onClick={send}>Invia</button>
          </div>
        </div>
      </div>

      {/* PANNELLI */}
      <LeftDrawer open={leftOpen} onClose={closeLeft} />
      <TopSheet open={topOpen} onClose={closeTop} usage={usage} model={modelBadge} />
    </>
  );
}
