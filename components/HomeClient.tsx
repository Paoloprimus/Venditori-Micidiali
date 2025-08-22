"use client";
import { useEffect, useRef, useState } from "react";
import { useDrawers, LeftDrawer, TopSheet } from "./Drawers";
import { createSupabaseBrowser } from "../lib/supabase/client";

type Bubble = { role:"user"|"assistant"; content:string; created_at?: string };
type Usage = { tokensIn:number; tokensOut:number; costTotal:number };
type Conv = { id:string; title:string };

export default function HomeClient({ email }: { email: string }) {
  const supabase = createSupabaseBrowser();
  const { leftOpen, topOpen, openLeft, closeLeft, openTop, closeTop } = useDrawers();

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [modelBadge, setModelBadge] = useState<string>("…");
  const [currentConv, setCurrentConv] = useState<Conv | null>(null);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  function autoResize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 164;
    el.style.height = Math.min(el.scrollHeight, max) + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }

  async function refreshUsage(convId?: string) {
    const q = convId ? `?conversationId=${encodeURIComponent(convId)}` : "";
    const res = await fetch(`/api/usage/current-chat${q}`);
    const data = await res.json();
    if (!data?.error) setUsage({ tokensIn: data.tokensIn ?? 0, tokensOut: data.tokensOut ?? 0, costTotal: data.costTotal ?? 0 });
  }

  async function loadMessages(convId: string) {
    const q = new URLSearchParams({ conversationId: convId, limit: "200" });
    const res = await fetch(`/api/messages/by-conversation?${q.toString()}`);
    const data = await res.json();
    if (res.ok) {
      setBubbles((data.items || []).map((m: any) => ({ role: m.role, content: m.content, created_at: m.created_at })));
    } else {
      setBubbles([]);
    }
  }

  useEffect(() => {
    fetch("/api/model").then(r=>r.json()).then(d=>setModelBadge(d?.model ?? "n/d")).catch(()=>setModelBadge("n/d"));
    refreshUsage();
  }, []);

  async function send() {
    setServerError(null);
    const content = input.trim(); if (!content) return;
    const convId = currentConv?.id || undefined;
    setBubbles(b => [...b, { role:"user", content }]);
    setInput(""); autoResize();
    const res = await fetch("/api/messages/send", {
      method:"POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ content, terse: false, conversationId: convId })
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data?.details || data?.error || "Errore server");
      setBubbles(b => [...b, { role:"assistant", content: "⚠️ Errore nel modello. Apri il pannello in alto per dettagli." }]);
      return;
    }
    if (!convId && data.conversationId) {
      setCurrentConv({ id: data.conversationId, title: "Nuova chat" });
    }
    setBubbles(b => [...b, { role:"assistant", content: data.reply ?? "Ok." }]);
    await refreshUsage(currentConv?.id || data.conversationId);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function handleSelectConv(c: { id:string; title:string }) {
    setCurrentConv({ id: c.id, title: c.title });
    closeLeft();
    loadMessages(c.id);
    refreshUsage(c.id);
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" aria-label="Apri conversazioni" onClick={openLeft}>☰</button>
        <div className="title">AIxPMI Assistant{currentConv ? ` — ${currentConv.title}` : ""}</div>
        <div className="spacer" />
        <button className="iconbtn" aria-label="Apri costi & utilizzo" onClick={openTop}>📊</button>
        <button className="iconbtn" onClick={logout}>Esci</button>
      </div>

      <div className="container">
        <div className="thread">
          {bubbles.length === 0 && (
            <div className="helper">
              Benvenuto! Inizia una nuova conversazione (☰ → “Nuova”) o selezionane una esistente. Poi scrivi sotto.
            </div>
          )}
          {bubbles.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "me":""}`}>{m.content}</div>
          ))}
          {serverError && <div className="helper" style={{ color:"#F59E0B" }}>Errore LLM: {serverError}</div>}
        </div>
      </div>

      <div className="composer">
        <div className="inputwrap">
          <textarea
            ref={taRef}
            value={input}
            onChange={e=>{ setInput(e.target.value); autoResize(); }}
            placeholder={currentConv ? "Scrivi un messaggio…" : "Scrivi un messaggio (verrà creata una nuova chat)…"}
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

      <LeftDrawer open={leftOpen} onClose={closeLeft} onSelect={handleSelectConv} />
      <TopSheet open={topOpen} onClose={closeTop} usage={usage} model={modelBadge} />
    </>
  );
}
