// hooks/useTTS.ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * TTS "più umano" senza costi:
 * - Selezione automatica della miglior voce IT disponibile (Google/Microsoft/macOS).
 * - Prosodia: spezza testo in frasi brevi e inserisce micro-pause.
 * - Mantiene l'API: { ttsSpeaking, lastAssistantText, setLastAssistantText, speakAssistant }.
 */
export function useTTS() {
  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[] | null>(null);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [lastAssistantText, setLastAssistantText] = useState("");
  const currentUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);

  // Scelta voce: priorità per le migliori voci IT note, poi qualsiasi it-*
  function pickBestItalianVoice(voices: SpeechSynthesisVoice[] | null | undefined): SpeechSynthesisVoice | null {
    if (!voices || voices.length === 0) return null;
    const namePri = [
      // Chrome
      "Google italiano", "Google Italiano", "Google IT",
      // macOS
      "Alice", "Luca",
      // Windows
      "Microsoft Elsa - Italian (Italy)", "Microsoft Cosimo - Italian (Italy)", "Microsoft Isabella - Italian (Italy)"
    ];
    // 1) match esatto su priorità
    for (const n of namePri) {
      const v = voices.find(v => (v.name || "").toLowerCase() === n.toLowerCase());
      if (v) return v;
    }
    // 2) qualsiasi voce con lang "it" (it-IT/it-CH ecc.)
    const anyIt = voices.find(v => (v.lang || "").toLowerCase().startsWith("it"));
    if (anyIt) return anyIt;
    // 3) fallback qualunque (meglio di niente)
    return voices[0] ?? null;
  }

  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Inizializza synth e carica voci
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis ?? null;

      const loadVoices = () => {
        if (!synthRef.current) return;
        const all = synthRef.current.getVoices?.() || [];
        voicesRef.current = all;
        bestVoiceRef.current = pickBestItalianVoice(all);
      };

      // Chrome carica le voci in ritardo → ascoltiamo l'evento
      try {
        window.speechSynthesis?.addEventListener?.("voiceschanged", loadVoices);
      } catch {}
      // e proviamo subito
      loadVoices();

      return () => {
        try { window.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices); } catch {}
        try { synthRef.current?.cancel?.(); } catch {}
        setTtsSpeaking(false);
      };
    }
  }, []);

  // Spezza testo in frasi brevi (max ~160 chars) con punteggiatura per pause naturali
  function chunkTextForProsody(raw: string): string[] {
    const text = (raw || "").replace(/\s+/g, " ").trim();
    if (!text) return [];
    // separa su . ! ? ; : e su newline
    const coarse = text.split(/([\.!?;:])\s+/).reduce<string[]>((acc, part, i, arr) => {
      if (!part) return acc;
      if (/[\.!?;:]/.test(part) && acc.length) {
        acc[acc.length - 1] = (acc[acc.length - 1] + part).trim();
      } else {
        acc.push(part.trim());
      }
      return acc;
    }, []);

    // ricompone in "bocconi" max 160 caratteri
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

  // Stop qualsiasi coda precedente
  const stopQueue = useCallback(() => {
    try { synthRef.current?.cancel?.(); } catch {}
    currentUtterancesRef.current = [];
    setTtsSpeaking(false);
  }, []);

  const speakAssistant = useCallback((text?: string) => {
    const synth = synthRef.current;
    if (!synth) return;

    const toSpeak = (text ?? lastAssistantText ?? "").trim();
    if (!toSpeak) return;

    // stop precedente
    stopQueue();

    const voice = bestVoiceRef.current; // può essere null → sistema sceglie
    const chunks = chunkTextForProsody(toSpeak);
    if (chunks.length === 0) return;

    setTtsSpeaking(true);

    // Parametri consigliati per voci di sistema (più caldo e naturale)
    const rate = 0.95;   // leggermente più lento del default
    const pitch = 1.02;  // un filo più alto (più "umano")
    const volume = 1.0;  // pieno

    // Enqueue delle frasi con micro-pause tra gli utterance
    const queueNext = (idx: number) => {
      if (!synth) { setTtsSpeaking(false); return; }
      if (idx >= chunks.length) { setTtsSpeaking(false); return; }

      const u = new SpeechSynthesisUtterance(chunks[idx]);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || "it-IT";
      u.rate = rate;
      u.pitch = pitch;
      u.volume = volume;

      u.onend = () => {
        // micro-pausa fra frasi per respirare (150–220ms)
        setTimeout(() => queueNext(idx + 1), 180);
      };
      u.onerror = () => {
        // in caso di errore, proviamo a proseguire
        setTimeout(() => queueNext(idx + 1), 0);
      };

      currentUtterancesRef.current.push(u);
      try { synth.speak(u); } catch { setTtsSpeaking(false); }
    };

    queueNext(0);
  }, [lastAssistantText, stopQueue]);

  return {
    ttsSpeaking,
    lastAssistantText,
    setLastAssistantText,
    speakAssistant,
  };
}
