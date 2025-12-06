// app/driving/page.tsx
// 🚗 Driving Mode - Versione corretta con conversationId e state management
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCrypto } from "@/lib/crypto/CryptoProvider";
import { checkBrowserVoiceSupport, type BrowserVoiceSupport } from "@/hooks/useVoice";

export default function DrivingModePage() {
  const router = useRouter();
  const { ready: cryptoReady } = useCrypto();
  
  // Stati principali
  const [isActive, setIsActive] = useState(false); // Per UI/re-render
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [status, setStatus] = useState("Premi per parlare");
  const [error, setError] = useState<string | null>(null);
  const [browserSupport, setBrowserSupport] = useState<BrowserVoiceSupport | null>(null);
  
  // Refs per controllo sincrono (evita race conditions)
  const srRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>("");
  
  // Cleanup completo
  const cleanup = useCallback(() => {
    console.log("[Driving] Cleanup");
    isActiveRef.current = false;
    setIsActive(false);
    
    // Clear silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Stop speech recognition
    if (srRef.current) {
      try { 
        srRef.current.onresult = null;
        srRef.current.onend = null;
        srRef.current.onerror = null;
        srRef.current.stop(); 
      } catch {}
      srRef.current = null;
    }
    
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    
    setIsListening(false);
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Check browser support on mount
  useEffect(() => {
    const support = checkBrowserVoiceSupport();
    setBrowserSupport(support);
    
    if (support.overallSupport === 'none') {
      setError(support.issues.join('. ') + '. ' + support.recommendations.join('. '));
    }
  }, []);

  // === Crea conversazione per la sessione ===
  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (conversationIdRef.current) {
      return conversationIdRef.current;
    }
    
    try {
      const res = await fetch("/api/conversations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Sessione Guida " + new Date().toLocaleTimeString("it-IT") }),
      });
      
      const data = await res.json();
      if (data.ok && data.conversation?.id) {
        conversationIdRef.current = data.conversation.id;
        console.log("[Driving] Conversation created:", data.conversation.id);
        return data.conversation.id;
      } else {
        console.error("[Driving] Failed to create conversation:", data);
        return null;
      }
    } catch (err) {
      console.error("[Driving] Error creating conversation:", err);
      return null;
    }
  }, []);

  // === TTS con OpenAI ===
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;
    
    console.log("[Driving] Speaking:", text.slice(0, 50));
    setIsSpeaking(true);
    setStatus("Rispondo...");
    
    try {
      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) throw new Error("TTS failed");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setIsSpeaking(false);
          audioRef.current = null;
          resolve();
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setIsSpeaking(false);
          audioRef.current = null;
          resolve();
        };
        
        audio.play().catch(() => {
          URL.revokeObjectURL(url);
          setIsSpeaking(false);
          audioRef.current = null;
          resolve();
        });
      });
    } catch (err) {
      console.error("[Driving] TTS error:", err);
      setIsSpeaking(false);
    }
  }, []);

  // === Invia messaggio all'AI ===
  const sendToAI = useCallback(async (text: string): Promise<string> => {
    const conversationId = await ensureConversation();
    if (!conversationId) {
      throw new Error("Impossibile creare la sessione");
    }
    
    console.log("[Driving] Sending to AI:", text);
    
    const response = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        content: text, // ⚠️ API usa "content", non "message"
        conversationId: conversationId
      }),
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.reply || data.message || "Non ho capito.";
  }, [ensureConversation]);

  // === Speech Recognition ===
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Speech Recognition non supportato");
      return;
    }
    
    // Se già in ascolto o TTS attivo, skip
    if (srRef.current || isSpeaking) {
      console.log("[Driving] SR already active or TTS speaking, skipping");
      return;
    }
    
    console.log("[Driving] Starting SR");
    
    const sr = new SR();
    sr.lang = "it-IT";
    sr.interimResults = true;
    sr.continuous = true;
    sr.maxAlternatives = 1;
    
    // Reset transcript ref (non nel loop!)
    finalTranscriptRef.current = "";
    
    sr.onstart = () => {
      console.log("[Driving] SR started");
      setIsListening(true);
      setStatus("Ti ascolto...");
      setTranscript("");
    };
    
    sr.onresult = (e: any) => {
      if (!isActiveRef.current) return;
      
      let interim = "";
      let newFinals = "";
      
      // Processa solo i nuovi risultati (da resultIndex in poi)
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0].transcript;
        
        if (result.isFinal) {
          newFinals += text + " ";
        } else {
          interim += text;
        }
      }
      
      // Accumula i final
      if (newFinals.trim()) {
        finalTranscriptRef.current = (finalTranscriptRef.current + " " + newFinals).trim();
      }
      
      // Display: accumulated finals + current interim
      const display = (finalTranscriptRef.current + " " + interim).trim();
      setTranscript(display);
      
      // Reset silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      // Auto-send after 2 seconds of silence (if we have final text)
      if (finalTranscriptRef.current.trim()) {
        silenceTimerRef.current = setTimeout(async () => {
          if (!isActiveRef.current) return;
          
          const textToSend = finalTranscriptRef.current.trim();
          if (!textToSend) return;
          
          console.log("[Driving] Auto-sending after silence:", textToSend);
          
          // Stop listening while processing
          try { sr.stop(); } catch {}
          srRef.current = null;
          setIsListening(false);
          setStatus("Elaboro...");
          
          // Check for exit commands
          if (/^(esci|torna|chiudi|basta|stop)\b/i.test(textToSend)) {
            await speak("Ok, torno alla home.");
            cleanup();
            router.push("/");
            return;
          }
          
          // Send to AI
          try {
            const aiResponse = await sendToAI(textToSend);
            setLastResponse(aiResponse);
            
            // Speak response
            await speak(aiResponse);
            
            // Restart listening if still active
            if (isActiveRef.current) {
              console.log("[Driving] Restarting SR after response");
              // Small delay before restart
              setTimeout(() => {
                if (isActiveRef.current) {
                  startListeningInternal();
                }
              }, 300);
            }
          } catch (err: any) {
            console.error("[Driving] Send error:", err);
            setError(err.message || "Errore comunicazione");
            await speak("Si è verificato un errore. " + (err.message || ""));
            
            // Restart listening anyway
            if (isActiveRef.current) {
              setTimeout(() => {
                if (isActiveRef.current) {
                  startListeningInternal();
                }
              }, 500);
            }
          }
        }, 2000); // 2 secondi di silenzio
      }
    };
    
    sr.onerror = (e: any) => {
      console.error("[Driving] SR error:", e.error);
      
      if (e.error === "not-allowed") {
        setError("Permesso microfono negato. Consenti l'accesso nelle impostazioni del browser.");
        cleanup();
        return;
      }
      
      if (e.error === "aborted") {
        // Aborted è normale durante stop, ignora
        return;
      }
      
      // Altri errori: prova a riavviare
      if (isActiveRef.current) {
        srRef.current = null;
        setTimeout(() => {
          if (isActiveRef.current) {
            startListeningInternal();
          }
        }, 500);
      }
    };
    
    sr.onend = () => {
      console.log("[Driving] SR ended");
      setIsListening(false);
      srRef.current = null;
      
      // Clear timer on end
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
    
    srRef.current = sr;
    
    try {
      sr.start();
    } catch (err) {
      console.error("[Driving] SR start error:", err);
      srRef.current = null;
      
      // Retry after delay
      if (isActiveRef.current) {
        setTimeout(() => {
          if (isActiveRef.current) {
            startListeningInternal();
          }
        }, 500);
      }
    }
  }, [cleanup, router, speak, sendToAI, isSpeaking]);

  // Internal version to avoid closure issues with recursive calls
  const startListeningInternal = useCallback(() => {
    startListening();
  }, [startListening]);

  // === Toggle dialog ===
  const toggleDialog = useCallback(async () => {
    if (isActiveRef.current) {
      // Stop
      console.log("[Driving] Stopping dialog");
      cleanup();
      setStatus("Premi per parlare");
      setTranscript("");
    } else {
      // Start
      console.log("[Driving] Starting dialog");
      setError(null);
      isActiveRef.current = true;
      setIsActive(true);
      
      // Welcome message
      await speak("Dialogo attivo. Parla pure.");
      
      // Start listening after TTS
      if (isActiveRef.current) {
        startListening();
      }
    }
  }, [cleanup, speak, startListening]);

  // === Exit ===
  const handleExit = useCallback(() => {
    cleanup();
    router.push("/");
  }, [cleanup, router]);

  // Crypto check
  if (!cryptoReady) {
    return (
      <div style={styles.container}>
        <div style={styles.status}>🔐 Sblocca prima la passphrase</div>
        <button style={styles.exitBtn} onClick={() => router.push("/")}>
          Torna alla Home
        </button>
      </div>
    );
  }

  // Browser compatibility check
  if (browserSupport?.overallSupport === 'none') {
    return (
      <div style={styles.container}>
        <div style={styles.status}>⚠️ Browser non compatibile</div>
        <div style={styles.error}>
          {browserSupport.issues.map((issue, i) => (
            <div key={i}>• {issue}</div>
          ))}
          <br />
          <strong>Suggerimenti:</strong>
          {browserSupport.recommendations.map((rec, i) => (
            <div key={i}>• {rec}</div>
          ))}
        </div>
        <button style={styles.exitBtn} onClick={() => router.push("/")}>
          Torna alla Home
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Exit button */}
      <button style={styles.exitBtn} onClick={handleExit}>✕</button>
      
      {/* Error */}
      {error && (
        <div style={styles.error}>{error}</div>
      )}
      
      {/* Status */}
      <div style={{
        ...styles.status,
        color: isSpeaking ? "#00ff88" : isListening ? "#4a9eff" : "#8899aa"
      }}>
        {status}
      </div>
      
      {/* Transcript */}
      {transcript && (
        <div style={styles.transcript}>
          🎤 {transcript}
        </div>
      )}
      
      {/* Last response */}
      {lastResponse && !transcript && (
        <div style={styles.response}>
          {lastResponse.slice(0, 200)}{lastResponse.length > 200 ? "..." : ""}
        </div>
      )}
      
      {/* Main button - usa isActive (state) per re-render corretto */}
      <button 
        style={{
          ...styles.mainBtn,
          background: isActive 
            ? (isSpeaking ? "#2e4d1a" : "#1a4d2e")
            : "#2d3a4f",
          boxShadow: isActive
            ? "0 0 60px rgba(0, 255, 136, 0.3)"
            : "0 10px 40px rgba(0,0,0,0.4)",
        }}
        onClick={toggleDialog}
        disabled={isSpeaking}
      >
        <span style={{ fontSize: "4rem" }}>
          {isSpeaking ? "🔊" : isListening ? "🎤" : "🎙️"}
        </span>
        <span style={{ fontSize: "1.5rem", fontWeight: 600, color: "#fff" }}>
          {isSpeaking ? "Rispondo..." : isListening ? "Ascolto" : "Parla"}
        </span>
      </button>
      
      {/* Hints */}
      {isActive && (
        <div style={styles.hints}>
          💡 Dì "esci" o "basta" per uscire
        </div>
      )}
      
      {/* Debug info (rimuovi in produzione) */}
      {process.env.NODE_ENV === "development" && (
        <div style={{ position: "absolute", bottom: 60, fontSize: 10, color: "#666" }}>
          Conv: {conversationIdRef.current?.slice(0, 8) || "none"} | 
          Active: {isActive ? "Y" : "N"} | 
          Listening: {isListening ? "Y" : "N"} | 
          Speaking: {isSpeaking ? "Y" : "N"}
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2rem",
    padding: "2rem",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#ffffff",
  },
  exitBtn: {
    position: "absolute",
    top: "1.5rem",
    left: "1.5rem",
    width: 60,
    height: 60,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    fontSize: "1.5rem",
    cursor: "pointer",
  },
  status: {
    fontSize: "2rem",
    fontWeight: 600,
    textAlign: "center",
  },
  error: {
    background: "rgba(255,0,0,0.2)",
    color: "#ff5555",
    padding: "1rem",
    borderRadius: "0.5rem",
    maxWidth: "90%",
    textAlign: "center",
  },
  transcript: {
    background: "rgba(74, 158, 255, 0.2)",
    padding: "1rem 1.5rem",
    borderRadius: "1rem",
    maxWidth: "90%",
    fontSize: "1.25rem",
    textAlign: "center",
  },
  response: {
    background: "rgba(0, 255, 136, 0.1)",
    padding: "1rem 1.5rem",
    borderRadius: "1rem",
    maxWidth: "90%",
    fontSize: "1.1rem",
    textAlign: "center",
    color: "#c0d0e0",
  },
  mainBtn: {
    width: "min(280px, 70vw)",
    height: "min(280px, 70vw)",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    transition: "all 0.3s ease",
  },
  hints: {
    position: "absolute",
    bottom: "2rem",
    fontSize: "1.1rem",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
};
