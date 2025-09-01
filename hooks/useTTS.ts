"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * TTS semplice e affidabile:
 * - Cancella la sintesi in corso prima di parlare.
 * - Espone uno stato 'ttsSpeaking' usabile da useVoice per non aprire il mic mentre l'assistente parla.
 * - 'speakAssistant()' legge l'argomento passato; se assente, legge l'ultimo testo memorizzato.
 */
export function useTTS() {
  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [lastAssistantText, setLastAssistantText] = useState("");

  // inizializza synth lato client
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis ?? null;
    }
    return () => {
      try { synthRef.current?.cancel?.(); } catch {}
      setTtsSpeaking(false);
    };
  }, []);

  const speakAssistant = useCallback((text?: string) => {
    const synth = synthRef.current;
    if (!synth) return;

    const toSpeak = (text ?? lastAssistantText ?? "").trim();
    if (!toSpeak) return;

    // stop eventuale sintesi precedente
    try { synth.cancel(); } catch {}

    const u = new SpeechSynthesisUtterance(toSpeak);
    u.lang = "it-IT";
    u.rate = 1;
    u.pitch = 1;
    u.onstart = () => setTtsSpeaking(true);
    u.onend = () => setTtsSpeaking(false);
    u.onerror = () => setTtsSpeaking(false);

    try {
      synth.speak(u);
    } catch {
      setTtsSpeaking(false);
    }
  }, [lastAssistantText]);

  return {
    ttsSpeaking,
    lastAssistantText,
    setLastAssistantText,
    speakAssistant,
  };
}
