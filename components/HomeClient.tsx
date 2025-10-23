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

import { useConversations } from "../hooks/useConversations";
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
  t = t.replace(/(Il prezzo base di «[^»]+» è )0([.,\s]|$)/i, "$1non disponibile a catalogo$2");
  t = t.replace(/(Sconto(?:\sapplicato)?:\s*)0\s*%/i, "$1nessuno");
  t = t.replace(/(Attualmente lo sconto applicato è\s*)0\s*%/i, "$1nessuno");
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
  const { leftOpen, topOpen, openLeft, closeLeft, openTop, closeTop } = useDrawers();

  // ---- TTS
  const { ttsSpeaking, lastAssistantText, setLastAssistantText, speakAssistant } = useTTS();
  const ttsSpeakingRef = useRef(false);
  useEffect(() => { ttsSpeakingRef.current = ttsSpeaking; }, [ttsSpeaking]);
  const isTtsSpeakingFn = useCallback(() => ttsSpeakingRef.current, []);

  // ---- Conversazioni
  const conv = useConversations({
    onAssistantReply: (text) => { setLastAssistantText(text); },
  });

  useEffect(() => { conv.ensureConversation(); }, []); // eslint-disable-line

  // ---- Stato conferma intent (legacy voce)
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);

  function speakIfEnabled(msg: string) {
    if (voice.speakerEnabled) speakAssistant(msg);
  }

  function askConfirm(i: Intent) {
    setPendingIntent(i);
    switch (i.type) {
      case "CLIENT_CREATE":
        speakIfEnabled(`Confermi: creo il cliente ${i.name ?? "senza nome"}?`);
        break;
      case "CLIENT_SEARCH":
        speakIfEnabled(`Confermi: cerco il cliente ${i.query}?`);
        break;
      case "CLIENT_UPDATE":
        speakIfEnabled(`Confermi: modifico il cliente ${i.name}?`);
        break;
      case "NOTES_SEARCH":
        speakIfEnabled(`Vuoi che cerchi nelle note di ${i.accountHint} se c'è qualcosa su ${i.topic}?`);
        break;
      default:
        speakIfEnabled("Confermi l'azione?");
    }
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

      // Per input vocale, usiamo submitFromComposer
      conv.setInput(raw);
      await submitFromComposer();
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

  const handleAnyHomeInteraction = useCallback(() => {
    if (leftOpen) closeLeft();
    if (topOpen) closeTop();
  }, [leftOpen, topOpen, closeLeft, closeTop]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Patch bolle remote
  const patchedBubbles = useMemo(() => {
    return (conv.bubbles || []).map((b: any) => {
      if (b?.role !== "assistant" || !b?.content) return b;
      return { ...b, content: patchPriceReply(String(b.content)) };
    });
  }, [conv.bubbles]);

  // --- Stato per bolle locali ---
  const [localUser, setLocalUser] = useState<string[]>([]);
  const [localAssistant, setLocalAssistant] = useState<string[]>([]);
  const [lastProduct, setLastProduct] = useState<string | null>(null);

  function appendUserLocal(text: string) {
    setLocalUser(prev => [...prev, text]);
  }
  
  function appendAssistantLocal(text: string) {
    setLocalAssistant(prev => [...prev, patchPriceReply(text)]);
  }

  // Unione bolle
  const mergedBubbles = useMemo(() => {
    const localsUser = localUser.map((t) => ({ role: "user", content: t }));
    const localsAssistant = localAssistant.map((t) => ({ role: "assistant", content: t }));
    return [...patchedBubbles, ...localsUser, ...localsAssistant];
  }, [patchedBubbles, localUser, localAssistant]);

  /**
   * ========================================================================
   * 🎯 FLUSSO UNIFICATO: submitFromComposer()
   * Ordine di esecuzione:
   * 1. Standard intents (prodotti)
   * 2. Planner (clienti, email, ecc.)
   * 3. Modello generico (fallback)
   * ========================================================================
   */
  async function submitFromComposer() {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("[submitFromComposer] INIZIO FLUSSO");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (voice.isRecording) await voice.stopMic();
    
    const txt = conv.input.trim();
    if (!txt) {
      console.error("[submitFromComposer] STOP: input vuoto");
      return;
    }

    console.error("[submitFromComposer] Input utente:", txt);

    // ========= STEP 0: Gestione conferme legacy =========
    if (pendingIntent) {
      if (YES.test(txt)) {
        await handleIntent(pendingIntent);
        setPendingIntent(null);
        conv.setInput("");
        return;
      }
      if (NO.test(txt)) {
        speakIfEnabled("Ok, annullato.");
        setPendingIntent(null);
        conv.setInput("");
        return;
      }
    }

    // ========= STEP 1: STANDARD INTENTS (prodotti) =========
    console.error("[STEP 1] Tentativo STANDARD INTENTS (prodotti)...");
    
    try {
      const normalized = unaccentLower(txt);
      const asksCount = /\b(quant[ie]|numero)\b/i.test(txt) && /\b(catalogo|referenz[ae]|prodott[io])\b/i.test(txt);
      const asksStock = /\b(quant[ie]|numero)\b/i.test(txt) && /\b(deposito|magazzino|giacenz[ae]|pezzi)\b/i.test(txt);
      const asksPrice = /\b(prezzo|costa|costo|quanto costa)\b/i.test(txt);

      // Estrazione termine prodotto
      let prodotto: string | null = null;
      if (/^e?\s*quant[ie]\s+(in\s+)?(\w+)\??$/i.test(normalized)) {
        const m = normalized.match(/^e?\s*quant[ie]\s+(?:in\s+)?(\w+)\??$/i);
        prodotto = m ? m[1] : null;
      } else {
        prodotto = extractProductTerm(normalized);
      }

      if (!prodotto && lastProduct && /^e?\s*quant[ie]\??$/i.test(normalized)) {
        prodotto = lastProduct;
      }

      if ((asksCount || asksStock || asksPrice) && prodotto) {
        console.error("[STEP 1] Match trovato! Prodotto:", prodotto);
        
        const intentKey = asksCount ? "prod_conteggio_catalogo" :
                         asksStock ? "prod_giacenza_magazzino" :
                         "prod_prezzo_sconti";

        console.error("[STEP 1] Intent:", intentKey);

        const dataForTemplate: Record<string, any> = { prodotto };

        if (asksCount) {
          const r = await postJSON("/api/products/count", { normalizedTerm: prodotto });
          dataForTemplate.count = r?.count ?? 0;
        } else if (asksStock) {
          const r = await postJSON("/api/products/stock", { normalizedTerm: prodotto });
          dataForTemplate.stock = r?.stock ?? 0;
        } else {
          const r = await postJSON("/api/products/pricing", { normalizedTerm: prodotto });
          const price = r?.base_price ?? 0;
          const discount = r?.sconto_fattura ?? 0;
          dataForTemplate.price = price > 0 ? `€ ${price.toFixed(2)}` : "non disponibile a catalogo";
          dataForTemplate.discount = discount > 0 ? `${discount}%` : "nessuno";
        }

        const responseTpl = LOCAL_TEMPLATES[intentKey]?.response || "Fatto.";
        const finalText = fillTemplateSimple(responseTpl, dataForTemplate);

        if (prodotto && !/\s/.test(prodotto)) {
          setLastProduct(prodotto);
        }

        appendUserLocal(txt);
        appendAssistantLocal(finalText);
        console.error("[STEP 1] ✅ RISPOSTA STANDARD:", finalText);

        // Persisti nel DB
        const convId = conv.currentConv?.id;
        if (convId) {
          await fetch("/api/messages/append", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ conversationId: convId, userText: txt, assistantText: finalText }),
          });

          const res = await fetch(`/api/messages/by-conversation?conversationId=${convId}&limit=200`, { cache: "no-store" });
          const j = await res.json();
          conv.setBubbles?.((j.items ?? []).map((r: any) => ({ id: r.id, role: r.role, content: r.content })));
          setLocalUser([]);
          setLocalAssistant([]);
        }

        conv.setInput("");
        console.error("[STEP 1] ✅ FINE FLUSSO - Standard intent gestito");
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        return;
      }
    } catch (e) {
      console.error("[STEP 1] ⚠️ Errore in standard intents:", e);
    }

    console.error("[STEP 1] ❌ Nessun match standard intents");

    // ========= STEP 2: PLANNER (clienti, email, ecc.) =========
    console.error("[STEP 2] Tentativo PLANNER...");
    
    try {
      const crypto = { decryptFields: async (_s:string,_t:string,_i:string,row:any)=>row };

      const res = await runPlanner(
        txt,
        {
          state: {
            ...convCtx.state,
            scope:
              convCtx.state.scope === "prodotti" ? "products" :
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
          setScope: (s:any)=>convCtx.setScope(
            s==="products"?"prodotti":
            s==="orders"?"ordini":
            s==="sales"?"vendite":s
          ),
          remember: convCtx.remember,
          reset: convCtx.reset,
        } as any,
        crypto as any
      );

      if (res?.text) {
        console.error("[STEP 2] ✅ PLANNER HA RISPOSTO:", res.text);
        
        appendUserLocal(txt);
        appendAssistantLocal(res.text);

        // Persisti nel DB
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

        conv.setInput("");
        console.error("[STEP 2] ✅ FINE FLUSSO - Planner ha gestito");
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        return;
      }
    } catch (e) {
      console.error("[STEP 2] ⚠️ Errore nel planner:", e);
    }

    console.error("[STEP 2] ❌ Planner non ha risposto");

    // ========= STEP 3: LEGACY VOICE INTENTS =========
    console.error("[STEP 3] Tentativo LEGACY VOICE INTENTS...");
    
    const intent = matchIntent(txt);
    if (intent.type !== "NONE") {
      console.error("[STEP 3] ✅ Match voice intent:", intent.type);
      askConfirm(intent);
      conv.setInput("");
      console.error("[STEP 3] ✅ FINE FLUSSO - Voice intent gestito");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    }

    console.error("[STEP 3] ❌ Nessun voice intent");

    // ========= STEP 4: MODELLO GENERICO (fallback) =========
    console.error("[STEP 4] FALLBACK → Modello generico");
    
    await conv.send(txt);
    conv.setInput("");
    
    console.error("[STEP 4] ✅ FINE FLUSSO - Modello generico chiamato");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  return (
    <>
      {/* TopBar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "var(--bg)", borderBottom: "1px solid var(--ring)" }}>
        <TopBar
          title={conv.currentConv?.title ?? ""}
          userName={userName}
          onOpenLeft={openLeft}
          onOpenTop={openTop}
          onLogout={logout}
        />
      </div>

      {/* Contenuto */}
      <div onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction} style={{ minHeight: "100vh" }}>
        <div className="container" onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction}>
          <Thread
            bubbles={mergedBubbles}
            serverError={conv.serverError}
            threadRef={conv.threadRef}
            endRef={conv.endRef}
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

      <div style={{ position: "relative", zIndex: 2001 }}>
        <LeftDrawer open={leftOpen} onClose={closeLeft} onSelect={conv.handleSelectConv} />
        <RightDrawer open={topOpen} onClose={closeTop} />
      </div>
    </>
  );
}
