// components/HomeClient.tsx
"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useDrawers, LeftDrawer, RightDrawer } from "./Drawers";
import { createSupabaseBrowser } from "../lib/supabase/client";

import TopBar from "./home/TopBar";
import Thread from "./home/Thread";
import Composer from "./home/Composer";

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

  // "Il prezzo base di «X» è 0." → "Il prezzo base di «X» è non disponibile a catalogo."
  t = t.replace(
    /(Il prezzo base di «[^»]+» è )0([.,\s]|$)/i,
    "$1non disponibile a catalogo$2"
  );

  // "Sconto applicato: 0%" → "Sconto applicato: nessuno"
  t = t.replace(
    /(Sconto(?:\sapplicato)?:\s*)0\s*%/i,
    "$1nessuno"
  );

  // "Attualmente lo sconto applicato è 0%." → "Attualmente lo sconto applicato è nessuno."
  t = t.replace(
    /(Attualmente lo sconto applicato è\s*)0\s*%/i,
    "$1nessuno"
  );

  return t;
}

/** --- Utility minimal per la funzione standard --- */
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
const LOCAL_TEMPLATES: Record<string, { confirm: string; response: string }> = {
  prod_conteggio_catalogo: {
    confirm: "Confermi che vuoi contare le referenze di «{prodotto}» a catalogo?",
    response: "A catalogo ho trovato {count} referenze di «{prodotto}».",
  },
  prod_giacenza_magazzino: {
    confirm: "Confermi che vuoi la giacenza complessiva di «{prodotto}» in deposito?",
    response: "In deposito ci sono {stock} pezzi di «{prodotto}».",
  },
  prod_prezzo_sconti: {
    confirm: "Confermi che vuoi prezzo e sconti per «{prodotto}»?",
    response: "Il prezzo base di «{prodotto}» è {price}. Sconto applicato: {discount}.",
  },
};

export default function HomeClient({ email, userName }: { email: string; userName: string }) {
  const supabase = createSupabaseBrowser();
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

  // ---- Stato conferma intent (per voce legacy)
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

  // ---- Voce (SR nativa) — lasciata invariata
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

  // invio da Composer (uso testuale) — shortlist → conferma (popup) → execute → **conv.send(finalText)**
  async function submitFromComposer() {
    if (voice.isRecording) { await voice.stopMic(); }
    const txt = conv.input.trim();
    if (!txt) return;

    // (Legacy) sì/no barra (teniamo la logica, ma rimuoviamo la barra UI sotto)
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
      // --- Flusso standard ---
      try {
        // 1) normalizza
        const norm = await postJSON(`${window.location.origin}/api/standard/normalize`, { text: txt });
        const normalized: string = norm?.normalized || txt;

        // 2) shortlist topK
        const sl = await postJSON(`${window.location.origin}/api/standard/shortlist`, { q: normalized, topK: 5 });
        const items: Array<{ intent_key: string; text: string; score: number }> = sl?.items || [];

        // 3) top-1 → se esiste, conferma ed esegui
        const top = items[0];
        if (top && top.intent_key) {
          const intentKey = top.intent_key;

          // 4) estrai {prodotto}
          const prodotto = extractProductTerm(unaccentLower(normalized));

          // 5) conferma (popup) con template locale
          const confirmTpl = LOCAL_TEMPLATES[intentKey]?.confirm || "Vuoi procedere?";
          const confirmation = fillTemplateSimple(confirmTpl, { prodotto });
          const userOk = window.confirm(confirmation);
          if (!userOk) {
            conv.setInput("");
            return;
          }

          // 6) execute
          const execJson = await postJSON(`${window.location.origin}/api/standard/execute`, {
            intent_key: intentKey,
            slots: { prodotto }
          });

          // Se non gestito → fallback normale
          if (!execJson?.ok) {
            await conv.send(txt);
            conv.setInput("");
            return;
          }

          // 7) compila template risposta (con fallback prezzo/sconto se 0)
          const dataForTemplate: Record<string, any> = { prodotto, ...(execJson.data || {}) };
          if (intentKey === "prod_prezzo_sconti") {
            const price = Number(execJson?.data?.price) || 0;
            const discount = Number(execJson?.data?.discount) || 0;
            dataForTemplate.price = price > 0 ? price : "non disponibile a catalogo";
            dataForTemplate.discount = discount > 0 ? `${discount}%` : "nessuno";
          }
          const responseTpl = LOCAL_TEMPLATES[intentKey]?.response || "Fatto.";
          const finalText = fillTemplateSimple(responseTpl, dataForTemplate);

          // 8) invia al modello (UNA SOLA risposta, nessuna bolla locale)
          await conv.send(finalText);

          conv.setInput("");
          return;
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

    // Fallback: invia al modello generico
    await conv.send(txt);
    conv.setInput("");
  }

  return (
    <>
      {/* TopBar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "var(--bg)", borderBottom: "1px solid " +
      "var(--ring)" }}>
        <TopBar
          title={conv.currentConv ? conv.currentConv.title : "Venditori Micidiali"}
          userName={userName}
          onOpenLeft={openLeft}
          onOpenTop={openTop}
          onLogout={logout}
        />
      </div>
      <div style={{ height: 56 }} />

      {/* ❌ RIMOSSA la barra di conferma richiesta sotto la TopBar */}

      {/* Contenuto */}
      <div onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction} style={{ minHeight: "100vh" }}>
        <div className="container" onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction}>
          <Thread bubbles={patchedBubbles} serverError={conv.serverError} threadRef={conv.threadRef} endRef={conv.endRef} />
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
