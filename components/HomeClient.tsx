// components/HomeClient.tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { handleIntent, speak } from "@/lib/voice/dispatch";

const YES = /\b(s[ìi]|esatto|ok|procedi|vai|confermo|invia)\b/i;
const NO  = /\b(no|annulla|stop|ferma|negativo|non ancora)\b/i;

export default function HomeClient({ email, userName }: { email: string; userName: string }) {
  const supabase = createSupabaseBrowser();
  const { leftOpen, topOpen, openLeft, closeLeft, openTop, closeTop } = useDrawers();

  // ---- Dialogo ON (ex "modalità guida")
  const [dialogoOn, setDialogoOn] = useState(false);

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

  function askConfirm(i: Intent) {
    setPendingIntent(i);
    // prompt vocale sintetico
    switch (i.type) {
      case "CLIENT_CREATE":
        speak(`Confermi: creo il cliente ${i.name ?? 'senza nome'}?`);
        break;
      case "CLIENT_SEARCH":
        speak(`Confermi: cerco il cliente ${i.query}?`);
        break;
      case "CLIENT_UPDATE":
        speak(`Confermi: modifico il cliente ${i.name}?`);
        break;
      case "NOTES_SEARCH":
        speak(`Vuoi che cerchi nelle note di ${i.accountHint} se c'è qualcosa su ${i.topic}?`);
        break;
      default:
        speak("Confermi l'azione?");
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
        if (NO.test(raw))  { speak("Ok, annullato."); setPendingIntent(null); return; }
        // input diverso: passa al modello normalmente
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

  // invio da Composer (uso testuale)
  async function submitFromComposer() {
    if (voice.isRecording) { await voice.stopMic(); }
    const txt = conv.input.trim();
    if (!txt) return;

    if (pendingIntent) {
      if (YES.test(txt)) { await handleIntent(pendingIntent); setPendingIntent(null); conv.setInput(""); return; }
      if (NO.test(txt))  { speak("Ok, annullato."); setPendingIntent(null); conv.setInput(""); return; }
    } else {
      const intent = matchIntent(txt);
      if (intent.type !== "NONE") { askConfirm(intent); conv.setInput(""); return; }
    }

    await conv.send(txt);
    conv.setInput("");
  }

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

      {/* Toggle Dialogo ON */}
      <div style={{ maxWidth: 980, margin: "6px auto 0", padding: "0 16px" }}>
        <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--muted)" }}>
          <input
            type="checkbox"
            checked={dialogoOn}
            onChange={(e) => {
              const on = e.target.checked;
              setDialogoOn(on);
              if (on) speak("Dialogo ON attivato.");
              else speak("Dialogo ON disattivato.");
            }}
          />
          Dialogo ON (mani/occhi liberi)
        </label>
      </div>

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
            onClick={() => { speak("Ok, annullato."); setPendingIntent(null); }}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white' }}
          >
            Annulla
          </button>
        </div>
      )}

      {/* Contenuto */}
      <div onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction} style={{ minHeight: "100vh" }}>
        <div className="container" onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction}>
          <Thread bubbles={conv.bubbles} serverError={conv.serverError} threadRef={conv.threadRef} endRef={conv.endRef} />
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
              onPressStart: voice.handleVoicePressStart,
              onPressEnd: voice.handleVoicePressEnd,
              onClick: voice.handleVoiceClick,
              voiceMode: voice.voiceMode,
              onToggleDialog: () => (voice.voiceMode ? voice.stopDialog() : voice.startDialog()),
              speakerEnabled: voice.speakerEnabled,
              onToggleSpeaker: () => voice.setSpeakerEnabled(s => !s),
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
