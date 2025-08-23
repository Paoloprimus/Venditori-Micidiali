"use client";
import { useEffect, useRef, useState } from "react";
import { useDrawers, LeftDrawer, RightDrawer } from "./Drawers";
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

  // Stato per nominare la chat prima di iniziare
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // ---- VOCE: stati e ref ----
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);

  // TTS (Voce IA)
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [lastAssistantText, setLastAssistantText] = useState("");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Toggle "Altoparlante" (auto-TTS se ultimo input = vocale)
  const [speakerEnabled, setSpeakerEnabled] = useState(false);

  // SpeechRecognition nativo: disabilitato su iOS (forza fallback)
  const isIOS = typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);
  const SR: any = (typeof window !== "undefined")
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null;
  const supportsNativeSR = !!SR && !isIOS && (typeof window !== "undefined" ? window.isSecureContext : true);
  const srRef = useRef<any>(null);

  // MediaRecorder fallback
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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

  // init + cleanup
  useEffect(() => {
    fetch("/api/model").then(r=>r.json()).then(d=>setModelBadge(d?.model ?? "n/d")).catch(()=>setModelBadge("n/d"));
    refreshUsage();
    try { window.speechSynthesis?.getVoices?.(); } catch {}
    return () => {
      try { srRef.current?.stop?.(); } catch {}
      try { if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop(); } catch {}
      try { streamRef.current?.getTracks()?.forEach(t=>t.stop()); } catch {}
      try { window.speechSynthesis?.cancel?.(); } catch {}
    };
  }, []);

  // carica/salva preferenza altoparlante per sessione
  useEffect(() => {
    const id = currentConv?.id;
    if (!id) return;
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(`autoTTS:${id}`) : null;
    setSpeakerEnabled(saved === "1");
  }, [currentConv?.id]);

  useEffect(() => {
    const id = currentConv?.id;
    if (!id) return;
    try { localStorage.setItem(`autoTTS:${id}`, speakerEnabled ? "1" : "0"); } catch {}
  }, [speakerEnabled, currentConv?.id]);

  async function createConversation() {
    const title = newTitle.trim();
    if (!title) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/conversations/new", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore creazione conversazione");
      const id = data?.id ?? data?.conversation?.id ?? data?.item?.id;
      if (!id) throw new Error("ID conversazione mancante nella risposta");
      setCurrentConv({ id, title });
      setBubbles([]);
      await refreshUsage(id);
    } catch (e:any) {
      alert(e?.message || "Errore nella creazione della conversazione");
    } finally {
      setIsCreating(false);
    }
  }

  async function send() {
    setServerError(null);
    const content = input.trim(); if (!content) return;
    if (!currentConv?.id) {
      alert("Prima di chattare, nomina la prossima chat.");
      return;
    }
    const convId = currentConv.id;
    setBubbles(b => [...b, { role:"user", content }]);
    setInput(""); autoResize();

    // se stava parlando, ferma
    try { window.speechSynthesis?.cancel?.(); } catch {}
    setTtsSpeaking(false);

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
    const replyText = data.reply ?? "Ok.";
    setBubbles(b => [...b, { role:"assistant", content: replyText }]);
    setLastAssistantText(replyText);

    // AUTO-TTS: solo se altoparlante ON e ultimo input era vocale
    if (speakerEnabled && lastInputWasVoice) {
      speakAssistant(replyText);
    }

    await refreshUsage(convId);
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

  // ---------- VOCE: util ----------
  function pickMime() {
    try {
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
        if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
      }
    } catch {}
    return "";
  }

  // ---------- VOCE: nativo ----------
  function startNativeSR() {
    if (!SR) return;
    setVoiceError(null);
    try {
      const sr = new SR();
      sr.lang = "it-IT";
      sr.interimResults = false;
      sr.maxAlternatives = 1;

      let handedOffToFallback = false;

      sr.onresult = (e: any) => {
        const transcript = e?.results?.[0]?.[0]?.transcript || "";
        setInput(transcript);
        setLastInputWasVoice(true);
        autoResize();
        try { sr.stop?.(); } catch {}
      };

      sr.onerror = (e: any) => {
        const code = e?.error || "errore";
        if (!handedOffToFallback && (code === "not-allowed" || code === "service-not-allowed")) {
          handedOffToFallback = true;
          setIsRecording(false);
          try { sr.stop?.(); } catch {}
          srRef.current = null;
          startRecorder();
          return;
        }
        setVoiceError(`Vocale nativo: ${code}`);
        setIsRecording(false);
      };

      sr.onend = () => {
        setIsRecording(false);
        srRef.current = null;
      };

      srRef.current = sr;
      sr.start();
      setIsRecording(true);
    } catch (e: any) {
      if (e?.name === "NotAllowedError") {
        setIsRecording(false);
        srRef.current = null;
        startRecorder();
        return;
      }
      setVoiceError(e?.message || "Errore avvio riconoscimento");
      setIsRecording(false);
    }
  }

  // ---------- VOCE: fallback recorder ----------
  async function startRecorder() {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: pickMime() });
      chunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data?.size) chunksRef.current.push(ev.data); };
      mr.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
          const fd = new FormData();
          fd.append("audio", blob, blob.type.includes("mp4") ? "audio.mp4" : "audio.webm");
          const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
          if (!res.ok) throw new Error(`Trascrizione fallita (HTTP ${res.status})`);
          const data = await res.json();
          const text = (data?.text || "").toString();
          if (text) {
            setInput(text);
            setLastInputWasVoice(true);
            autoResize();
          }
        } catch (e:any) {
          setVoiceError(e?.message || "Errore durante la trascrizione");
        } finally {
          setIsTranscribing(false);
          try { stream.getTracks().forEach(t => t.stop()); } catch {}
          streamRef.current = null;
        }
      };
      mrRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (e:any) {
      setVoiceError(e?.message || "Microfono non disponibile o permesso negato");
      setIsRecording(false);
    }
  }

  function stopRecorderOrSR() {
    if (srRef.current) { try { srRef.current.stop?.(); } catch {} srRef.current = null; return; }
    if (mrRef.current && mrRef.current.state !== "inactive") { try { mrRef.current.stop(); } catch {} return; }
    try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
  }

  function handleVoicePressStart() {
    if (!currentConv) { alert("Prima crea una sessione."); return; }
    if (isTranscribing || isRecording) return;
    if (supportsNativeSR) startNativeSR(); else startRecorder();
  }
  function handleVoicePressEnd() {
    if (!isRecording) return;
    stopRecorderOrSR();
  }
  function handleVoiceClick() {
    if (!isRecording) handleVoicePressStart(); else handleVoicePressEnd();
  }

  // ---------- TTS (Voce IA) ----------
  function speakAssistant(textOverride?: string) {
    const text =
      textOverride ||
      lastAssistantText ||
      [...bubbles].reverse().find(b => b.role === "assistant")?.content ||
      "";
    if (!text) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoiceError("Sintesi vocale non supportata dal browser");
      return;
    }
    try { window.speechSynthesis.cancel(); } catch {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "it-IT";
    u.rate = 1;
    u.onend = () => setTtsSpeaking(false);
    u.onerror = () => setTtsSpeaking(false);
    utterRef.current = u;
    setTtsSpeaking(true);
    window.speechSynthesis.speak(u);
  }
  function stopSpeak() {
    try { window.speechSynthesis.cancel(); } catch {}
    setTtsSpeaking(false);
  }

  // ---------- RENDER ----------
  return (
    <>
      <div className="topbar">
        <button className="iconbtn" aria-label="Apri conversazioni" onClick={openLeft}>☰</button>
        <div className="title">Venditori Micidiali{currentConv ? ` — ${currentConv.title}` : ""}</div>
        <div className="spacer" />
        <button className="iconbtn" aria-label="Apri impostazioni" onClick={openTop}>⚙️</button>
        <button className="iconbtn" onClick={logout}>Esci</button>
      </div>

      <div className="container">
        <div className="thread">
          {!currentConv && (
            <div className="helper">
              <div style={{ fontWeight:600, marginBottom:8 }}>Nomina la prossima sessione</div>
              <div style={{ display:"flex", gap:8 }}>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e=>setNewTitle(e.target.value)}
                  placeholder="Inserisci un nome…"
                  disabled={isCreating}
                  style={{ flex:1, padding:"10px 12px" }}
                />
                <button className="btn" onClick={createConversation} disabled={isCreating || !newTitle.trim()}>
                  Crea
                </button>
              </div>
            </div>
          )}

          {bubbles.length === 0 && currentConv && (
            <div className="helper">
              Nessun messaggio ancora. Scrivi qui sotto per iniziare.
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
            onChange={e=>{ setInput(e.target.value); setLastInputWasVoice(false); autoResize(); }}
            placeholder={currentConv ? "Scrivi un messaggio… o usa la voce 🎙️" : "Dopo aver creato la sessione potrai iniziare a scrivere messaggi."}
            onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } }}
            disabled={!currentConv || isTranscribing}
          />
        </div>
        <div className="actions">
          <div className="left">
            {/* 🎙️ Voce: press&hold su mobile, click = toggle su desktop */}
            <button
              className="iconbtn"
              disabled={!currentConv || isTranscribing}
              onMouseDown={handleVoicePressStart}
              onMouseUp={handleVoicePressEnd}
              onMouseLeave={handleVoicePressEnd}
              onTouchStart={handleVoicePressStart}
              onTouchEnd={handleVoicePressEnd}
              onClick={handleVoiceClick}
              aria-pressed={isRecording}
              aria-label="Input vocale"
              title={supportsNativeSR ? "Riconoscimento vocale nativo" : "Registra audio per trascrizione"}
            >
              {isRecording ? "🔴 Registrazione…" : "🎙️ Voce"}
            </button>

            {/* 🔊 Toggle Altoparlante (auto-TTS se ultimo input = vocale) */}
            <button
              className="iconbtn"
              disabled={!currentConv}
              onClick={() => setSpeakerEnabled(s => !s)}
              aria-pressed={speakerEnabled}
              title="Risposte vocali automatiche (solo se l'ultimo messaggio è vocale)"
            >
              {speakerEnabled ? "🔊 Altoparlante ON" : "🔈 Altoparlante OFF"}
            </button>

            {/* opzionale: mostra stato TTS/transcribe/errore */}
            {isTranscribing && <span style={{ marginLeft:8, fontSize:12, opacity:.7 }}>Trascrizione…</span>}
            {ttsSpeaking && <span style={{ marginLeft:8, fontSize:12, opacity:.7 }}>Riproduzione…</span>}
            {voiceError && <span style={{ marginLeft:8, fontSize:12, color:"#b00020" }}>{voiceError}</span>}
          </div>
          <div className="right">
            <button className="btn" onClick={send} disabled={!currentConv || isTranscribing}>Invia</button>
          </div>
        </div>
      </div>

      <LeftDrawer open={leftOpen} onClose={closeLeft} onSelect={handleSelectConv} />
      <RightDrawer open={topOpen} onClose={closeTop} />
    </>
  );
}
