"use client";
import { useRef, useState } from "react";

export function useTTS() {
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [lastAssistantText, setLastAssistantText] = useState("");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  function speakAssistant(textOverride?: string) {
    const text = (textOverride || lastAssistantText || "").trim();
    if (!text) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try { window.speechSynthesis.cancel(); } catch {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "it-IT";
    u.rate = 1;
    u.onend = () => setTtsSpeaking(false);
    u.onerror = () => setTtsSpeaking(false);

    const voices = window.speechSynthesis.getVoices();
    const italianVoice = voices.find(v => v.lang.includes("it-IT") || v.lang.includes("it_IT"));
    if (italianVoice) u.voice = italianVoice;

    utterRef.current = u;
    setTtsSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  function stopSpeak() {
    try { window.speechSynthesis.cancel(); } catch {}
    setTtsSpeaking(false);
  }

  return {
    ttsSpeaking,
    lastAssistantText,
    setLastAssistantText,
    speakAssistant,
    stopSpeak,
  };
}
