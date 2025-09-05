// components/HomeClient.tsx
"use client";
import { useCallback, useEffect, useRef } from "react";
import { useDrawers, LeftDrawer, RightDrawer } from "./Drawers";
import { createSupabaseBrowser } from "../lib/supabase/client";

import TopBar from "./home/TopBar";
import Thread from "./home/Thread";
import Composer from "./home/Composer";

import { useConversations } from "../hooks/useConversations";
import { useTTS } from "../hooks/useTTS";
import { useVoice } from "../hooks/useVoice";
import { useAutoResize } from "../hooks/useAutoResize";

export default function HomeClient({ email }: { email: string }) {
  const supabase = createSupabaseBrowser();
  const { leftOpen, topOpen, openLeft, closeLeft, openTop, closeTop } = useDrawers();

  // ---- TTS
  const { ttsSpeaking, lastAssistantText, setLastAssistantText, speakAssistant } = useTTS();

  // ✅ ref + funzione stabile per sapere se il TTS sta parlando (usata da useVoice/Dialogo)
  const ttsSpeakingRef = useRef(false);
  useEffect(() => { ttsSpeakingRef.current = ttsSpeaking; }, [ttsSpeaking]);
  const isTtsSpeakingFn = useCallback(() => ttsSpeakingRef.current, []);

  // ---- Conversazioni / messaggi
  const conv = useConversations({
    onAssistantReply: (text) => {
      setLastAssistantText(text);
      // TTS leggerà la risposta qui sotto
    },
  });

  // Crea la sessione odierna al primo accesso
  useEffect(() => {
    conv.ensureConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Voce (SR nativa per live transcript)
  const voice = useVoice({
    onTranscriptionToInput: (text) => { conv.setInput(text); },
    onSendDirectly: async (text) => { await conv.send(text); },
    onSpeak: (text) => speakAssistant(text),
    createNewSession: async (titleAuto) => {
      try { await conv.createConversation(titleAuto); return conv.currentConv; }
      catch { return null; }
    },
    autoTitleRome: conv.autoTitleRome,
    preferServerSTT: false,           // ⬅️ live transcript
    isTtsSpeaking: isTtsSpeakingFn,   // ⬅️ funzione stabile (no closure stantia)
  });

  // auto-resize della textarea
  useAutoResize(conv.taRef, conv.input);

  // Parla SOLO la risposta del modello quando arriva (se speaker abilitato)
  useEffect(() => {
    if (!lastAssistantText) return;
    if (voice.speakerEnabled) speakAssistant(lastAssistantText);
  }, [lastAssistantText, voice.speakerEnabled, speakAssistant]);

  // ------- UI helpers
  const handleAnyHomeInteraction = useCallback(() => {
    if (leftOpen) closeLeft();
    if (topOpen) closeTop();
  }, [leftOpen, topOpen, closeLeft, closeTop]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      {/* 🔝 TopBar fixed */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: "var(--bg)",
          borderBottom: "1px solid var(--ring)",
        }}
      >
        <TopBar
          title={conv.currentConv ? conv.currentConv.title : "Venditore Micidiale"}
          onOpenLeft={openLeft}
          onOpenTop={openTop}
          onLogout={logout}
        />
      </div>

      {/* spacer per evitare che la TopBar fissa copra il contenuto */}
      <div style={{ height: 56 }} />

      {/* Wrapper esterno */}
      <div onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction} style={{ minHeight: "100vh" }}>
        <div className="container" onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction}>
          <Thread
            bubbles={conv.bubbles}
            serverError={conv.serverError}
            threadRef={conv.threadRef}
            endRef={conv.endRef}
          />
          <Composer
            value={conv.input}
            onChange={(v) => { conv.setInput(v); voice.setLastInputWasVoice?.(false); }}
            onSend={async () => {
              // ✅ Se il microfono è attivo, spegnilo e finalizza la trascrizione prima di inviare
              if (voice.isRecording) {
                await voice.stopMic();
              }
              const txt = conv.input.trim();
              if (!txt) return;
              await conv.send(txt);
              conv.setInput("");
            }}
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

      {/* Drawer sopra la TopBar (per il bottone "Chiudi") */}
      <div style={{ position: "relative", zIndex: 2001 }}>
        <LeftDrawer open={leftOpen} onClose={closeLeft} onSelect={conv.handleSelectConv} />
        <RightDrawer open={topOpen} onClose={closeTop} />
      </div>
    </>
  );
}
