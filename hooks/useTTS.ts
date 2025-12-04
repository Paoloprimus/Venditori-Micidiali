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
      console.log("[useTTS] Generating OpenAI TTS for:", text.slice(0, 50) + "...");
      
      // Check cache first
      const cacheKey = text.slice(0, 200); // Cache key basata sui primi 200 chars
      let audioUrl = cacheRef.current.get(cacheKey);
      
      if (!audioUrl) {
        // Abort any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        
        console.log("[useTTS] Fetching from /api/voice/tts...");
        const response = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: abortControllerRef.current.signal,
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => "unknown");
          console.error("[useTTS] API error:", response.status, errorText);
          throw new Error(`TTS failed: ${response.status} - ${errorText}`);
        }
        
        const blob = await response.blob();
        console.log("[useTTS] Received audio blob:", blob.size, "bytes");
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
      } else {
        console.log("[useTTS] Using cached audio");
      }
      
      // Play audio
      return new Promise((resolve) => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onloadeddata = () => {
          console.log("[useTTS] Audio loaded, duration:", audio.duration);
        };
        
        audio.onplay = () => {
          console.log("[useTTS] Audio playing");
          setTtsSpeaking(true);
        };
        
        audio.onended = () => {
          console.log("[useTTS] Audio ended");
          setTtsSpeaking(false);
          resolve(true);
        };
        
        audio.onerror = (e) => {
          console.error("[useTTS] Audio error:", e);
          setTtsSpeaking(false);
          resolve(false);
        };
        
        console.log("[useTTS] Attempting to play audio...");
        audio.play().then(() => {
          console.log("[useTTS] Play started successfully");
        }).catch((err) => {
          console.error("[useTTS] Play failed (autoplay blocked?):", err);
          setTtsSpeaking(false);
          resolve(false);
        });
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("[useTTS] Request aborted");
        return false; // Aborted, not an error
      }
      console.error("[useTTS] OpenAI TTS failed:", err);
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
    if (!toSpeak) {
      console.log("[useTTS] speakAssistant called with empty text, skipping");
      return;
    }

    console.log("[useTTS] speakAssistant called, text length:", toSpeak.length);

    // Stop previous
    stopSpeaking();

    // For very short text (< 20 chars), use browser TTS to save API calls
    const useOpenAI = mode === "openai" || (mode === "auto" && toSpeak.length >= 20);
    
    console.log("[useTTS] Using:", useOpenAI ? "OpenAI" : "Browser");
    
    if (useOpenAI) {
      const success = await speakOpenAI(toSpeak);
      console.log("[useTTS] OpenAI result:", success);
      if (!success && mode === "auto") {
        // Fallback to browser
        console.log("[useTTS] Falling back to browser TTS");
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
