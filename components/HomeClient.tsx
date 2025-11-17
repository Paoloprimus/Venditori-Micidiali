// components/HomeClient.tsx
"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useDrawers, LeftDrawer, RightDrawer } from "./Drawers";
import { supabase } from "../lib/supabase/client";

import TopBar from "./home/TopBar";
import Thread from "./home/Thread";
import Composer from "./home/Composer";

import { runChatTurn_v2 as runPlanner } from "../app/chat/planner";
import { useConversation } from "../app/context/ConversationContext";

import { useConversations, type Bubble, decryptClientPlaceholders } from "../hooks/useConversations";
import { useCrypto } from "@/lib/crypto/CryptoProvider";
import { useTTS } from "../hooks/useTTS";
import { useVoice } from "../hooks/useVoice";
import { useAutoResize } from "../hooks/useAutoResize";

import { matchIntent } from "@/lib/voice/intents";
import type { Intent } from "@/lib/voice/intents";
import { handleIntent } from "@/lib/voice/dispatch";

const YES = /\b(s[ìi]|esatto|ok|procedi|vai|confermo|invia)\b/i;
const NO  = /\b(no|annulla|stop|ferma|negativo|non ancora)\b/i;

/** Patch minima: se la risposta sul prezzo contiene 0 o 0% sostituisco con fallback chiari. */
function patchPriceReply(text: string): string {
  if (!text) return text;

  let t = text;

  t = t.replace(
    /(Il prezzo base di «[^»]+» è )0([.,\s]|$)/i,
    "$1non disponibile a catalogo$2"
  );

  t = t.replace(
    /(Sconto(?:\sapplicato)?:\s*)0\s*%/i,
    "$1nessuno"
  );

  t = t.replace(
    /(Attualmente lo sconto applicato è\s*)0\s*%/i,
    "$1nessuno"
  );

  return t;
}

/** --- Utility minimal per il flusso standard --- */
const STOPWORDS = new Set([
  "il","lo","la","i","gli","le","un","una","uno","di","a","da","in","con","su","per","tra","fra",
  "quanti","quanto","quante","quanta","ci","sono","è","e","che","nel","nello","nella","al","allo",
  "alla","agli","alle","catalogo","deposito","magazzino","costa","prezzo","quanto","quanto?","?","."
]);

function unaccentLower(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function extractProductTerm(normalized: string) {
  const tokens = normalized.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const candidates = tokens.filter(t => !STOPWORDS.has(t));
  if (!candidates.length) return normalized.trim();
  return candidates.sort((a,b)=>b.length-a.length)[0];
}
async function postJSON(url: string, body: any) {
  const r = await fetch(url, {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify(body)
  });
  return r.json();
}
function fillTemplateSimple(tpl: string, data: Record<string, any>) {
  return tpl.replace(/\{(\w+)\}/g, (_m, k) => {
    const v = data?.[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Template locali (Occam) per evitare fetch al DB lato client */
const LOCAL_TEMPLATES: Record<string, { response: string }> = {
  prod_conteggio_catalogo: {
    response: "A catalogo ho trovato {count} referenze di «{prodotto}».",
  },
  prod_giacenza_magazzino: {
    response: "In deposito ci sono {stock} pezzi di «{prodotto}».",
  },
  prod_prezzo_sconti: {
    response: "Il prezzo base di «{prodotto}» è {price}. Sconto applicato: {discount}.",
  },
};

export default function HomeClient({ email, userName }: { email: string; userName: string }) {
  const convCtx = useConversation();
  // ✅ MODIFICA 1: Hook aggiornato
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  // ---- TTS
  const { ttsSpeaking, lastAssistantText, setLastAssistantText, speakAssistant } = useTTS();
  const ttsSpeakingRef = useRef(false);
  useEffect(() => { ttsSpeakingRef.current = ttsSpeaking; }, [ttsSpeaking]);
  const isTtsSpeakingFn = useCallback(() => ttsSpeakingRef.current, []);

  // ---- Conversazioni
  const conv = useConversations({
    onAssistantReply: (text) => { setLastAssistantText(text); },
  });
  
  // ---- Crypto ready status
  const { ready: cryptoReady } = useCrypto();

// TRIPWIRE #1: intercetta qualsiasi invio al modello generico
if (!(window as any).__TRACE_WRAP_SEND) {
  (window as any).__TRACE_WRAP_SEND = true;
  const origSend = conv.send as unknown as (text: string) => Promise<any>;
  conv.send = (async (text: string) => {
    console.error("[TRACE] conv.send HIT from HomeClient", { text });
    return await origSend(text);
  }) as any;
}

  
  useEffect(() => { conv.ensureConversation(); }, []); // eslint-disable-line

  // ---- Stato conferma intent (legacy voce)
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);
  const [originalVoiceCommand, setOriginalVoiceCommand] = useState<string>("");

  function speakIfEnabled(msg: string) {
    if (voice.speakerEnabled) {
      speakAssistant(msg);
    }
  }

function askConfirm(i: Intent) {
  setPendingIntent(i);
  let confirmMessage = "";
  
  switch (i.type) {
    case "CLIENT_CREATE":
      confirmMessage = `Confermi: creo il cliente ${i.name ?? "senza nome"}?`;
      break;
    case "CLIENT_SEARCH":
      confirmMessage = `Confermi: cerco il cliente ${i.query}?`;
      break;
    case "CLIENT_UPDATE":
      confirmMessage = `Confermi: modifico il cliente ${i.name}?`;
      break;
    case "NOTES_SEARCH":
      confirmMessage = `Vuoi che cerchi nelle note di ${i.accountHint} se c'è qualcosa su ${i.topic}?`;
      break;
    default:
      confirmMessage = "Confermi l'azione?";
  }
  
  // Scrivi nella chat
  appendAssistantLocal(confirmMessage);
  
  // E anche parla (se TTS attivo)
  speakIfEnabled(confirmMessage);
}


  // ---- Voce (SR nativa)
  const voice = useVoice({
    onTranscriptionToInput: (text) => { conv.setInput(text); },
    onSendDirectly: async (text) => {
      const raw = (text || "").trim();
      if (!raw) return;

      if (pendingIntent) {
        if (YES.test(raw)) { await handleIntent(pendingIntent); setPendingIntent(null); return; }
        if (NO.test(raw))  { speakIfEnabled("Ok, annullato."); setPendingIntent(null); return; }
      } else {
        const intent = matchIntent(raw);
        if (intent.type !== "NONE") { askConfirm(intent); return; }
      }

      await conv.send(raw);
    },
    onSpeak: (text) => speakAssistant(text),
    createNewSession: async (titleAuto) => {
      try { await conv.createConversation(titleAuto); return conv.currentConv; }
      catch { return null; }
    },
    autoTitleRome: conv.autoTitleRome,
    preferServerSTT: false,
    isTtsSpeaking: isTtsSpeakingFn,
  });

  useAutoResize(conv.taRef, conv.input);

  useEffect(() => {
    if (!lastAssistantText) return;
    if (voice.speakerEnabled) speakAssistant(lastAssistantText);
  }, [lastAssistantText, voice.speakerEnabled, speakAssistant]);

  // ✅ MODIFICA 3: handleAnyHomeInteraction aggiornato
  const handleAnyHomeInteraction = useCallback(() => {
    if (leftOpen) closeLeft();
    if (rightOpen) closeRight();
  }, [leftOpen, rightOpen, closeLeft, closeRight]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // PATCH per HomeClient.tsx
// Sostituire righe 207-234 con questo codice:

// ✅ Step 1: Patch prezzi
const patchedBubbles = useMemo(() => {
  return (conv.bubbles || []).map((b: any) => {
    if (b?.role !== "assistant" || !b?.content) return b;
    return { ...b, content: patchPriceReply(String(b.content)) };
  });
}, [conv.bubbles]);

// ✅ Step 2: Decripta placeholder [CLIENT:uuid] (asincrono)
const [decryptedBubbles, setDecryptedBubbles] = useState<Bubble[]>([]);

useEffect(() => {
  // ✅ Se crypto non è pronto, mostra i messaggi CON i placeholder (non nasconderli)
  if (!cryptoReady) {
    console.log('[HomeClient] ⏳ Crypto non ancora pronto, mostro placeholder grezzi');
    // ✅ Mostra bubbles senza decriptazione (con placeholder)
    setDecryptedBubbles(patchedBubbles);
    return;
  }
  
  console.log('🔍 [DEBUG] Processing placeholders, bubbles count:', patchedBubbles.length);

  async function processPlaceholders() {
    // ✅ Usa la funzione importata da useConversations (con wait per unlock)
    
    // Processa tutti i bubble assistant
    const processed = await Promise.all(
      patchedBubbles.map(async (b: any) => {
        if (b?.role === 'assistant' && b?.content) {
          const decrypted = await decryptClientPlaceholders(b.content);
          return { ...b, content: decrypted };
        }
        return b;
      })
    );
    
    setDecryptedBubbles(processed);
  }
  
  processPlaceholders();
}, [patchedBubbles, cryptoReady]);

// --- Stato per bolle locali (domanda e risposta) ---
const [localUser, setLocalUser] = useState<string[]>([]);
const [localAssistant, setLocalAssistant] = useState<string[]>([]);

// 🆕 Memorizzo ultimo prodotto valido per "e quanti in …"
const [lastProduct, setLastProduct] = useState<string | null>(null);

function appendUserLocal(text: string) {
  setLocalUser(prev => [...prev, text]);
}
function appendAssistantLocal(text: string) {
  setLocalAssistant(prev => [...prev, patchPriceReply(text)]);
}

// ✅ Unione bolle: usa decryptedBubbles invece di patchedBubbles
const mergedBubbles = useMemo((): Bubble[] => {
  const localsUser = localUser.map((t): Bubble => ({ role: "user", content: t }));
  const localsAssistant = localAssistant.map((t): Bubble => ({ role: "assistant", content: t }));
  return [...decryptedBubbles, ...localsUser, ...localsAssistant];
}, [decryptedBubbles, localUser, localAssistant]);

// invio da Composer (uso testuale) — NIENTE popup; domanda e risposta come in una chat normale
async function submitFromComposer() {
  console.error("[HC] submitFromComposer HIT", conv.input);

  if (voice.isRecording) { await voice.stopMic(); }
  const txt = conv.input.trim();
  if (!txt) return;

  conv.setInput(""); // ✅ FIX 2: Svuota input SUBITO

  // (Legacy) sì/no barra — lasciata per compatibilità ma senza UI extra
if (pendingIntent) {
    if (YES.test(txt)) {
      const convId = conv.currentConv?.id;
      
      // Costruisci messaggio conferma
      let confirmMessage = "";
      
      switch (pendingIntent.type) {
        case "CLIENT_SEARCH":
          confirmMessage = `Confermi: cerco il cliente ${pendingIntent.query}?`;
          break;
        case "CLIENT_CREATE":
          confirmMessage = `Confermi: creo il cliente ${pendingIntent.name ?? "senza nome"}?`;
          break;
        case "CLIENT_UPDATE":
          confirmMessage = `Confermi: modifico il cliente ${pendingIntent.name}?`;
          break;
        case "NOTES_SEARCH":
          confirmMessage = `Vuoi che cerchi nelle note di ${pendingIntent.accountHint} se c'è qualcosa su ${pendingIntent.topic}?`;
          break;
        default:
          confirmMessage = "Confermi l'azione?";
      }
      
      // Salva nel DB: usa il comando originale dell'utente
      if (convId && originalVoiceCommand) {
        await fetch("/api/messages/append", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ 
            conversationId: convId, 
            userText: originalVoiceCommand, 
            assistantText: confirmMessage 
          }),
        });
        
        // ✅ Prima esegui l'azione e ottieni il risultato
        const result = await handleIntent(pendingIntent);
        const resultMessage = result.message || "✅ Fatto.";
        
        // Salva nel DB: risposta "sì" + risultato VERO
        await fetch("/api/messages/append", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ 
            conversationId: convId, 
            userText: txt, 
            assistantText: resultMessage 
          }),
        });
        
        // Ricarica messaggi dal DB
        const r = await fetch(`/api/messages/by-conversation?conversationId=${convId}&limit=200`, { cache: "no-store" });
        const j = await r.json();
        conv.setBubbles?.((j.items ?? []).map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
        setLocalUser([]);
        setLocalAssistant([]);
      }
      setPendingIntent(null);
      setOriginalVoiceCommand(""); // Reset
      return;
    }
    
    if (NO.test(txt)) {
      const convId = conv.currentConv?.id;
      
      // Costruisci messaggio conferma
      let confirmMessage = "";
      
      switch (pendingIntent.type) {
        case "CLIENT_SEARCH":
          confirmMessage = `Confermi: cerco il cliente ${pendingIntent.query}?`;
          break;
        case "CLIENT_CREATE":
          confirmMessage = `Confermi: creo il cliente ${pendingIntent.name ?? "senza nome"}?`;
          break;
        case "CLIENT_UPDATE":
          confirmMessage = `Confermi: modifico il cliente ${pendingIntent.name}?`;
          break;
        case "NOTES_SEARCH":
          confirmMessage = `Vuoi che cerchi nelle note di ${pendingIntent.accountHint} se c'è qualcosa su ${pendingIntent.topic}?`;
          break;
        default:
          confirmMessage = "Confermi l'azione?";
      }
      
      // Salva nel DB: usa il comando originale dell'utente
      if (convId && originalVoiceCommand) {
        await fetch("/api/messages/append", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ 
            conversationId: convId, 
            userText: originalVoiceCommand, 
            assistantText: confirmMessage 
          }),
        });
        
        await fetch("/api/messages/append", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ 
            conversationId: convId, 
            userText: txt, 
            assistantText: "Ok, annullato." 
          }),
        });
        
        // Ricarica messaggi dal DB
        const r = await fetch(`/api/messages/by-conversation?conversationId=${convId}&limit=200`, { cache: "no-store" });
        const j = await r.json();
        conv.setBubbles?.((j.items ?? []).map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
        setLocalUser([]);
        setLocalAssistant([]);
      }
      
      speakIfEnabled("Ok, annullato.");
      setPendingIntent(null);
      setOriginalVoiceCommand(""); // Reset
      return;
    }
  }


  // ========== ✅ FIX VOICE INTENTS: PRIORITÀ MASSIMA ==========
  const voiceIntent = matchIntent(txt);
  if (voiceIntent.type !== "NONE") {
    console.error("[voice-intent] Riconosciuto:", voiceIntent.type);
    setOriginalVoiceCommand(txt); // Salva comando originale
    askConfirm(voiceIntent);
    return;
  }

  // ========== ⚠️ SISTEMA STANDARD DISABILITATO ==========
  // Tutte le query vanno DIRETTAMENTE al sistema semantico per intelligenza massima
  // Il blocco standard (normalize → shortlist → execute) è stato disabilitato
  // perché intercettava le query prima del sistema semantico AI-powered
  /*
  // --- Flusso standard (senza popup, con bolla domanda+risposta locali) ---
  try {
    // 1) normalizza
    const norm = await postJSON(`/api/standard/normalize`, { text: txt });
    const normalized: string = norm?.normalized || txt;

    // 2) shortlist topK
    const sl = await postJSON(`/api/standard/shortlist`, { q: normalized, topK: 5 });
    const items: Array<{ intent_key: string; text: string; score: number }> = sl?.items || [];

    // 3) top-1 → se esiste, esegui direttamente
    const top = items[0];
    if (top && top.intent_key) {
      const intentKey = top.intent_key;

      // 4) estrai {prodotto} con fallback all'ultimo valido per "e quanti …"
      let prodotto = extractProductTerm(unaccentLower(normalized));
      if (!prodotto || /\s/.test(prodotto)) {
        if (lastProduct) prodotto = lastProduct;
      }

      // 👉 4.1: scrivi SUBITO la domanda in chat (come tutte le altre)
      appendUserLocal(txt);

      // 5) execute
      const execJson = await postJSON(`/api/standard/execute`, {
        intent_key: intentKey,
        slots: { prodotto }
      });

      // Se non gestito → prosegui (non inviare nulla qui; passeremo al planner sotto)
      if (!execJson?.ok) {
        console.error("[standard→planner] exec non gestito, passo al planner");
      } else {
        // 6) compila template risposta (con fallback prezzo/sconto se 0)
        const dataForTemplate: Record<string, any> = { prodotto, ...(execJson.data || {}) };
        if (intentKey === "prod_prezzo_sconti") {
          const price = Number(execJson?.data?.price) || 0;
          const discount = Number(execJson?.data?.discount) || 0;
          dataForTemplate.price = price > 0 ? price : "non disponibile a catalogo";
          dataForTemplate.discount = discount > 0 ? `${discount}%` : "nessuno";
        }

        const responseTpl = LOCAL_TEMPLATES[intentKey]?.response;
        
        // ✅ FIX: Se non c'è template, passa al planner invece di rispondere "Fatto."
        if (!responseTpl) {
          console.error("[standard→planner] no template for intent", intentKey, "→ passo al planner");
          // Non fare return, prosegui al planner
        } else {
          const answer = fillTemplateSimple(responseTpl, dataForTemplate);

          // 7) scrivi la risposta (assistente)
          appendAssistantLocal(answer);

          // 8) memorizza ultimo prodotto valido
          if (prodotto && !/\s/.test(prodotto)) setLastProduct(prodotto);

          // TTS (se altoparlante attivo)
          speakIfEnabled(answer);

          // 9) persisti in DB
          const convId = conv.currentConv?.id;
          if (convId) {
            await fetch("/api/messages/append", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ conversationId: convId, userText: txt, assistantText: answer }),
            });
            const r = await fetch(`/api/messages/by-conversation?conversationId=${convId}&limit=200`, { cache: "no-store" });
            const j = await r.json();
            conv.setBubbles?.((j.items ?? []).map((r: any) => ({ id: r.id, role: r.role, content: r.content })));
            setLocalUser([]);
            setLocalAssistant([]);
          }

          return; // ⬅️ STOP: abbiamo risposto con lo standard flow
        }
      }
    }
  } catch (e) {
    console.error("[standard → planner fallback]", e);
  }
  */
  // ========== FINE BLOCCO STANDARD DISABILITATO ==========

  // ========== ⚠️ ANCHE IL PLANNER LOCALE DISABILITATO ==========
  // Vai DIRETTAMENTE al sistema semantico via conv.send() → /api/messages/send
  /*
  // Se lo standard non ha dato esito, proviamo il planner
  try {
    // ⚠️ FIX: Controllo sicuro che convCtx e state esistano
    if (!convCtx || !convCtx.state) {
      console.error("[planner fallback] convCtx o state non disponibili, uso modello generico");
      await conv.send(txt);
      return;
    }
    
    const res = await runPlanner(
      txt,
      {
        scope: convCtx.state.scope === "prodotti" ? "products" :
            convCtx.state.scope === "ordini"   ? "orders"   :
            convCtx.state.scope === "vendite"  ? "sales"    :
            convCtx.state.scope,
        topic_attivo:
          convCtx.state.topic_attivo === "prodotti" ? "products" :
          convCtx.state.topic_attivo === "ordini"   ? "orders"   :
          convCtx.state.topic_attivo === "vendite"  ? "sales"    :
          convCtx.state.topic_attivo,
      } as any,
      {
        state: {
          scope: convCtx.state.scope === "prodotti" ? "products" :
            convCtx.state.scope === "ordini"   ? "orders"   :
            convCtx.state.scope === "vendite"  ? "sales"    :
            convCtx.state.scope,
          topic_attivo:
            convCtx.state.topic_attivo === "prodotti" ? "products" :
            convCtx.state.topic_attivo === "ordini"   ? "orders"   :
            convCtx.state.topic_attivo === "vendite"  ? "sales"    :
            convCtx.state.topic_attivo,
        } as any,
        expired: convCtx.expired,
        setScope: (s:any)=>convCtx.setScope(s==="products"?"prodotti":s==="orders"?"ordini":s==="sales"?"vendite":s),
        remember: convCtx.remember,
        reset: convCtx.reset,
      } as any
    );

    if (res?.text) {
      appendUserLocal(txt);
      appendAssistantLocal(`[planner] ${res.text}`);
      console.error("[planner_v2:text_hit]", res);

      const convId = conv.currentConv?.id;
      if (convId) {
        await fetch("/api/messages/append", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId: convId, userText: txt, assistantText: res.text }),
        });
        const r = await fetch(`/api/messages/by-conversation?conversationId=${convId}&limit=200`, { cache: "no-store" });
        const j = await r.json();
        conv.setBubbles?.((j.items ?? []).map((r: any) => ({ id: r.id, role: r.role, content: r.content })));
        setLocalUser([]);
        setLocalAssistant([]);
      }

      return;
    }
  } catch (e) {
    console.error("[planner text fallback → model]", e);
  }
  */
  // ========== FINE BLOCCO PLANNER DISABILITATO ==========

  // ✅ Vai DIRETTAMENTE al sistema semantico via API
  console.error("[semantic-direct] Invio query direttamente al sistema semantico");
  await conv.send(txt);
  return;
}


  return (
    <>
      {/* TopBar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "var(--bg)", borderBottom: "1px solid var(--ring)" }}>
        <TopBar
          title={conv.currentConv?.title ?? ""}
          userName={userName}
          onOpenLeft={openLeft}
          onOpenDati={openDati}
          onOpenDocs={openDocs}
          onOpenImpostazioni={openImpostazioni}
          onLogout={logout}
        />
      </div>

      {/* Contenuto */}
      <div onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction} style={{ minHeight: "100vh" }}>
        <div className="container" onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction}>

            {/* 👇 SPACER per TopBar */}
            <div style={{ height: 70 }} />
          
          <Thread
            bubbles={mergedBubbles}
            serverError={conv.serverError}
            threadRef={conv.threadRef}
            endRef={conv.endRef}
            onOpenDrawer={openDocs}
          />
          <Composer
            value={conv.input}
            onChange={(v) => { conv.setInput(v); voice.setLastInputWasVoice?.(false); }}
            onSend={submitFromComposer}
            disabled={voice.isTranscribing}
            taRef={conv.taRef}
            voice={{
              isRecording: voice.isRecording,
              isTranscribing: voice.isTranscribing,
              error: voice.voiceError,
              onClick: voice.handleVoiceClick,
              voiceMode: voice.voiceMode,
              onToggleDialog: () => (voice.voiceMode ? voice.stopDialog() : voice.startDialog()),
              speakerEnabled: voice.speakerEnabled,
              onToggleSpeaker: () => voice.setSpeakerEnabled((s: boolean) => !s),
              canRepeat: !!lastAssistantText,
              onRepeat: () => speakAssistant(),
              ttsSpeaking,
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          onClick={submitFromComposer}
          style={{ padding: "8px 12px", border: "1px solid var(--ring)", borderRadius: 8 }}
        >
          Invia (planner)
        </button>
      </div>

      {/* ✅ MODIFICA 4: Drawer aggiornato */}
      <div style={{ position: "relative", zIndex: 2001 }}>
        <LeftDrawer open={leftOpen} onClose={closeLeft} onSelect={conv.handleSelectConv} />
        <RightDrawer open={rightOpen} content={rightContent} onClose={closeRight} />
      </div>
    </>
  );
}
