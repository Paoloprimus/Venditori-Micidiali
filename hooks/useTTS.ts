// hooks/useTTS.ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * TTS con OpenAI (qualità alta) + fallback browser (gratis).
 * 
 * Flusso:
 * 1. Prova OpenAI TTS (POST /api/voice/tts)
 * 2. Se fallisce, usa speechSynthesis del browser
 * 
 * API: { ttsSpeaking, lastAssistantText, setLastAssistantText, speakAssistant, stopSpeaking }
 */

type TTSMode = "openai" | "browser" | "auto";

export function useTTS(mode: TTSMode = "auto") {
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [lastAssistantText, setLastAssistantText] = useState("");
  
  // Refs per gestione audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const currentUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cache per evitare chiamate ripetute
  const cacheRef = useRef<Map<string, string>>(new Map());
  const MAX_CACHE_SIZE = 20;

  // ===== Browser TTS setup =====
  const voicesRef = useRef<SpeechSynthesisVoice[] | null>(null);
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  function pickBestItalianVoice(voices: SpeechSynthesisVoice[] | null | undefined): SpeechSynthesisVoice | null {
    if (!voices || voices.length === 0) return null;
    const namePri = [
      "Google italiano", "Google Italiano", "Google IT",
      "Alice", "Luca",
      "Microsoft Elsa - Italian (Italy)", "Microsoft Cosimo - Italian (Italy)", "Microsoft Isabella - Italian (Italy)"
    ];
    for (const n of namePri) {
      const v = voices.find(v => (v.name || "").toLowerCase() === n.toLowerCase());
      if (v) return v;
    }
    const anyIt = voices.find(v => (v.lang || "").toLowerCase().startsWith("it"));
    if (anyIt) return anyIt;
    return voices[0] ?? null;
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis ?? null;
      
      const loadVoices = () => {
        if (!synthRef.current) return;
        const all = synthRef.current.getVoices?.() || [];
        voicesRef.current = all;
        bestVoiceRef.current = pickBestItalianVoice(all);
      };
      
      try {
        window.speechSynthesis?.addEventListener?.("voiceschanged", loadVoices);
      } catch {}
      loadVoices();

      return () => {
        try { window.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices); } catch {}
        stopSpeaking();
      };
    }
  }, []);

  // ===== Stop all playback =====
  const stopSpeaking = useCallback(() => {
    // Stop OpenAI audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    
    // Abort pending fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Stop browser TTS
    try { synthRef.current?.cancel?.(); } catch {}
    currentUtterancesRef.current = [];
    
    setTtsSpeaking(false);
  }, []);

  // ===== OpenAI TTS =====
  async function speakOpenAI(text: string): Promise<boolean> {
    try {
      // Check cache first
      const cacheKey = text.slice(0, 200); // Cache key basata sui primi 200 chars
      let audioUrl = cacheRef.current.get(cacheKey);
      
      if (!audioUrl) {
        // Abort any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        
        const response = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: abortControllerRef.current.signal,
        });
        
        if (!response.ok) {
          throw new Error(`TTS failed: ${response.status}`);
        }
        
        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        
        // Cache management
        if (cacheRef.current.size >= MAX_CACHE_SIZE) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey) {
            const oldUrl = cacheRef.current.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            cacheRef.current.delete(firstKey);
          }
        }
        cacheRef.current.set(cacheKey, audioUrl);
      }
      
      // Play audio
      return new Promise((resolve) => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onplay = () => setTtsSpeaking(true);
        audio.onended = () => {
          setTtsSpeaking(false);
          resolve(true);
        };
        audio.onerror = () => {
          setTtsSpeaking(false);
          resolve(false);
        };
        
        audio.play().catch(() => {
          setTtsSpeaking(false);
          resolve(false);
        });
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        return false; // Aborted, not an error
      }
      console.warn("[useTTS] OpenAI TTS failed, falling back to browser:", err);
      return false;
    }
  }

  // ===== Browser TTS (fallback) =====
  function chunkTextForProsody(raw: string): string[] {
    const text = (raw || "").replace(/\s+/g, " ").trim();
    if (!text) return [];
    const coarse = text.split(/([\.!?;:])\s+/).reduce<string[]>((acc, part) => {
      if (!part) return acc;
      if (/[\.!?;:]/.test(part) && acc.length) {
        acc[acc.length - 1] = (acc[acc.length - 1] + part).trim();
      } else {
        acc.push(part.trim());
      }
      return acc;
    }, []);

    const chunks: string[] = [];
    let buf = "";
    for (const piece of coarse) {
      if ((buf + " " + piece).trim().length > 160) {
        if (buf) chunks.push(buf.trim());
        buf = piece;
      } else {
        buf = (buf ? buf + " " : "") + piece;
      }
    }
    if (buf) chunks.push(buf.trim());
    return chunks.filter(Boolean);
  }

  function speakBrowser(text: string): void {
    const synth = synthRef.current;
    if (!synth) return;

    const toSpeak = text.trim();
    if (!toSpeak) return;

    const voice = bestVoiceRef.current;
    const chunks = chunkTextForProsody(toSpeak);
    if (chunks.length === 0) return;

    setTtsSpeaking(true);

    const rate = 0.95;
    const pitch = 1.02;
    const volume = 1.0;

    const queueNext = (idx: number) => {
      if (!synth) { setTtsSpeaking(false); return; }
      if (idx >= chunks.length) { setTtsSpeaking(false); return; }

      const u = new SpeechSynthesisUtterance(chunks[idx]);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || "it-IT";
      u.rate = rate;
      u.pitch = pitch;
      u.volume = volume;

      u.onend = () => setTimeout(() => queueNext(idx + 1), 180);
      u.onerror = () => setTimeout(() => queueNext(idx + 1), 0);

      currentUtterancesRef.current.push(u);
      try { synth.speak(u); } catch { setTtsSpeaking(false); }
    };

    queueNext(0);
  }

  // ===== Main speak function =====
  const speakAssistant = useCallback(async (text?: string) => {
    const toSpeak = (text ?? lastAssistantText ?? "").trim();
    if (!toSpeak) return;

    // Stop previous
    stopSpeaking();

    // For very short text (< 20 chars), use browser TTS to save API calls
    const useOpenAI = mode === "openai" || (mode === "auto" && toSpeak.length >= 20);
    
    if (useOpenAI) {
      const success = await speakOpenAI(toSpeak);
      if (!success && mode === "auto") {
        // Fallback to browser
        speakBrowser(toSpeak);
      }
    } else {
      speakBrowser(toSpeak);
    }
  }, [lastAssistantText, mode, stopSpeaking]);

  return {
    ttsSpeaking,
    lastAssistantText,
    setLastAssistantText,
    speakAssistant,
    stopSpeaking,
  };
}
