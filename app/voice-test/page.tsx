// app/voice-test/page.tsx
// Pagina diagnostica per testare microfono e Speech Recognition
"use client";

import { useState, useRef } from "react";

export default function VoiceTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const srRef = useRef<any>(null);

  const log = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Test 1: Verifica supporto API
  const testApiSupport = () => {
    log("=== TEST 1: Supporto API ===");
    
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    log(`SpeechRecognition: ${SR ? "✅ Supportato" : "❌ NON supportato"}`);
    
    log(`navigator.mediaDevices: ${navigator.mediaDevices ? "✅ Presente" : "❌ Assente"}`);
    log(`getUserMedia: ${typeof navigator.mediaDevices?.getUserMedia === "function" ? "✅ Presente" : "❌ Assente"}`);
    
    log(`isSecureContext: ${window.isSecureContext ? "✅ Sì (HTTPS)" : "❌ No (HTTP)"}`);
    
    const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent);
    log(`iOS: ${isIOS ? "⚠️ Sì (SR limitato)" : "✅ No"}`);
    
    log(`Browser: ${navigator.userAgent.slice(0, 100)}...`);
  };

  // Test 2: Permessi microfono
  const testMicPermissions = async () => {
    log("=== TEST 2: Permessi Microfono ===");
    
    try {
      // Check permission status
      if (navigator.permissions) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        log(`Permesso microfono: ${status.state}`);
      } else {
        log("⚠️ Permissions API non disponibile");
      }
      
      // Try to get microphone
      log("Richiedo accesso microfono...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log("✅ Accesso microfono CONCESSO");
      
      // Check tracks
      const tracks = stream.getAudioTracks();
      log(`Tracce audio: ${tracks.length}`);
      tracks.forEach((t, i) => log(`  Track ${i}: ${t.label}, enabled: ${t.enabled}`));
      
      // Stop tracks
      tracks.forEach(t => t.stop());
      log("Microfono rilasciato");
      
    } catch (err: any) {
      log(`❌ ERRORE: ${err.name} - ${err.message}`);
      if (err.name === "NotAllowedError") {
        log("💡 Suggerimento: Permesso negato. Controlla le impostazioni del browser.");
      } else if (err.name === "NotFoundError") {
        log("💡 Suggerimento: Nessun microfono trovato.");
      }
    }
  };

  // Test 3: Speech Recognition base
  const testBasicSR = () => {
    log("=== TEST 3: Speech Recognition Base ===");
    
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      log("❌ SpeechRecognition non supportato");
      return;
    }
    
    try {
      log("Creo istanza SpeechRecognition...");
      const sr = new SR();
      sr.lang = "it-IT";
      sr.interimResults = true;
      sr.continuous = false; // Single shot
      sr.maxAlternatives = 1;
      
      sr.onstart = () => {
        log("✅ SR avviato - PARLA ORA!");
        setIsRecording(true);
      };
      
      sr.onresult = (e: any) => {
        const result = e.results[e.results.length - 1];
        const text = result[0].transcript;
        const isFinal = result.isFinal;
        log(`Risultato (${isFinal ? "FINALE" : "interim"}): "${text}"`);
        setTranscript(text);
      };
      
      sr.onerror = (e: any) => {
        log(`❌ Errore SR: ${e.error}`);
        setIsRecording(false);
        
        if (e.error === "not-allowed") {
          log("💡 Permesso microfono negato per SR");
        } else if (e.error === "no-speech") {
          log("💡 Nessun parlato rilevato");
        } else if (e.error === "network") {
          log("💡 Errore di rete (SR usa servizi cloud)");
        }
      };
      
      sr.onend = () => {
        log("SR terminato");
        setIsRecording(false);
        srRef.current = null;
      };
      
      srRef.current = sr;
      log("Avvio sr.start()...");
      sr.start();
      log("sr.start() chiamato");
      
    } catch (err: any) {
      log(`❌ Eccezione: ${err.message}`);
      setIsRecording(false);
    }
  };

  // Stop SR
  const stopSR = () => {
    if (srRef.current) {
      srRef.current.stop();
      log("SR fermato manualmente");
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    setTranscript("");
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto", fontFamily: "monospace" }}>
      <h1>🎤 Test Diagnostica Voce</h1>
      
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <button 
          onClick={testApiSupport}
          style={{ padding: "10px 20px", fontSize: 16, cursor: "pointer" }}
        >
          1️⃣ Test API
        </button>
        
        <button 
          onClick={testMicPermissions}
          style={{ padding: "10px 20px", fontSize: 16, cursor: "pointer" }}
        >
          2️⃣ Test Permessi Mic
        </button>
        
        <button 
          onClick={testBasicSR}
          disabled={isRecording}
          style={{ 
            padding: "10px 20px", 
            fontSize: 16, 
            cursor: isRecording ? "not-allowed" : "pointer",
            background: isRecording ? "#ccc" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 4,
          }}
        >
          3️⃣ {isRecording ? "🔴 In ascolto..." : "Test SR (parla)"}
        </button>
        
        {isRecording && (
          <button 
            onClick={stopSR}
            style={{ padding: "10px 20px", fontSize: 16, background: "#f44336", color: "white", border: "none", borderRadius: 4 }}
          >
            ⏹️ Stop
          </button>
        )}
        
        <button 
          onClick={clearLogs}
          style={{ padding: "10px 20px", fontSize: 16, cursor: "pointer" }}
        >
          🗑️ Pulisci
        </button>
      </div>
      
      {transcript && (
        <div style={{ 
          padding: 15, 
          background: "#e8f5e9", 
          borderRadius: 8, 
          marginBottom: 20,
          fontSize: 18,
        }}>
          <strong>Trascritto:</strong> {transcript}
        </div>
      )}
      
      <div style={{ 
        background: "#1a1a2e", 
        color: "#00ff88", 
        padding: 15, 
        borderRadius: 8,
        height: 400,
        overflow: "auto",
        fontSize: 13,
        lineHeight: 1.6,
      }}>
        {logs.length === 0 ? (
          <div style={{ color: "#666" }}>
            Premi i bottoni in ordine per diagnosticare...
            <br/><br/>
            1. Test API - verifica supporto browser
            <br/>
            2. Test Permessi - verifica accesso microfono
            <br/>
            3. Test SR - prova riconoscimento vocale
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ 
              borderBottom: log.includes("===") ? "1px solid #333" : "none",
              paddingBottom: log.includes("===") ? 5 : 0,
              marginBottom: log.includes("===") ? 10 : 2,
              color: log.includes("❌") ? "#ff5555" : log.includes("✅") ? "#00ff88" : log.includes("⚠️") ? "#ffaa00" : "#ccc",
            }}>
              {log}
            </div>
          ))
        )}
      </div>
      
      <div style={{ marginTop: 20, fontSize: 12, color: "#666" }}>
        <p><strong>Requisiti:</strong></p>
        <ul>
          <li>HTTPS o localhost (secure context)</li>
          <li>Browser: Chrome, Edge, Safari (non Firefox)</li>
          <li>Permesso microfono concesso</li>
          <li>Non iOS Safari (SR molto limitato)</li>
        </ul>
      </div>
    </div>
  );
}

