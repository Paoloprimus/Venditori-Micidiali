// components/HomeClient.tsx
"use client";
import { useCallback, useEffect } from "react";
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

  // ---- Conversazioni / messaggi
  const conv = useConversations({
    onAssistantReply: (text) => {
      setLastAssistantText(text);
      // TTS viene gestito qui sotto da un useEffect in base al toggle speaker
    },
  });

  // 👉 crea/subito la sessione di oggi al primo accesso
  useEffect(() => {
    conv.ensureConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Voce
  const voice = useVoice({
    onTranscriptionToInput: (text) => { conv.setInput(text); },
    onSendDirectly: async (text) => {
      // ❌ NON leggiamo più il prompt utente
      await conv.send(text);
      // niente speakAssistant qui: il TTS leggerà la risposta del modello via onAssistantReply/useEffect
    },
    onSpeak: (text) => speakAssistant(text),
    createNewSession: async (titleAuto) => {
      try { await conv.createConversation(titleAuto); return conv.currentConv; }
      catch { return null; }
    },
    autoTitleRome: conv.autoTitleRome,
    preferServerSTT: false, // ✅ abilita SR nativo per interim (live transcription)
  });

  // auto-resize della textarea
  useAutoResize(conv.taRef, conv.input);

  // ✅ parla SOLO la risposta del modello, quando arriva
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
      <TopBar
        title={conv.currentConv ? conv.currentConv.title : "Venditore Micidiale"}
        onOpenLeft={openLeft}
        onOpenTop={openTop}
        onLogout={logout}
      />

      {/* Wrapper esterno */}
      <div onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction} style={{ minHeight: "100vh" }}>
        <div className="container" onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction}>
          <Thread
            bubbles={conv.bubbles}
            serverError={conv.serverError}
            threadRef={conv.threadRef}
            endRef={conv.endRef}   // ✅ sentinel per autoscroll all’ultimo messaggio
          />
          <Composer
            value={conv.input}
            onChange={(v) => { conv.setInput(v); voice.setLastInputWasVoice?.(false); }}
            onSend={async () => {
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
      {/* ✅ chiusura wrapper esterno */}
      </div>

      <LeftDrawer open={leftOpen} onClose={closeLeft} onSelect={conv.handleSelectConv} />
      <RightDrawer open={topOpen} onClose={closeTop} />
    </>
  );
}
