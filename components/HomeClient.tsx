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
import { handleIntent } from "@/lib/voice/dispatch"; // ⬅️ rimosso import 'speak'

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
  useEffect(() => { conv.ensureConversation(); /* once */  }, []); // eslint-disable-line

  // ---- Stato conferma intent (legacy voce) — lasciato invariato
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);

  function speakIfEnabled(msg: string) {
    if (voice.speakerEnabled) {
      speakAssistant(msg);
    }
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

  // ---- Voce (SR nativa) — invariata
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

  const handleAnyHomeInteraction = useCallback(() => {
    if (leftOpen) closeLeft();
    if (topOpen) closeTop();
  }, [leftOpen, topOpen, closeLeft, closeTop]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // ✅ Patch solo in render: trasformo eventuali 0/0% nell'output assistant remoto
  const patchedBubbles = useMemo(() => {
    return (conv.bubbles || []).map((b: any) => {
      if (b?.role !== "assistant" || !b?.content) return b;
      return { ...b, content: patchPriceReply(String(b.content)) };
    });
  }, [conv.bubbles]);

  // --- Stato per bolle locali (domanda e risposta) ---
  const [localUser, setLocalUser] = useState<string[]>([]);
  const [localAssistant, setLocalAssistant] = useState<string[]>([]);

  // 🆕 Memorizzo ultimo prodotto valido per “e quanti in …”
  const [lastProduct, setLastProduct] = useState<string | null>(null);

  function appendUserLocal(text: string) {
    setLocalUser(prev => [...prev, text]);
  }
  function appendAssistantLocal(text: string) {
    setLocalAssistant(prev => [...prev, patchPriceReply(text)]);
  }

  // Unione bolle: prima remote (model), poi locali (standard flow)
  const mergedBubbles = useMemo(() => {
    const localsUser = localUser.map((t) => ({ role: "user", content: t }));
    const localsAssistant = localAssistant.map((t) => ({ role: "assistant", content: t }));
    return [...patchedBubbles, ...localsUser, ...localsAssistant];
  }, [patchedBubbles, localUser, localAssistant]);

  // invio da Composer (uso testuale) — NIENTE popup; domanda e risposta come in una chat normale
  async function submitFromComposer() {
    if (voice.isRecording) { await voice.stopMic(); }
    const txt = conv.input.trim();
    if (!txt) return;

    // (Legacy) sì/no barra — lasciata per compatibilità ma senza UI extra
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
    } else {
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

          // 4) estrai {prodotto} con fallback all’ultimo valido per “e quanti …”
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

          // Se non gestito → fallback al modello (abbiamo già scritto la domanda locale)
          if (!execJson?.ok) {
// 🔀 PRIMA di mandare al modello generico: prova il planner (client → DB reale)
try {
  // crypto minimale: identità (se hai un hook crypto reale, usalo qui al posto di questo)
  const crypto = {
    decryptFields: async (_scope: string, _table: string, _id: string, row: any) => row,
  };

const res = await runPlanner(
  txt,
  {
    // ⬅️ adattiamo lo scope IT → EN per il planner
    state: {
      ...convCtx.state,
      scope:
        convCtx.state.scope === "prodotti" ? "products" :
        convCtx.state.scope === "ordini"   ? "orders"   :
        convCtx.state.scope === "vendite"  ? "sales"    :
        convCtx.state.scope, // "clients" o "global"
      // opzionale ma utile: allinea anche topic_attivo se lo usi
      topic_attivo:
        convCtx.state.topic_attivo === "prodotti" ? "products" :
        convCtx.state.topic_attivo === "ordini"   ? "orders"   :
        convCtx.state.topic_attivo === "vendite"  ? "sales"    :
        convCtx.state.topic_attivo,
    } as any, // evita l'errore TS sul tipo del planner

    expired: convCtx.expired,

    // ⬅️ adattatore inverso EN → IT per lo scope che il planner potrebbe impostare
    setScope: (s: any) =>
      convCtx.setScope(
        s === "products" ? "prodotti" :
        s === "orders"   ? "ordini"   :
        s === "sales"    ? "vendite"  :
        s // "clients" o "global"
      ),

    remember: convCtx.remember,
    reset: convCtx.reset,
  } as any, // cast totale, così TS non si lamenta
  crypto as any
);

  
  if (res?.text) {
    // Mostra la domanda e la risposta del planner in locale
    appendUserLocal(txt);
    appendAssistantLocal(res.text);

    // Persisti su thread corrente (come fai per lo standard flow)
    const convId = conv.currentConv?.id;
    if (convId) {
      await fetch("/api/messages/append", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          userText: txt,
          assistantText: res.text,
        }),
      });
      const r = await fetch(`/api/messages/by-conversation?conversationId=${convId}&limit=200`, { cache: "no-store" });
      const j = await r.json();
      conv.setBubbles?.((j.items ?? []).map((r: any) => ({ id: r.id, role: r.role, content: r.content })));
      setLocalUser([]);
      setLocalAssistant([]);
    }

    conv.setInput("");
    return; // ⬅️ STOP: non chiamare il modello generico
  }
} catch (e) {
  // se il planner non gestisce il caso, cadiamo nel modello generico
  console.error("[planner fallback → model]", e);
}

// Fallback: invia al modello generico (come prima)
  // 🔀 PRIMA del modello generico: prova il planner (client → DB reale)
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
            convCtx.state.scope, // "clients" o "global"
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
      } as any,
      crypto as any
    );

    if (res?.text) {
      appendUserLocal(txt);
      appendAssistantLocal(`[planner] ${res.text}`);
      console.error("[planner_v2:text_hit]", res);

      // persisti come fai nello standard flow
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
      return; // ⬅️ STOP: non chiamare il modello generico
    }
  } catch (e) {
    console.error("[planner text fallback → model]", e);
  }

  // Fallback: invia al modello generico (come prima)
  await conv.send(txt);
  conv.setInput("");


            return;
          }

          // 6) compila template risposta (con fallback prezzo/sconto se 0)
          const dataForTemplate: Record<string, any> = { prodotto, ...(execJson.data || {}) };
          if (intentKey === "prod_prezzo_sconti") {
            const price = Number(execJson?.data?.price) || 0;
            const discount = Number(execJson?.data?.discount) || 0;
            dataForTemplate.price = price > 0 ? price : "non disponibile a catalogo";
            dataForTemplate.discount = discount > 0 ? `${discount}%` : "nessuno";
          }

          const responseTpl =
            LOCAL_TEMPLATES[intentKey]?.response ||
            "Fatto.";

          const finalText = fillTemplateSimple(responseTpl, dataForTemplate);

          // 🆕 Memorizza ultimo prodotto valido (singola parola)
          if (prodotto && !/\s/.test(prodotto)) {
            setLastProduct(prodotto);
          }

          // 👉 6.1: UNA SOLA risposta in chat (assistant locale)
          appendAssistantLocal(finalText);

          // ⬇️ salva user+assistant nel DB
          const convId = conv.currentConv?.id;
          if (convId) {
            await fetch("/api/messages/append", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                conversationId: convId,
                userText: txt,
                assistantText: finalText,
              }),
            });

            // ricarica subito dal server (evita che le bolle “scompaiano”)
            const res = await fetch(`/api/messages/by-conversation?conversationId=${convId}&limit=200`, { cache: "no-store" });
            const j = await res.json();
            conv.setBubbles?.((j.items ?? []).map((r: any) => ({ id: r.id, role: r.role, content: r.content })));

            // ora puoi svuotare eventuali bolle locali
            setLocalUser([]);
            setLocalAssistant([]);
          }

          conv.setInput("");
          return; // NON chiamare conv.send() qui: evitiamo la seconda risposta del modello
        }
      } catch (e) {
        console.error("[standard flow error]", e);
        // in caso di errore → fallback
      }

      // Nessun intent standard riconosciuto → flusso normale
      const intent = matchIntent(txt);
      if (intent.type !== "NONE") {
        askConfirm(intent);
        conv.setInput("");
        return;
      }
    }

    // Fallback: invia al modello generico (mostra domanda/risposta gestite dal tuo hook)
    await conv.send(txt);
    conv.setInput("");
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
      <div style={{ height: 56 }} />

      {/* ❌ Nessuna barra di conferma richiesta sotto la TopBar */}

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
