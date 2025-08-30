// components/HomeClient.tsx
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useDrawers, LeftDrawer, RightDrawer } from "./Drawers";
import { createSupabaseBrowser } from "../lib/supabase/client";

type Bubble = { role: "user" | "assistant"; content: string; created_at?: string };
type Usage = { tokensIn: number; tokensOut: number; costTotal: number };
type Conv = { id: string; title: string };

export default function HomeClient({ email }: { email: string }) {
  const supabase = createSupabaseBrowser();
  const { leftOpen, topOpen, openLeft, closeLeft, openTop, closeTop } = useDrawers();

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [modelBadge, setModelBadge] = useState<string>("…");
  const [currentConv, setCurrentConv] = useState<Conv | null>(null);

  // (Facoltativo) nomina manuale
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

  // SpeechRecognition nativo (no iOS)
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

  // Modalità mani libere
  const [voiceMode, setVoiceMode] = useState(false);
  const dialogActiveRef = useRef(false);    // flag del loop
  const dialogDraftRef = useRef<string>(""); // testo accumulato finché non dici "esegui"

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  
  function autoResize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 164;
    el.style.height = Math.min(el.scrollHeight, max) + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }

  // --- Helper comandi vocali (Dialogo) ---
  function hasSubmitCue(raw: string) {
    // true se termina con: "esegui", "esegui ora", "esegui adesso" (+ punteggiatura)
    return /\besegui(?:\s+(?:ora|adesso))?\s*[.!?]*$/i.test(raw.trim());
  }
  
  function stripSubmitCue(raw: string) {
    // rimuove la parola chiave finale prima di inviare
    return raw.replace(/\besegui(?:\s+(?:ora|adesso))?\s*[.!?]*$/i, "").trim();
  }
  
  function isCmdStop(raw: string)     { return /\bstop\s+dialogo\b/i.test(raw); }
  function isCmdAnnulla(raw: string)  { return /\bannulla\b/i.test(raw); }
  function isCmdRipeti(raw: string)   { return /\bripeti\b/i.test(raw); }
  function isCmdNuova(raw: string)    { return /\bnuova\s+sessione\b/i.test(raw); }

  function focusComposer() {
    try {
      if (!taRef.current) return;
      // Evita scroll in cima quando mette il focus
      taRef.current.focus({ preventScroll: true } as any);
      // Metti il cursore alla fine
      const v = taRef.current.value || "";
      taRef.current.selectionStart = taRef.current.selectionEnd = v.length;
    } catch {}
  }
  
  // ---- Helpers ----
  function autoTitleRome() {
    const fmt = new Intl.DateTimeFormat("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      timeZone: "Europe/Rome",
    });
    // es. "mar 28/08/25" (forziamo minuscolo ed eliminiamo eventuali punti)
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

  // init + cleanup
  useEffect(() => {
    // Prima controlla se c'è una sessione di oggi
    const loadTodaySession = async () => {
      const todayTitle = autoTitleRome();
      try {
        const res = await fetch(`/api/conversations/list?limit=50`);
        const data = await res.json();
        if (res.ok && data.items) {
          // Cerca una sessione con il titolo di oggi
          const todaySession = data.items.find((item: Conv) => 
            item.title === todayTitle
          );
          if (todaySession) {
            // Se trovata, caricala automaticamente
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
    
    loadTodaySession(); // ← Questo carica la sessione di oggi se esiste
    
    try {
      window.speechSynthesis?.getVoices?.();
    } catch {}
    return () => {
      // ... (il resto rimane uguale)
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
    try {
      localStorage.setItem(`autoTTS:${id}`, speakerEnabled ? "1" : "0");
    } catch {}
  }, [speakerEnabled, currentConv?.id]);

  useEffect(() => {
    // Evita iOS (apre la tastiera da solo) ed evita durante la trascrizione
    const isIOS = typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);
    if (isIOS || isTranscribing) return;
  
    const id = setTimeout(() => {
      focusComposer(); // focus solo quando cambia/si crea la conversazione
    }, 80); // piccolo delay per dare tempo al DOM
  
    return () => clearTimeout(id);
  }, [currentConv?.id, isTranscribing]);

  // ---- Creazione esplicita (facoltativa) ----
  async function createConversation() {
    const title = newTitle.trim();
    if (!title) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/conversations/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // ---- Creazione implicita (automatica) al primo invio ----
  async function ensureConversation(): Promise<Conv> {
    if (currentConv?.id) return currentConv;
    
    // Prima cerca se esiste già una sessione con la data odierna
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
    
    // Se non esiste, crea una nuova
    const res = await fetch("/api/conversations/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  async function send() {
    setServerError(null);
    const content = input.trim();
    if (!content) return;

    // assicura una conversazione (se manca, la crea con titolo auto "mar 28/08/25" Europe/Rome)
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

    // se stava parlando, ferma
    try {
      window.speechSynthesis?.cancel?.();
    } catch {}
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

  function handleSelectConv(c: { id: string; title: string }) {
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

  // Ascolta una singola frase e restituisce il testo trascritto.
  // Usa SR nativo se disponibile; altrimenti registra ~4s e trascrive via /api/voice/transcribe.
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
        } catch {
          resolve("");
        }
      });
    }
  
    // Fallback: MediaRecorder ~4s + /api/voice/transcribe
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
          } catch {
            resolve("");
          } finally {
            try { stream.getTracks().forEach(t => t.stop()); } catch {}
          }
        };
  
        mr.start();
        // stop automatico dopo ~4 secondi
        setTimeout(() => { try { if (mr.state !== "inactive") mr.stop(); } catch {} }, 4000);
      } catch {
        resolve("");
      }
    });
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
        try {
          sr.stop?.();
        } catch {}
      };

      sr.onerror = (e: any) => {
        const code = e?.error || "errore";
        if (!handedOffToFallback && (code === "not-allowed" || code === "service-not-allowed")) {
          handedOffToFallback = true;
          setIsRecording(false);
          try {
            sr.stop?.();
          } catch {}
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
      mr.ondataavailable = (ev) => {
        if (ev.data?.size) chunksRef.current.push(ev.data);
      };
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
          try {
            stream.getTracks().forEach((t) => t.stop());
          } catch {}
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
      try {
        srRef.current.stop?.();
      } catch {}
      srRef.current = null;
      return;
    }
    if (mrRef.current && mrRef.current.state !== "inactive") {
      try {
        mrRef.current.stop();
      } catch {}
      return;
    }
    try {
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch {}
  }

  function handleVoicePressStart() {
    if (isTranscribing || isRecording) return;
    // Nessun blocco: possiamo registrare anche senza conversazione; verrà creata al send
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

  async function startDialog() {
    if (voiceMode) return;
    setVoiceMode(true);
    dialogActiveRef.current = true;
    dialogDraftRef.current = "";
    try { window.speechSynthesis?.cancel?.(); } catch {}

    
    // breve prompt vocale iniziale - USA UN MESSAGGIO FISSO
    const welcomeMessage = "Dimmi pure.";
    setLastAssistantText(welcomeMessage); // ← IMPOSTA il testo da leggere

      // Aspetta un attimo che le voci siano pronte
    await new Promise(resolve => setTimeout(resolve, 100));
    
    speakAssistant(welcomeMessage); // ← LEGGI il messaggio corretto
    dialogLoop(); // non await: parte in background finché voiceMode è ON
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

      // comandi rapidi
      if (isCmdStop(heard))   { speakAssistant("Dialogo disattivato."); stopDialog(); break; }
      if (isCmdAnnulla(heard)){ dialogDraftRef.current = ""; speakAssistant("Annullato. Dimmi pure."); continue; }
      if (isCmdRipeti(heard)) { speakAssistant(); continue; }
      if (isCmdNuova(heard))  {
        // crea e passa a nuova sessione (titolo auto)
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

 // testo normale
    let text = heard;
    let shouldSend = false;
    if (hasSubmitCue(text)) {
      text = stripSubmitCue(text);
      shouldSend = true;
    }
    if (text) {
      dialogDraftRef.current = (dialogDraftRef.current + " " + text).trim();
    }

    if (shouldSend) {
      const toSend = dialogDraftRef.current.trim();
      dialogDraftRef.current = "";
      if (toSend) {
        // INVIO DIRETTO senza mostrare il messaggio di dialogo
        await sendDirectly(toSend);
        // NON chiamare speakAssistant() qui - viene già chiamato in sendDirectly()
      } else {
        speakAssistant("Dimmi cosa vuoi che faccia");
      }
    }
  }
}

 // AGGIUNGI QUESTA NUOVA FUNZIONE per l'invio diretto
async function sendDirectly(content: string) {
  setServerError(null);
  
  // assicura una conversazione
  let conv: Conv;
  try {
    conv = await ensureConversation();
  } catch (e: any) {
    speakAssistant("Impossibile creare la conversazione");
    return;
  }
  const convId = conv.id;

  // Aggiungi il messaggio utente alle bolle
  setBubbles((b) => [...b, { role: "user", content }]);
  setLastInputWasVoice(true); // ← AGGIUNTO: indica che l'input è vocale

  // ferma TTS se sta parlando
  try {
    window.speechSynthesis?.cancel?.();
  } catch {}
  setTtsSpeaking(false);

  // invia direttamente al server
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

  // AUTO-TTS: solo se altoparlante ON
  if (speakerEnabled) {
    // Pulisci il testo per la voce (rimuovi punteggiatura strana)
    const cleanText = replyText
      .replace(/\(.*?\)/g, "") // rimuovi parentesi
      .replace(/\[.*?\]/g, "") // rimuovi quadre
      .replace(/\*/g, "") // rimuovi asterischi
      .replace(/_/g, "") // rimuovi underscore
      .replace(/\.{2,}/g, ".") // sostituisci punti multipli con uno solo
      .trim();
    
    speakAssistant(cleanText);
  }

  await refreshUsage(convId);
}
  // ---------- TTS (Voce IA) ----------
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
    try {
      window.speechSynthesis.cancel();
    } catch {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "it-IT";
    u.rate = 1;
    u.onend = () => setTtsSpeaking(false);
    u.onerror = () => setTtsSpeaking(false);
    utterRef.current = u;
    setTtsSpeaking(true);

        // --- AGGIUNGI QUESTE RIGHE ---
    // Forza la voce italiana se disponibile
    const voices = window.speechSynthesis.getVoices();
    const italianVoice = voices.find(voice => 
      voice.lang.includes('it-IT') || voice.lang.includes('it_IT')
    );
    if (italianVoice) {
      u.voice = italianVoice;
    }
    // --- FINE AGGIUNTA ---
    
    window.speechSynthesis.speak(u);
  }
  
  function stopSpeak() {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    setTtsSpeaking(false);
  }

  const handleAnyHomeInteraction = useCallback(() => {
    if (leftOpen) closeLeft();
    if (topOpen) closeTop();
  }, [leftOpen, topOpen, closeLeft, closeTop]);

  // ---------- RENDER ----------
  return (
    <>
      <div className="topbar"
             onMouseDown={handleAnyHomeInteraction}
             onTouchStart={handleAnyHomeInteraction}
            >
        <button className="iconbtn" aria-label="Apri conversazioni" onClick={openLeft}>
          ☰
        </button>
        <div className="title" style={{ flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>
          {currentConv ? currentConv.title : "Venditori Micidiali"}
        </div>
        <div className="spacer" />
        <button className="iconbtn" aria-label="Apri impostazioni" onClick={openTop}>
          ⚙️
        </button>


        
        <button className="iconbtn" onClick={logout}>
          Esci
        </button>
      </div>

      {/* WRAPPER NEW */}
      <div
        onMouseDown={handleAnyHomeInteraction}
        onTouchStart={handleAnyHomeInteraction}
        style={{ minHeight: "100vh" }}
      >
        <div className="container"
               onMouseDown={handleAnyHomeInteraction}
               onTouchStart={handleAnyHomeInteraction}
              >
          <div className="thread">
          {/* --- BLOCCO NOMINA MANUALE DISABILITATO ---
            {!currentConv && (
              <div className="helper">
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Puoi nominare la sessione (facoltativo)</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Titolo personalizzato…"
                    disabled={isCreating}
                    style={{ flex: 1, padding: "10px 12px" }}
                  />
                  <button className="btn" onClick={createConversation} disabled={isCreating || !newTitle.trim()}>
                    Crea
                  </button>
                </div>
                <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
                  In alternativa, scrivi subito: la chat verrà creata con titolo automatico (es. “{autoTitleRome()}”).
                </div>
              </div>
            )}
            --- FINE BLOCCO NOMINA --- */}
            
            {bubbles.length === 0 && currentConv && (
              <div className="helper">Nessun messaggio ancora. Scrivi qui sotto per iniziare.</div>
            )}
            {bubbles.map((m, i) => (
              <div key={i} className={`msg ${m.role === "user" ? "me" : ""}`}>
                {m.content}
              </div>
            ))}
            {serverError && <div className="helper" style={{ color: "#F59E0B" }}>Errore LLM: {serverError}</div>}
          </div>
        </div>

        <div className="composer"
               onMouseDown={handleAnyHomeInteraction}
               onTouchStart={handleAnyHomeInteraction}
                >
          <div className="inputwrap">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setLastInputWasVoice(false);
                autoResize();
              }}
              placeholder={"Scrivi un messaggio… o usa la voce 🎙️"}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={isTranscribing}
            />
          </div>
          <div className="actions">
            <div className="left">
              {/* 🎙️ Voce: press&hold su mobile, click = toggle su desktop */}
              <button
                className="iconbtn"
                disabled={isTranscribing}
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

                      {/* ⬇️ NUOVO: toggle modalità vocale */}
              <button
                className="iconbtn"
                aria-pressed={voiceMode}
                onClick={() => (voiceMode ? stopDialog() : startDialog())}
                title="Modalità vocale hands-free"
              >
                {voiceMode ? "🛑 Dialogo ON" : "🗣️ Dialogo"}
              </button>
              
              {/* 🔊 Toggle Altoparlante (auto-TTS se ultimo input = vocale) */}
              <button
                className="iconbtn"
                onClick={() => setSpeakerEnabled((s) => !s)}
                aria-pressed={speakerEnabled}
                title="Riproduci risposte in audio se l'input era vocale"
              >
                {speakerEnabled ? "🔊 ON" : "🔈 OFF"}
              </button>
              
              {/* ⬇️ NUOVO: pulsante per riascoltare ultima risposta */}
              {lastAssistantText && (
                <button
                  className="iconbtn"
                  onClick={() => speakAssistant()}
                  disabled={ttsSpeaking}
                  title="Riascolta ultima risposta"
                >
                  {ttsSpeaking ? "🔊 Parlando…" : "🔊 Ripeti"}
                </button>
              )}
            </div>
            <div className="right">
              <button className="btn" onClick={send} disabled={!input.trim()}>
                Invia
              </button>
            </div>
          </div>
          {(voiceError || isTranscribing) && (
            <div className="voice-status">
              {isTranscribing ? "🎙️ Trascrizione in corso…" : voiceError}
            </div>
          )}
        </div>
      </div>

      <LeftDrawer open={leftOpen} onClose={closeLeft} onSelect={handleSelectConv} />
      <RightDrawer
        open={topOpen}
        onClose={closeTop}
      />
    </>
  );
}
