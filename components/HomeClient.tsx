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

// 🔊 Intent & dispatcher (voice-first)
import { matchIntent } from "@/lib/voice/intents";
import { handleIntent, speak } from "@/lib/voice/dispatch";

export default function HomeClient({ email, userName }: { email: string; userName: string }) {
  const supabase = createSupabaseBrowser();
  const { leftOpen, topOpen, openLeft, closeLeft, openTop, closeTop } = useDrawers();

  // ---- Driving mode (mani/occhi liberi)
  const [drivingMode, setDrivingMode] = useState(false);

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

    // ✅ In modalità guida intercettiamo i comandi PRIMA di inviare al modello
    onSendDirectly: async (text) => {
      const raw = (text || "").trim();
      if (!raw) return;
      if (drivingMode) {
        const intent = matchIntent(raw);
        if (intent.type !== "NONE") {
          const handled = await handleIntent(intent);
          if (handled) return; // azione eseguita → non inviare al modello
        }
      }
      await conv.send(raw);
    },

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
          background:
