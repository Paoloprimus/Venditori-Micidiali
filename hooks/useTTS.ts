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
  
  // Cache per evitare chiamate ripetute (cache blob, non URL)
  const cacheRef = useRef<Map<string, Blob>>(new Map());
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

  // ===== Unlock audio (richiesto per autoplay Chrome) =====
  const audioUnlockedRef = useRef(false);
  
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    
    try {
      // Crea AudioContext se non esiste
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      
      // Riproduci suono silente per sbloccare
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0; // Silenzioso
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(0);
      oscillator.stop(0.001);
      
      // Resume context se sospeso
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      audioUnlockedRef.current = true;
      console.log('[useTTS] Audio unlocked for autoplay');
    } catch (e) {
      console.warn('[useTTS] Failed to unlock audio:', e);
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
      
      // Check cache first (cache blob, create fresh URL each time)
      const cacheKey = text.slice(0, 200);
      let blob = cacheRef.current.get(cacheKey);
      
      if (!blob) {
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
        
        blob = await response.blob();
        console.log("[useTTS] Received audio blob:", blob.size, "bytes");
        
        // Cache management (cache the blob, not the URL)
        if (cacheRef.current.size >= MAX_CACHE_SIZE) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey) {
            cacheRef.current.delete(firstKey);
          }
        }
        cacheRef.current.set(cacheKey, blob);
      } else {
        console.log("[useTTS] Using cached blob");
      }
      
      // Create fresh URL from blob each time (fixes reuse issues)
      const audioUrl = URL.createObjectURL(blob);
      
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
          // Revoke URL after playback to free memory
          URL.revokeObjectURL(audioUrl);
          resolve(true);
        };
        
        audio.onerror = (e) => {
          console.error("[useTTS] Audio error:", e);
          setTtsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve(false);
        };
        
        // Sblocca audio prima del play (Chrome autoplay policy)
        unlockAudio();
        
        console.log("[useTTS] Attempting to play audio...");
        audio.play().then(() => {
          console.log("[useTTS] Play started successfully");
        }).catch((err) => {
          console.error("[useTTS] Play failed (autoplay blocked?):", err);
          setTtsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve(false);
        });
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("[useTTS] Request aborted");
        return false;
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

    // Usa sempre OpenAI per qualità migliore (voce italiana più naturale)
    // NO FALLBACK al browser TTS (ha accento inglese su Chrome)
    console.log("[useTTS] Using OpenAI TTS (no browser fallback)");
    
    const success = await speakOpenAI(toSpeak);
    console.log("[useTTS] OpenAI result:", success);
    
    if (!success) {
      console.error("[useTTS] ⚠️ OpenAI TTS failed - NOT falling back to browser");
      // NON fare fallback al browser, la voce è peggiore
    }
  }, [lastAssistantText, mode, stopSpeaking]);

  return {
    ttsSpeaking,
    lastAssistantText,
    setLastAssistantText,
    speakAssistant,
    stopSpeaking,
    unlockAudio, // 🔓 Chiamare al primo click per sbloccare autoplay
  };
}
