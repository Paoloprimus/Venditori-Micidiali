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

export default function HomeClient({ email, userName }: { email: string; userName: string }) {
  const supabase = createSupabaseBrowser();
  const { leftOpen, topOpen, openLeft, closeLeft, openTop, closeTop } = useDrawers();

  // (RIMOSSO) Vecchio stato per checkbox "Dialogo ON (mani/occhi liberi)"
  // const [dialogoOn, setDialogoOn] = useState(false);

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

  // ---- Stato conferma intent
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);

  function speakIfEnabled(msg: string) {
    // Regola d'oro: mai solo voce → leggi solo se lo speaker è ON
    if (voice.speakerEnabled) {
      speakAssistant(msg);
    }
  }

  function askConfirm(i: Intent) {
    setPendingIntent(i);
    // prompt vocale sintetico (letto solo se speaker ON)
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

    // intercetta SEMPRE anche in uso vocale
    onSendDirectly: async (text) => {
      const raw = (text || "").trim();
      if (!raw) return;

      // se sto attendendo conferma → gestisci sì/no
      if (pendingIntent) {
        if (YES.test(raw)) { await handleIntent(pendingIntent); setPendingIntent(null); return; }
        if (NO.test(raw))  { speakIfEnabled("Ok, annullato."); setPendingIntent(null); return; }
        // input diverso: passa al modello normalmente
      } else {
        const intent = matchIntent(raw);
        if (intent.type !== "NONE") { askConfirm(intent); return; }
      }

      await conv.send(raw);
    },

    onSpeak: (text) => speakAssistant(text), // speakAssistant internamente/esternamente è già gated
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

  // invio da Composer (uso testuale)
  async function submitFromComposer() {
    if (voice.isRecording) { await voice.stopMic(); }
    const txt = conv.input.trim();
    if (!txt) return;

    if (pendingIntent) {
      if (YES.test(txt)) { await handleIntent(pendingIntent); setPendingIntent(null); conv.setInput(""); return; }
      if (NO.test(txt))  { speakIfEnabled("Ok, annullato."); setPendingIntent(null); conv.setInput(""); return; }
    } else {
      const intent = matchIntent(txt);
      if (intent.type !== "NONE") { askConfirm(intent); conv.setInput(""); return; }
    }

    await conv.send(txt);
    conv.setInput("");
  }

  // ✅ Patch solo in render: trasformo le risposte assistant prima di mostrarle
  const patchedBubbles = useMemo(() => {
    return (conv.bubbles || []).map((b: any) => {
      if (b?.role !== "assistant" || !b?.content) return b;
      return { ...b, content: patchPriceReply(String(b.content)) };
    });
  }, [conv.bubbles]);

  return (
    <>
      {/* TopBar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "var(--bg)", borderBottom: "1px solid var(--ring)" }}>
        <TopBar
          title={conv.currentConv ? conv.currentConv.title : "Venditori Micidiali"}
          userName={userName}
          onOpenLeft={openLeft}
          onOpenTop={openTop}
          onLogout={logout}
        />
      </div>
      <div style={{ height: 56 }} />

      {/* (RIMOSSO) Toggle Dialogo ON (vecchia spunta in alto) */}

      {/* Barra conferma quando c'è un intent in sospeso (clic testuale) */}
      {pendingIntent && (
        <div style={{ maxWidth: 980, margin: "8px auto 0", padding: "8px 16px", display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--muted)' }}>Confermi l’azione richiesta?</span>
          <button
            onClick={async () => { await handleIntent(pendingIntent); setPendingIntent(null); }}
            style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#111827', color: 'white' }}
          >
            Conferma
          </button>
          <button
            onClick={() => { speakIfEnabled("Ok, annullato."); setPendingIntent(null); }}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white' }}
          >
            Annulla
          </button>
        </div>
      )}

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
              // (RIMOSSI) onPressStart / onPressEnd: il nuovo Composer non li usa
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
