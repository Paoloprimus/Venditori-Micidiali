// app/driving/page.tsx
// 🚗 Driving Mode - Versione semplificata e robusta
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCrypto } from "@/lib/crypto/CryptoProvider";

export default function DrivingModePage() {
  const router = useRouter();
  const { ready: cryptoReady } = useCrypto();
  
  // Stati principali
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [status, setStatus] = useState("Premi per parlare");
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const srRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false); // Per controllo sincrono
  
  // Cleanup completo
  const cleanup = useCallback(() => {
    console.log("[Driving] Cleanup");
    isActiveRef.current = false;
    
    // Stop speech recognition
    if (srRef.current) {
      try { srRef.current.stop(); } catch {}
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
          resolve();
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setIsSpeaking(false);
          resolve();
        };
        
        audio.play().catch(() => {
          setIsSpeaking(false);
          resolve();
        });
      });
    } catch (err) {
      console.error("[Driving] TTS error:", err);
      setIsSpeaking(false);
    }
  }, []);

  // === Speech Recognition ===
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Speech Recognition non supportato");
      return;
    }
    
    console.log("[Driving] Starting SR");
    isActiveRef.current = true;
    
    const sr = new SR();
    sr.lang = "it-IT";
    sr.interimResults = true;
    sr.continuous = true;
    sr.maxAlternatives = 1;
    
    let finalTranscript = "";
    let silenceTimer: NodeJS.Timeout | null = null;
    
    sr.onstart = () => {
      console.log("[Driving] SR started");
      setIsListening(true);
      setStatus("Ti ascolto...");
      setTranscript("");
    };
    
    sr.onresult = (e: any) => {
      let interim = "";
      finalTranscript = "";
      
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      
      const display = (finalTranscript + interim).trim();
      setTranscript(display);
      
      // Reset silence timer
      if (silenceTimer) clearTimeout(silenceTimer);
      
      // Auto-send after 2 seconds of silence (if we have final text)
      if (finalTranscript.trim()) {
        silenceTimer = setTimeout(async () => {
          if (!isActiveRef.current) return;
          
          const textToSend = finalTranscript.trim();
          console.log("[Driving] Auto-sending:", textToSend);
          
          // Stop listening while processing
          try { sr.stop(); } catch {}
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
            const response = await fetch("/api/messages/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                message: textToSend,
                conversationId: null // Will create new or use default
              }),
            });
            
            const data = await response.json();
            const aiResponse = data.reply || data.message || "Non ho capito.";
            
            setLastResponse(aiResponse);
            
            // Speak response
            await speak(aiResponse);
            
            // Restart listening if still active
            if (isActiveRef.current) {
              startListening();
            }
          } catch (err) {
            console.error("[Driving] Send error:", err);
            await speak("Si è verificato un errore.");
            if (isActiveRef.current) {
              startListening();
            }
          }
        }, 2000);
      }
    };
    
    sr.onerror = (e: any) => {
      console.error("[Driving] SR error:", e.error);
      if (e.error === "not-allowed") {
        setError("Permesso microfono negato");
        cleanup();
      } else if (e.error !== "aborted" && isActiveRef.current) {
        // Retry on other errors
        setTimeout(() => {
          if (isActiveRef.current) startListening();
        }, 500);
      }
    };
    
    sr.onend = () => {
      console.log("[Driving] SR ended");
      setIsListening(false);
      if (silenceTimer) clearTimeout(silenceTimer);
    };
    
    srRef.current = sr;
    sr.start();
  }, [cleanup, router, speak]);

  // === Toggle dialog ===
  const toggleDialog = useCallback(async () => {
    if (isActiveRef.current) {
      // Stop
      console.log("[Driving] Stopping dialog");
      cleanup();
      setStatus("Premi per parlare");
    } else {
      // Start
      console.log("[Driving] Starting dialog");
      setError(null);
      await speak("Dialogo attivo. Parla pure.");
      startListening();
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
      
      {/* Main button */}
      <button 
        style={{
          ...styles.mainBtn,
          background: isActiveRef.current 
            ? (isSpeaking ? "#2e4d1a" : "#1a4d2e")
            : "#2d3a4f",
          boxShadow: isActiveRef.current
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
      {isListening && (
        <div style={styles.hints}>
          💡 Dì "esci" o "torna" per uscire
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
