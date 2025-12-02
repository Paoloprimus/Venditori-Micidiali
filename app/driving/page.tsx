// app/driving/page.tsx
// 🚗 Driving Mode - UI ottimizzata per uso in auto
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";
import { useTTS } from "@/hooks/useTTS";
import { useVoice } from "@/hooks/useVoice";
import { useCrypto } from "@/lib/crypto/CryptoProvider";
import { stripMarkdownForTTS } from "@/lib/chat/utils";

export default function DrivingModePage() {
  const router = useRouter();
  const { ready: cryptoReady } = useCrypto();
  
  // TTS
  const { ttsSpeaking, lastAssistantText, setLastAssistantText, speakAssistant } = useTTS();
  const ttsSpeakingRef = useRef(false);
  useEffect(() => { ttsSpeakingRef.current = ttsSpeaking; }, [ttsSpeaking]);
  const isTtsSpeakingFn = useCallback(() => ttsSpeakingRef.current, []);

  // Conversazioni
  const conv = useConversations({
    onAssistantReply: (text) => { setLastAssistantText(text); },
  });

  // Voice
  const voice = useVoice({
    onTranscriptionToInput: () => {},
    onSendDirectly: async (text) => {
      const raw = (text || "").trim();
      if (!raw) return;
      await conv.send(raw);
    },
    onSpeak: (text) => speakAssistant(text),
    createNewSession: async (titleAuto: string) => {
      try { 
        await conv.createConversation(titleAuto); 
        return conv.currentConv; 
      } catch { 
        return null; 
      }
    },
    autoTitleRome: () => {
      const d = new Date();
      return `Guida ${d.toLocaleDateString('it-IT')} ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    },
    isTtsSpeaking: isTtsSpeakingFn,
  });

  // Traccia ultima risposta per "ripeti"
  useEffect(() => {
    if (!lastAssistantText) return;
    voice.setLastAssistantResponse(stripMarkdownForTTS(lastAssistantText));
    if (voice.speakerEnabled) speakAssistant(lastAssistantText);
  }, [lastAssistantText, voice.speakerEnabled, speakAssistant, voice]);

  // Status message
  const [statusMessage, setStatusMessage] = useState("Premi il bottone per parlare");
  
  useEffect(() => {
    if (!voice.voiceMode) {
      setStatusMessage("Premi il bottone per parlare");
    } else if (ttsSpeaking) {
      setStatusMessage("Sto rispondendo...");
    } else if (voice.isRecording) {
      setStatusMessage("Ti ascolto...");
    } else {
      setStatusMessage("In attesa...");
    }
  }, [voice.voiceMode, voice.isRecording, ttsSpeaking]);

  // Waveform animation
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!voice.isRecording) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Draw flat line when not recording
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = '#4a9eff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, canvas.height / 2);
          ctx.lineTo(canvas.width, canvas.height / 2);
          ctx.stroke();
        }
      }
      return;
    }

    // Get audio stream for visualization
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function draw() {
        if (!analyzerRef.current || !canvas || !ctx) return;
        animationRef.current = requestAnimationFrame(draw);

        analyzerRef.current.getByteTimeDomainData(dataArray);

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 4;
        ctx.strokeStyle = voice.isRecording ? '#00ff88' : '#4a9eff';
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }

      draw();

      return () => {
        stream.getTracks().forEach(t => t.stop());
        audioContext.close();
      };
    }).catch(() => {});

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [voice.isRecording]);

  // Toggle dialog mode
  const handleMainButton = useCallback(() => {
    if (voice.voiceMode) {
      voice.stopDialog();
    } else {
      voice.startDialog();
    }
  }, [voice]);

  // Exit driving mode
  const handleExit = useCallback(() => {
    voice.stopDialog();
    router.push('/');
  }, [voice, router]);

  // Crypto check
  if (!cryptoReady) {
    return (
      <div className="driving-container">
        <div className="driving-status">🔐 Sblocca prima la passphrase</div>
        <button className="driving-exit" onClick={() => router.push('/')}>
          Torna alla Home
        </button>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="driving-container">
      {/* Exit button - top left */}
      <button className="driving-exit" onClick={handleExit}>
        ✕
      </button>

      {/* Status */}
      <div className={`driving-status ${ttsSpeaking ? 'speaking' : ''}`}>
        {statusMessage}
      </div>

      {/* Last response preview */}
      {lastAssistantText && (
        <div className="driving-response">
          {stripMarkdownForTTS(lastAssistantText).slice(0, 150)}
          {lastAssistantText.length > 150 ? '...' : ''}
        </div>
      )}

      {/* Waveform */}
      <canvas 
        ref={canvasRef} 
        className="driving-waveform"
        width={600}
        height={120}
      />

      {/* Main button */}
      <button 
        className={`driving-main-button ${voice.voiceMode ? 'active' : ''} ${ttsSpeaking ? 'speaking' : ''}`}
        onClick={handleMainButton}
      >
        <span className="button-icon">
          {voice.voiceMode ? (ttsSpeaking ? '🔊' : '🎤') : '🎙️'}
        </span>
        <span className="button-text">
          {voice.voiceMode ? (ttsSpeaking ? 'Rispondo...' : 'Ascolto') : 'Parla'}
        </span>
      </button>

      {/* Quick commands hint */}
      {voice.voiceMode && !ttsSpeaking && (
        <div className="driving-hints">
          💡 "Ripeti" • "Aspetta" • "Basta"
        </div>
      )}

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .driving-container {
    position: fixed;
    inset: 0;
    background: linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #ffffff;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
  }

  .driving-exit {
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    background: rgba(255,255,255,0.1);
    color: #fff;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .driving-exit:hover {
    background: rgba(255,255,255,0.2);
    border-color: rgba(255,255,255,0.5);
  }

  .driving-status {
    font-size: 2rem;
    font-weight: 600;
    text-align: center;
    color: #8899aa;
    transition: color 0.3s;
  }
  .driving-status.speaking {
    color: #00ff88;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .driving-response {
    max-width: 90%;
    padding: 1rem 1.5rem;
    background: rgba(74, 158, 255, 0.15);
    border-radius: 1rem;
    font-size: 1.25rem;
    line-height: 1.5;
    text-align: center;
    color: #c0d0e0;
    border: 1px solid rgba(74, 158, 255, 0.3);
  }

  .driving-waveform {
    width: min(90vw, 600px);
    height: 120px;
    border-radius: 1rem;
    background: #1a1a2e;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }

  .driving-main-button {
    width: min(280px, 70vw);
    height: min(280px, 70vw);
    border-radius: 50%;
    border: none;
    background: linear-gradient(145deg, #2d3a4f, #1e2738);
    box-shadow: 
      0 10px 40px rgba(0,0,0,0.4),
      inset 0 2px 0 rgba(255,255,255,0.1);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.3s ease;
    touch-action: manipulation;
  }

  .driving-main-button:hover {
    transform: scale(1.02);
  }

  .driving-main-button:active {
    transform: scale(0.98);
  }

  .driving-main-button.active {
    background: linear-gradient(145deg, #1a4d2e, #0d3320);
    box-shadow: 
      0 0 60px rgba(0, 255, 136, 0.3),
      inset 0 2px 0 rgba(255,255,255,0.1);
    animation: glow 2s ease-in-out infinite;
  }

  .driving-main-button.speaking {
    background: linear-gradient(145deg, #2e4d1a, #1a3d0d);
    animation: speakGlow 0.8s ease-in-out infinite;
  }

  @keyframes glow {
    0%, 100% { box-shadow: 0 0 40px rgba(0, 255, 136, 0.2); }
    50% { box-shadow: 0 0 80px rgba(0, 255, 136, 0.4); }
  }

  @keyframes speakGlow {
    0%, 100% { box-shadow: 0 0 40px rgba(255, 200, 0, 0.3); }
    50% { box-shadow: 0 0 60px rgba(255, 200, 0, 0.5); }
  }

  .button-icon {
    font-size: 4rem;
  }

  .button-text {
    font-size: 1.5rem;
    font-weight: 600;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .driving-hints {
    position: absolute;
    bottom: 2rem;
    font-size: 1.1rem;
    color: rgba(255,255,255,0.5);
    text-align: center;
  }

  /* Landscape optimization */
  @media (orientation: landscape) and (max-height: 500px) {
    .driving-container {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem;
    }
    .driving-status {
      font-size: 1.5rem;
      width: 100%;
    }
    .driving-response {
      display: none;
    }
    .driving-waveform {
      width: 40%;
      height: 80px;
    }
    .driving-main-button {
      width: 150px;
      height: 150px;
    }
    .button-icon {
      font-size: 2.5rem;
    }
    .button-text {
      font-size: 1rem;
    }
    .driving-hints {
      position: static;
      width: 100%;
    }
  }
`;

