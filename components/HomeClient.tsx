// components/HomeClient.tsx
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useDrawers, LeftDrawer, RightDrawer } from "./Drawers";
import { createSupabaseBrowser } from "../lib/supabase/client";

// 🔽 nuovi componenti presentazionali (Step 1)
import TopBar from "./home/TopBar";
import Thread from "./home/Thread";
import Composer from "./home/Composer";

type Bubble = { role: "user" | "assistant"; content: string; created_at?: string };
type Usage = { tokensIn: number; tokensOut: number; costTotal: number };
type Conv = { id: string; title: string };

export default function HomeClient({ email }: { email: string }) {
  const supabase = createSupabaseBrowser();
  const { leftOpen, topOpen, openLeft, closeLeft, openTop, closeTop } = useDrawers();

  // ---- Stato UI / dati ----
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [modelBadge, setModelBadge] = useState<string>("…");
  const [currentConv, setCurrentConv] = useState<Conv | null>(null);

  // (facoltativo) creazione manuale conversazione
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // ---- Voce / TTS ----
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);

  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [lastAssistantText, setLastAssistantText] = useState("");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [speakerEnabled, setSpeakerEnabled] = useState(false);

  // SR nativo (no iOS)
  const isIOS = typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);
  const SR: any =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const supportsNativeSR = !!SR && !isIOS && (typeof window !== "undefined" ? window.isSecureContext : true);
  const srRef = useRef<any>(null);

  // MediaRecorder fallback
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Modalità dialogo vocale
  const [voiceMode, setVoiceMode] = useState(false);
  const dialogActiveRef = useRef(false);
  const dialogDraftRef = useRef<string>("");

  // Refs UI
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // ---------- Helpers ----------
  function autoResize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 164;
    el.style.height = Math.min(el.scrollHeight, max) + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }

  function hasSubmitCue(raw: string) {
    return /\besegui(?:\s+(?:ora|adesso))?\s*[.!?]*$/i.test(raw.trim());
  }
  function stripSubmitCue(raw: string) {
    return raw.replace(/\besegui(?:\s+(?:ora|adesso))?\s*[.!?]*$/i, "").trim();
  }
  function isCmdStop(raw: string)    { return /\bstop\s+dialogo\b/i.test(raw); }
  function isCmdAnnulla(raw: string) { return /\bannulla\b/i.test(raw); }
  function isCmdRipeti(raw: string)  { return /\bripeti\b/i.test(raw); }
  function isCmdNuova(raw: string)   { return /\bnuova\s+sessione\b/i.test(raw); }

  function focusComposer() {
    try {
      if (!taRef.current) return;
      taRef.current.focus({ preventScroll: true } as any);
      const v = taRef.current.value || "";
      taRef.current.selectionStart = taRef.current.selectionEnd = v.length;
    } catch {}
  }

  function autoTitleRome() {
    const fmt = new Intl.DateTimeFormat("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      timeZone: "Europe/Rome",
    });
    return fmt.format(new Date()).toLowerCase().replace(/\./g, "");
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

  // ---------- Bootstrap ----------
  useEffect(() => {
    const loadTodaySession = async () => {
      const todayTitle = autoTitleRome();
      try {
        const res = await fetch(`/api/conversations/list?limit=50`);
        const data = await res.json();
        if (res.ok && data.items) {
          const todaySession = data.items.find((item: Conv) => item.title === todayTitle);
          if (todaySession) {
            setCurrentConv(todaySession);
            await loadMessages(todaySession.id);
            await refreshUsage(todaySession.id);
          }
        }
      } catch (e) {
        console.log("Errore nel caricamento sessioni:", e);
      }
    };

    fetch("/api/model")
      .then((r) => r.json())
      .then((d) => setModelBadge(d?.model ?? "n/d"))
      .catch(() => setModelBadge("n/d"));

    loadTodaySession();

    try { window.speechSynthesis?.getVoices?.(); } catch {}
  }, []);

  // Preferenza altoparlante per sessione
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

  // Focus iniziale (no iOS)
  useEffect(() => {
    const isIOS = typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);
    if (isIOS || isTranscribing) return;
    const id = setTimeout(() => { focusComposer(); }, 80);
    return () => clearTimeout(id);
  }, [currentConv?.id, isTranscribing]);

  // Scroll to bottom sui nuovi messaggi
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [bubbles]);

  // ---------- Conversazioni ----------
  async function createConversation() {
    const title = newTitle.trim();
    if (!title) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/conversations/new", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore creazione conversazione");
      const id = data?.id ?? data?.conversation?.id ?? data?.item?.id;
      const t = data?.title ?? data?.conversation?.title ?? data?.item?.title ?? title;
      if (!id) throw new Error("ID conversazione mancante nella risposta");
      setCurrentConv({ id, title: t });
      setBubbles([]);
      await refreshUsage(id);
    } catch (e: any) {
      alert(e?.message || "Errore nella creazione della conversazione");
    } finally {
      setIsCreating(false);
    }
  }

  async function ensureConversation(): Promise<Conv> {
    if (currentConv?.id) return currentConv;
    const autoTitle = autoTitleRome();
    try {
      const res = await fetch(`/api/conversations/list?limit=50`);
      const data = await res.json();
      if (res.ok && data.items) {
        const todaySession = data.items.find((item: Conv) =>
          item.title === autoTitle || item.title.includes(autoTitle)
        );
        if (todaySession) {
          setCurrentConv(todaySession);
          await refreshUsage(todaySession.id);
          return todaySession;
        }
      }
    } catch (e) {
      console.log("Errore nel controllo sessioni esistenti:", e);
    }
    const res = await fetch("/api/conversations/new", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: autoTitle }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.details || data?.error || "Errore creazione automatica");
    const id = data?.id ?? data?.conversation?.id ?? data?.item?.id;
    const title = data?.title ?? data?.conversation?.title ?? data?.item?.title ?? autoTitle;
    if (!id) throw new Error("ID conversazione mancante nella risposta");
    const conv = { id, title };
    setCurrentConv(conv);
    await refreshUsage(id);
    return conv;
  }

  // ---------- Invio messaggi ----------
  async function send() {
    setServerError(null);
    const content = input.trim();
    if (!content) return;
    let conv: Conv;
    try {
      conv = await ensureConversation();
    } catch (e: any) {
      alert(e?.message || "Impossibile creare la conversazione");
      return;
    }
    const convId = conv.id;

    setBubbles((b) => [...b, { role: "user", content }]);
    setInput("");
    autoResize();

    try { window.speechSynthesis?.cancel?.(); } catch {}
    setTtsSpeaking(false);

    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, terse: false, conversationId: convId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data?.details || data?.error || "Errore server");
      setBubbles((b) => [...b, { role: "assistant", content: "⚠️ Errore nel modello. Apri il pannello in alto per dettagli." }]);
      return;
    }
    const replyText = data.reply ?? "Ok.";
    setBubbles((b) => [...b, { role: "assistant", content: replyText }]);
    setLastAssistantText(replyText);
    if (speakerEnabled && lastInputWasVoice) speakAssistant(replyText);
    await refreshUsage(convId);
  }

  async function sendDirectly(content: string) {
    setServerError(null);
    let conv: Conv;
    try {
      conv = await ensureConversation();
    } catch {
      speakAssistant("Impossibile creare la conversazione");
      return;
    }
    const convId = conv.id;

    setBubbles((b) => [...b, { role: "user", content }]);
    setLastInputWasVoice(true);

    try { window.speechSynthesis?.cancel?.(); } catch {}
    setTtsSpeaking(false);

    const res = await fetch("/api/messages/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, terse: false, conversationId: convId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data?.details || data?.error || "Errore server");
      setBubbles((b) => [...b, { role: "assistant", content: "⚠️ Errore nel modello. Apri il pannello in alto per dettagli." }]);
      return;
    }
    const replyText = data.reply ?? "Ok.";
    setBubbles((b) => [...b, { role: "assistant", content: replyText }]);
    setLastAssistantText(replyText);

    if (speakerEnabled) {
      const cleanText = replyText
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\*/g, "")
        .replace(/_/g, "")
        .replace(/\.{2,}/g, ".")
        .trim();
      speakAssistant(cleanText);
    }
    await refreshUsage(convId);
  }

  // ---------- Logout ----------
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function handleSelectConv(c: { id: string; title: string }) {
    setCurrentConv({ id: c.id, title: c.title });
    closeLeft();
    loadMessages(c.id);
    refreshUsage(c.id);
  }

  // ---------- Voce: util ----------
  function pickMime() {
    try {
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
        if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
      }
    } catch {}
    return "";
  }

  async function listenOnce(): Promise<string> {
    if (supportsNativeSR && SR) {
      return new Promise((resolve) => {
        try {
          const sr = new SR();
          sr.lang = "it-IT";
          sr.interimResults = false;
          sr.maxAlternatives = 1;
        let got = false;
          sr.onresult = (e: any) => {
            got = true;
            const t = e?.results?.[0]?.[0]?.transcript || "";
            resolve(t.toString());
            try { sr.stop?.(); } catch {}
          };
          sr.onerror = () => { if (!got) resolve(""); };
          sr.onend = () => { if (!got) resolve(""); };
          sr.start();
        } catch { resolve(""); }
      });
    }
    // Fallback: breve registrazione + trascrizione server
    return new Promise(async (resolve) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream, { mimeType: pickMime() });
        const chunks: BlobPart[] = [];
        mr.ondataavailable = (ev) => { if (ev.data?.size) chunks.push(ev.data); };
        mr.onstop = async () => {
          try {
            const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
            const fd = new FormData();
            fd.append("audio", blob, blob.type.includes("mp4") ? "audio.mp4" : "audio.webm");
            const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
            const data = await res.json();
            resolve((data?.text || "").toString());
          } catch { resolve(""); }
          finally { try { stream.getTracks().forEach(t => t.stop()); } catch {} }
        };
        mr.start();
        setTimeout(() => { try { if (mr.state !== "inactive") mr.stop(); } catch {} }, 4000);
      } catch { resolve(""); }
    });
  }

  // ---------- Voce: nativo ----------
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

  // ---------- Voce: fallback recorder ----------
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
        } catch (e: any) {
          setVoiceError(e?.message || "Errore durante la trascrizione");
        } finally {
          setIsTranscribing(false);
          try { stream.getTracks().forEach((t) => t.stop()); } catch {}
          streamRef.current = null;
        }
      };
      mrRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (e: any) {
      setVoiceError(e?.message || "Microfono non disponibile o permesso negato");
      setIsRecording(false);
    }
  }

  function stopRecorderOrSR() {
    if (srRef.current) {
      try { srRef.current.stop?.(); } catch {}
      srRef.current = null;
      return;
    }
    if (mrRef.current && mrRef.current.state !== "inactive") {
      try { mrRef.current.stop(); } catch {}
      return;
    }
    try { streamRef.current?.getTracks()?.forEach((t) => t.stop()); } catch {}
  }

  function handleVoicePressStart() {
    if (isTranscribing || isRecording) return;
    if (supportsNativeSR) startNativeSR();
    else startRecorder();
  }
  function handleVoicePressEnd() {
    if (!isRecording) return;
    stopRecorderOrSR();
  }
  function handleVoiceClick() {
    if (!isRecording) handleVoicePressStart();
    else handleVoicePressEnd();
  }

  // ---------- Dialogo vocale ----------
  async function startDialog() {
    if (voiceMode) return;
    setVoiceMode(true);
    dialogActiveRef.current = true;
    dialogDraftRef.current = "";
    try { window.speechSynthesis?.cancel?.(); } catch {}

    const welcomeMessage = "Dimmi pure.";
    setLastAssistantText(welcomeMessage);
    await new Promise(r => setTimeout(r, 100));
    speakAssistant(welcomeMessage);
    dialogLoop();
  }

  function stopDialog() {
    dialogActiveRef.current = false;
    setVoiceMode(false);
    try { window.speechSynthesis?.cancel?.(); } catch {}
    stopRecorderOrSR();
  }

  async function dialogLoop() {
    while (dialogActiveRef.current) {
      const heard = (await listenOnce()).trim();
      if (!dialogActiveRef.current) break;
      if (!heard) continue;

      if (isCmdStop(heard))   { speakAssistant("Dialogo disattivato."); stopDialog(); break; }
      if (isCmdAnnulla(heard)){ dialogDraftRef.current = ""; speakAssistant("Annullato. Dimmi pure."); continue; }
      if (isCmdRipeti(heard)) { speakAssistant(); continue; }
      if (isCmdNuova(heard))  {
        try {
          const title = autoTitleRome();
          const res = await fetch("/api/conversations/new", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title })
          });
          const data = await res.json();
          const id = data?.id ?? data?.conversation?.id ?? data?.item?.id;
          if (id) {
            setCurrentConv({ id, title: data?.title ?? data?.conversation?.title ?? data?.item?.title ?? title });
            setBubbles([]); refreshUsage(id);
            speakAssistant("Nuova sessione. Dimmi pure.");
          } else {
            speakAssistant("Non riesco a creare la sessione.");
          }
        } catch { speakAssistant("Errore creazione sessione."); }
        continue;
      }

      let text = heard;
      let shouldSend = false;
      if (hasSubmitCue(text)) { text = stripSubmitCue(text); shouldSend = true; }
      if (text) dialogDraftRef.current = (dialogDraftRef.current + " " + text).trim();

      if (shouldSend) {
        const toSend = dialogDraftRef.current.trim();
        dialogDraftRef.current = "";
        if (toSend) await sendDirectly(toSend);
        else speakAssistant("Dimmi cosa vuoi che faccia");
      }
    }
  }

  // ---------- TTS ----------
  function speakAssistant(textOverride?: string) {
    const text =
      textOverride ||
      lastAssistantText ||
      [...bubbles].reverse().find((b) => b.role === "assistant")?.content ||
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

    const voices = window.speechSynthesis.getVoices();
    const italianVoice = voices.find(v => v.lang.includes("it-IT") || v.lang.includes("it_IT"));
    if (italianVoice) u.voice = italianVoice;

    window.speechSynthesis.speak(u);
  }
  function stopSpeak() {
    try { window.speechSynthesis.cancel(); } catch {}
    setTtsSpeaking(false);
  }

  // ---------- UI helpers ----------
  const handleAnyHomeInteraction = useCallback(() => {
    if (leftOpen) closeLeft();
    if (topOpen) closeTop();
  }, [leftOpen, topOpen, closeLeft, closeTop]);

  // ---------- RENDER ----------
  return (
    <>
      <TopBar
        title={currentConv ? currentConv.title : "Venditori Micidiali"}
        onOpenLeft={openLeft}
        onOpenTop={openTop}
        onLogout={logout}
      />

      {/* WRAPPER esterno */}
      <div onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction} style={{ minHeight: "100vh" }}>
        <div className="container" onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction}>
          <Thread bubbles={bubbles} serverError={serverError} threadRef={threadRef} />
          <Composer
            value={input}
            onChange={(v) => { setInput(v); setLastInputWasVoice(false); }}
            onSend={send}
            disabled={isTranscribing}
            taRef={taRef}
            voice={{
              isRecording, isTranscribing, error: voiceError,
              onPressStart: handleVoicePressStart, onPressEnd: handleVoicePressEnd, onClick: handleVoiceClick,
              voiceMode, onToggleDialog: () => (voiceMode ? stopDialog() : startDialog()),
              speakerEnabled, onToggleSpeaker: () => setSpeakerEnabled(s => !s),
              canRepeat: !!lastAssistantText, onRepeat: () => speakAssistant(), ttsSpeaking
            }}
          />
        </div>
      {/* ✅ FIX: chiusura wrapper mancante (non rimuovere) */}
      </div>

      <LeftDrawer open={leftOpen} onClose={closeLeft} onSelect={handleSelectConv} />
      <RightDrawer open={topOpen} onClose={closeTop} />
    </>
  );
}
