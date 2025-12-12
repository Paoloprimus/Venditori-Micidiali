// app/site/page.tsx
// Landing Page REPING 

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Logo Component - Design moderno
function RepingLogo({ size = "md", light = false }: { size?: "sm" | "md" | "lg"; light?: boolean }) {
  const sizes = { sm: 32, md: 40, lg: 56 };
  const s = sizes[size];
  const textColor = light ? "text-white" : "text-slate-900";
  const textSize = size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-lg";
  
  return (
    <div className="flex items-center gap-2">
      {/* Logo Icon - Stylized "R" with AI wave */}
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#logoGrad)" />
        <path 
          d="M14 34V14h10c4.5 0 7 2.5 7 6 0 2.5-1.5 4.5-4 5.5L32 34h-5l-4-8h-4v8h-5zm5-12h4c2 0 3-1 3-2.5S25 17 23 17h-4v5z" 
          fill="white"
        />
        <circle cx="34" cy="14" r="4" fill="#22C55E" className="animate-pulse" />
      </svg>
      <span className={`font-bold ${textSize} ${textColor}`}>REPING</span>
    </div>
  );
}

// Animated Demo Presentation - iPhone Style
function AnimatedMockup() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scene, setScene] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [isFading, setIsFading] = useState(false);

  // Scene definitions
  const scenes = [
    { id: "dashboard", duration: 4000 },
    { id: "click-chat", duration: 2000 },
    { id: "user-question", duration: 5000 },
    { id: "ai-plan", duration: 10000 },
    { id: "fade1", duration: 1500 },
    { id: "visit-dictation", duration: 8000 },
    { id: "fade2", duration: 1500 },
    { id: "daily-report", duration: 6000 },
    { id: "claim", duration: 6000 },
  ];

  // Text-to-Speech with better voice selection
  const speak = (text: string, isMale: boolean = false) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it-IT";
    utterance.rate = 0.92; // Leggermente più lento per naturalezza
    utterance.volume = 0.9;
    
    // Cerca le voci migliori disponibili
    const voices = window.speechSynthesis.getVoices();
    
    // Voci italiane di qualità (in ordine di preferenza)
    const preferredMaleVoices = ["Luca", "Google italiano", "Microsoft Cosimo", "Diego"];
    const preferredFemaleVoices = ["Alice", "Federica", "Elsa", "Google italiano", "Microsoft Elsa"];
    
    const italianVoices = voices.filter(v => 
      v.lang.startsWith("it") || v.lang === "it-IT"
    );
    
    let selectedVoice = null;
    const preferred = isMale ? preferredMaleVoices : preferredFemaleVoices;
    
    // Cerca la voce preferita
    for (const name of preferred) {
      selectedVoice = italianVoices.find(v => 
        v.name.toLowerCase().includes(name.toLowerCase())
      );
      if (selectedVoice) break;
    }
    
    // Fallback: qualsiasi voce italiana
    if (!selectedVoice && italianVoices.length > 0) {
      selectedVoice = italianVoices[isMale ? 0 : Math.min(1, italianVoices.length - 1)];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      // Non alterare pitch se abbiamo una voce specifica
      utterance.pitch = 1.0;
    } else {
      // Fallback con pitch per simulare genere
      utterance.pitch = isMale ? 0.85 : 1.15;
    }
    
    window.speechSynthesis.speak(utterance);
  };
  
  // Precarica voci (necessario su alcuni browser)
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Typing animation
  const typeText = (fullText: string, duration: number) => {
    setTypingText("");
    const chars = fullText.split("");
    const interval = duration / chars.length;
    chars.forEach((char, i) => {
      setTimeout(() => {
        setTypingText(prev => prev + char);
      }, i * interval);
    });
  };

  // Stop
  const stopPresentation = () => {
    setIsPlaying(false);
    setScene(0);
    setSubStep(0);
    setTypingText("");
    setIsFading(false);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Start
  const startPresentation = () => {
    setIsPlaying(true);
    setScene(0);
    setSubStep(0);
    setTypingText("");
  };

  // Scene-specific actions
  useEffect(() => {
    if (!isPlaying) return;
    
    const sceneId = scenes[scene]?.id;
    
    // Scene 2: User asks question
    if (sceneId === "user-question" && subStep === 0) {
      typeText("Qual è il programma di oggi?", 2500);
      setTimeout(() => speak("Qual è il programma di oggi?", true), 500);
    }
    
    // Scene 3: AI responds with plan
    if (sceneId === "ai-plan" && subStep === 0) {
      setTimeout(() => {
        speak("Oggi hai 5 visite programmate. Prima tappa: Bar Roma alle 9. Poi Pizzeria Napoli, Hotel Centrale, Enoteca Verdi e Ristorante Milano. Percorso ottimizzato: 38 chilometri. Consiglio: Bar Roma non ordina da 45 giorni, proponi la nuova linea aperitivi. Vuoi che avviamo le attività?");
      }, 800);
    }
    
    // Scene 4: Fade
    if (sceneId === "fade1") {
      setIsFading(true);
      setTimeout(() => setIsFading(false), 1000);
    }
    
    // Scene 5: Visit dictation
    if (sceneId === "visit-dictation" && subStep === 0) {
      setTypingText("");
      setTimeout(() => {
        speak("210 euro di fatturato. Note: non è contento della qualità dei sandwich.", true);
        typeText("210€ ordine • Note: non contento qualità sandwich", 4000);
      }, 1000);
    }
    
    // Scene 6: Fade
    if (sceneId === "fade2") {
      setIsFading(true);
      setTimeout(() => setIsFading(false), 1000);
    }
    
    // Scene 7: Daily report
    if (sceneId === "daily-report" && subStep === 0) {
      setTimeout(() => {
        speak("Ottima giornata! Hai completato 5 visite su 5. Fatturato totale: 1.850 euro. Hai superato il target del 12%. Report inviato.");
      }, 800);
    }
    
    // Scene 8: Claim
    if (sceneId === "claim" && subStep === 0) {
      setTimeout(() => {
        speak("REPING. La tua giornata migliore, ogni giorno. Incremento fatturato previsto: più 24%. ROI: 5,5 volte.");
      }, 800);
    }
  }, [isPlaying, scene, subStep]);

  // Scene progression
  useEffect(() => {
    if (!isPlaying) return;
    
    const currentScene = scenes[scene];
    if (!currentScene) {
      stopPresentation();
      return;
    }

    const timer = setTimeout(() => {
      if (scene < scenes.length - 1) {
        setScene(s => s + 1);
        setSubStep(0);
        setTypingText("");
      } else {
        setTimeout(() => stopPresentation(), 2000);
      }
    }, currentScene.duration);

    return () => clearTimeout(timer);
  }, [isPlaying, scene]);

  // Sub-steps
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => setSubStep(s => s + 1), 1200);
    return () => clearInterval(timer);
  }, [isPlaying, scene]);

  const currentSceneId = scenes[scene]?.id || "dashboard";

  return (
    <div className="relative">
      {/* iPhone Frame */}
      <div className="relative mx-auto" style={{ width: "280px" }}>
        {/* iPhone outer shell */}
        <div className="bg-slate-800 rounded-[3rem] p-2 shadow-2xl border-4 border-slate-700">
          {/* iPhone inner bezel */}
          <div className="bg-black rounded-[2.5rem] overflow-hidden relative">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-700"></div>
            </div>
            
            {/* Screen content */}
            <div className={`min-h-[480px] bg-slate-900 relative transition-opacity duration-500 ${isFading ? "opacity-0" : "opacity-100"}`}>
              
              {/* Status bar */}
              <div className="pt-8 px-6 pb-2 flex justify-between items-center text-xs text-white">
                <span>9:41</span>
                <div className="flex gap-1 items-center">
                  {isPlaying && <span className="text-red-400 animate-pulse text-[10px]">●REC</span>}
                  <span>📶</span>
                  <span>🔋</span>
                </div>
              </div>

              {/* Scene 0: Dashboard */}
              {currentSceneId === "dashboard" && (
                <div className="px-4 animate-fadeIn">
                  <p className="text-white text-lg font-semibold mb-1">Buongiorno, Paolo!</p>
                  <p className="text-slate-400 text-xs mb-4">Mercoledì 4 Dicembre</p>
                  
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-blue-600/20 p-2 rounded-xl text-center border border-blue-500/30">
                      <div className="text-xl font-bold text-white">5</div>
                      <div className="text-[10px] text-slate-400">Visite</div>
                    </div>
                    <div className="bg-green-600/20 p-2 rounded-xl text-center border border-green-500/30">
                      <div className="text-xl font-bold text-white">€1.8k</div>
                      <div className="text-[10px] text-slate-400">Target</div>
                    </div>
                    <div className="bg-purple-600/20 p-2 rounded-xl text-center border border-purple-500/30">
                      <div className="text-xl font-bold text-white">38km</div>
                      <div className="text-[10px] text-slate-400">Percorso</div>
                    </div>
                  </div>

                  <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-3 mb-4">
                    <p className="text-amber-300 text-xs font-medium">⚠️ Promemoria</p>
                    <p className="text-white text-sm">Bar Roma: non ordina da 45gg</p>
                  </div>
                  
                  {/* Bottom nav hint */}
                  <div className="absolute bottom-16 left-0 right-0 flex justify-center">
                    <div className={`bg-blue-500 text-white px-4 py-2 rounded-full text-xs font-medium ${subStep > 1 ? "animate-pulse ring-2 ring-blue-400" : ""}`}>
                      💬 Chat con REPING
                    </div>
                  </div>
                </div>
              )}

              {/* Scene 1: Click chat transition */}
              {currentSceneId === "click-chat" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[380px]">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center animate-ping">
                    <span className="text-2xl">💬</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-4">Avvio chat...</p>
                </div>
              )}

              {/* Scene 2: User question */}
              {currentSceneId === "user-question" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">💬</span>
                    <span className="text-white font-medium">Chat</span>
                    <div className="ml-auto bg-green-500/20 px-2 py-0.5 rounded-full">
                      <span className="text-green-400 text-[10px]">🎤 Voce attiva</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    {typingText && (
                      <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-sm text-sm ml-auto max-w-[85%] animate-slideInRight">
                        {typingText}
                        <span className="animate-pulse">|</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Input field simulation */}
                  <div className="absolute bottom-16 left-4 right-4">
                    <div className="bg-slate-800 rounded-full px-4 py-2 flex items-center gap-2 border border-slate-700">
                      <span className="text-slate-500 text-sm flex-1">{typingText || "Scrivi o parla..."}</span>
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-sm">🎤</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scene 3: AI responds with plan */}
              {currentSceneId === "ai-plan" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">💬</span>
                    <span className="text-white font-medium text-sm">Chat</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="bg-blue-600 text-white p-2 rounded-2xl rounded-br-sm text-xs ml-auto max-w-[75%]">
                      Qual è il programma di oggi?
                    </div>
                    
                    <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-sm max-w-[90%] animate-slideInLeft">
                      <p className="text-white text-xs font-medium mb-2">📋 Piano di oggi:</p>
                      <div className="space-y-1 text-[11px]">
                        {subStep > 0 && <p className="text-slate-300">• 09:00 - Bar Roma ⚠️</p>}
                        {subStep > 1 && <p className="text-slate-300">• 10:30 - Pizzeria Napoli</p>}
                        {subStep > 2 && <p className="text-slate-300">• 12:00 - Hotel Centrale</p>}
                        {subStep > 3 && <p className="text-slate-300">• 14:30 - Enoteca Verdi</p>}
                        {subStep > 4 && <p className="text-slate-300">• 16:00 - Rist. Milano</p>}
                      </div>
                      {subStep > 5 && (
                        <div className="mt-2 pt-2 border-t border-slate-700">
                          <p className="text-blue-400 text-[10px]">💡 Consiglio: proponi nuova linea aperitivi a Bar Roma</p>
                        </div>
                      )}
                      {subStep > 6 && (
                        <p className="text-green-400 text-xs mt-2 font-medium">Vuoi che avviamo le attività?</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Scene 4: Fade transition */}
              {currentSceneId === "fade1" && (
                <div className="h-[380px] bg-slate-900"></div>
              )}

              {/* Scene 5: Visit dictation */}
              {currentSceneId === "visit-dictation" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">☕</span>
                    <span className="text-white font-medium text-sm">Bar Roma</span>
                    <span className="ml-auto bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">In corso</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-slate-400 text-[10px] mb-1">💰 Ordine</p>
                      <div className="bg-slate-900 rounded-lg p-2 text-white text-lg font-bold">
                        {typingText.includes("€") ? "€210" : "€___"}
                      </div>
                    </div>
                    
                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-slate-400 text-[10px] mb-1">📝 Note visita</p>
                      <div className="bg-slate-900 rounded-lg p-2 text-slate-300 text-xs min-h-[60px]">
                        {typingText.includes("qualità") ? "Non contento qualità sandwich. Valutare cambio fornitore." : (
                          <span className="text-slate-500">Dettatura in corso...</span>
                        )}
                        {!typingText.includes("qualità") && <span className="animate-pulse">|</span>}
                      </div>
                    </div>
                    
                    {/* Voice indicator */}
                    <div className="flex justify-center">
                      <div className="bg-blue-500/20 border border-blue-500/50 rounded-full px-4 py-2 flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-blue-300 text-xs">Dettatura vocale attiva</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scene 6: Fade transition */}
              {currentSceneId === "fade2" && (
                <div className="h-[380px] bg-slate-900"></div>
              )}

              {/* Scene 7: Daily report */}
              {currentSceneId === "daily-report" && (
                <div className="px-4 animate-fadeIn">
                  <p className="text-white text-lg font-semibold mb-1">Report Giornata</p>
                  <p className="text-slate-400 text-xs mb-4">Mercoledì 4 Dicembre</p>
                  
                  <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-4 mb-4 text-center">
                    <p className="text-green-400 font-bold text-lg">✅ Obiettivo superato!</p>
                    <p className="text-white text-2xl font-bold mt-1">€1.850</p>
                    <p className="text-green-400 text-xs">+12% vs target</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800 p-3 rounded-xl text-center">
                      <div className="text-xl font-bold text-white">5/5</div>
                      <div className="text-[10px] text-slate-400">Visite completate</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-xl text-center">
                      <div className="text-xl font-bold text-white">38km</div>
                      <div className="text-[10px] text-slate-400">Percorsi</div>
                    </div>
                  </div>
                  
                  {subStep > 2 && (
                    <div className="mt-4 bg-blue-500/20 border border-blue-500/40 rounded-xl p-3 text-center animate-fadeIn">
                      <p className="text-blue-300 text-xs">📤 Report inviato automaticamente</p>
                    </div>
                  )}
                </div>
              )}

              {/* Scene 8: Claim */}
              {currentSceneId === "claim" && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center animate-fadeIn rounded-[2.5rem]">
                  <div className="text-center px-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">🚀</span>
                    </div>
                    <p className="text-white/80 text-sm mb-1">REPING</p>
                    <p className="text-white text-xl font-bold leading-tight">
                      La tua giornata migliore,
                      <br />ogni giorno.
                    </p>
                    <div className="mt-4 flex gap-2 justify-center text-xs">
                      <div className="bg-white/20 px-3 py-1.5 rounded-lg">
                        <span className="text-white/70">Fatturato</span>
                        <span className="text-white font-bold ml-1">+24%</span>
                      </div>
                      <div className="bg-white/20 px-3 py-1.5 rounded-lg">
                        <span className="text-white/70">ROI</span>
                        <span className="text-white font-bold ml-1">~5,5x</span>
                      </div>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                      <span className="animate-pulse text-xs">●</span>
                      <span className="text-white text-xs font-medium">Beta disponibile</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
            </div>

            {/* Play button overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-[2.5rem]">
                <button 
                  onClick={startPresentation}
                  className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center hover:scale-110 transition shadow-lg group"
                >
                  <span className="text-white text-3xl ml-1 group-hover:scale-110 transition">▶</span>
                </button>
              </div>
            )}

            {/* Stop button */}
            {isPlaying && (
              <button 
                onClick={stopPresentation}
                className="absolute top-12 right-4 w-8 h-8 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center transition shadow-lg z-30"
                title="Ferma"
              >
                <span className="text-white text-sm font-bold">■</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress bar under phone */}
        {isPlaying && (
          <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${((scene + 1) / scenes.length) * 100}%` }}
            />
          </div>
        )}
      </div>
      
      {/* Floating badge */}
      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
        <span className="animate-pulse">●</span> AI
      </div>

      {/* Hint */}
      {!isPlaying && (
        <div className="text-center mt-6 text-slate-500 text-xs">
          🔊 Demo con voce • Clicca ▶ per avviare
        </div>
      )}
    </div>
  );
}


// Beta Banner Component - Riutilizzabile
function BetaBanner({ variant = "default" }: { variant?: "default" | "large" | "sticky" }) {
  if (variant === "sticky") {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 text-center font-medium shadow-lg">
        🚧 VERSIONE BETA - Accesso su invito | <a href="#beta" className="underline font-bold">Richiedi accesso</a>
      </div>
    );
  }
  
  if (variant === "large") {
    return (
      <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white font-semibold text-lg shadow-lg">
        <span className="animate-pulse text-2xl">●</span>
        BETA - Accesso su invito
      </div>
    );
  }
  
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/20 border-2 border-amber-500/50 rounded-full text-amber-400 font-semibold">
      <span className="animate-pulse">●</span>
      BETA
    </div>
  );
}

// Form di candidatura Beta
interface BetaFormData {
  nome: string;
  email: string;
  settore: string;
  settoreAltro: string;
  ruolo: string;
  clienti: string;
  zona: string;
  telefono: string;
  esperienza: string;
  strumenti: string[];
  strumentiAltro: string;
  dispositivi: string;
  dispositiviAltro: string;
  comeConosciuto: string;
  privacy: boolean;
}

const INITIAL_FORM: BetaFormData = {
  nome: "",
  email: "",
  settore: "",
  settoreAltro: "",
  ruolo: "",
  clienti: "",
  zona: "",
  telefono: "",
  esperienza: "",
  strumenti: [],
  strumentiAltro: "",
  dispositivi: "",
  dispositiviAltro: "",
  comeConosciuto: "",
  privacy: false,
};

export default function LandingPage() {
  const [form, setForm] = useState<BetaFormData>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateForm = (field: keyof BetaFormData, value: string | boolean | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleStrumento = (strumento: string) => {
    setForm(prev => ({
      ...prev,
      strumenti: prev.strumenti.includes(strumento)
        ? prev.strumenti.filter(s => s !== strumento)
        : [...prev.strumenti, strumento]
    }));
  };

  async function handleBetaRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    // Validazione
    if (!form.nome || !form.email || !form.settore || !form.ruolo || 
        !form.clienti || !form.zona || !form.telefono || !form.esperienza ||
        form.strumenti.length === 0 || !form.dispositivi || !form.comeConosciuto) {
      setError("Compila tutti i campi obbligatori");
      return;
    }
    if (!form.privacy) {
      setError("Devi accettare la Privacy Policy per procedere");
      return;
    }
    if ((form.settore === "altro" && !form.settoreAltro) ||
        (form.strumenti.includes("Misto") && !form.strumentiAltro) ||
        (form.dispositivi === "altro" && !form.dispositiviAltro)) {
      setError("Specifica i campi 'Altro' selezionati");
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Prepara dati per email
      const strumentiText = form.strumenti.includes("Misto") 
        ? form.strumenti.filter(s => s !== "Misto").join(", ") + " + " + form.strumentiAltro
        : form.strumenti.join(", ");
      
      const settoreText = form.settore === "altro" ? form.settoreAltro : form.settore;
      const dispositiviText = form.dispositivi === "altro" ? form.dispositiviAltro : form.dispositivi;

      // Invia via Web3Forms (gratuito, no backend)
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "0f7cea16-e0ed-4735-969f-aacbcc65595d",
          subject: `🎯 Candidatura Beta REPING: ${form.nome}`,
          from_name: "REPING Beta Form",
          to: "info@reping.it",
          // Dati candidatura
          "Nome": form.nome,
          "Email": form.email,
          "Telefono": form.telefono,
          "Settore": settoreText,
          "Ruolo": form.ruolo,
          "Clienti gestiti": form.clienti,
          "Zona": form.zona,
          "Esperienza": form.esperienza,
          "Strumenti attuali": strumentiText,
          "Dispositivi": dispositiviText,
          "Come ci ha conosciuto": form.comeConosciuto,
          // Messaggio formattato
          message: `
NUOVA CANDIDATURA BETA REPING
=============================

👤 DATI PERSONALI
Nome: ${form.nome}
Email: ${form.email}
Telefono: ${form.telefono}

💼 PROFILO PROFESSIONALE
Settore: ${settoreText}
Ruolo: ${form.ruolo}
Clienti gestiti: ${form.clienti}
Zona: ${form.zona}
Esperienza: ${form.esperienza}

🛠️ STRUMENTI E DISPOSITIVI
Strumenti attuali: ${strumentiText}
Dispositivi: ${dispositiviText}

📣 ACQUISIZIONE
Come ci ha conosciuto: ${form.comeConosciuto}

✅ Privacy accettata: Sì
          `.trim(),
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        throw new Error("Errore invio");
      }
    } catch (err) {
      setError("Errore nell'invio. Riprova o scrivi a info@reping.it");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="font-sans">
      {/* ============ STICKY BETA BANNER ============ */}
      <BetaBanner variant="sticky" />

      {/* ============ NAVBAR ============ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <RepingLogo size="sm" light />
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-300 hover:text-white transition">Funzionalità</a>
            {/* <a href="#demo" className="text-slate-300 hover:text-white transition">Demo</a> */}
            <a href="#pricing" className="text-slate-300 hover:text-white transition">Piani</a>
            <a href="#beta" className="text-slate-300 hover:text-white transition">Beta</a>
          </div>

          <a 
            href="https://reping.app/login"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Accedi
          </a>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="pt-40 pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Testo */}
            <div>
              <BetaBanner variant="large" />
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 mt-6 leading-tight">
                Il tuo AI CoPilot
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400"> alle Vendite</span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Vendi di più, meglio e in meno tempo.
                <br />
                Parla con REPING, al resto pensa l'AI.
              </p>

              <div className="flex flex-wrap gap-4">
                {/* 🔒 BETA: Pulsante demo disabilitato - riattivare quando video pronto
                <a 
                  href="#demo"
                  className="px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition flex items-center gap-2"
                >
                  <span>▶</span> Guarda Demo
                </a>
                */}
                <a 
                  href="#beta"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition"
                >
                  Richiedi Accesso Beta
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full border border-green-500/30">
                  <span>🔐</span>
                  <span className="font-medium">Dati cifrati E2E</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-700/50 text-slate-300 px-3 py-1.5 rounded-full">
                  <span>🇮🇹</span>
                  Made in Italy
                </div>
                <div className="flex items-center gap-2 bg-slate-700/50 text-slate-300 px-3 py-1.5 rounded-full">
                  <span>🚗</span>
                  Hands-free
                </div>
                <div className="flex items-center gap-2 bg-slate-700/50 text-slate-300 px-3 py-1.5 rounded-full">
                  <span>🛡️</span>
                  GDPR compliant
                </div>
              </div>
            </div>

            {/* Animated Mockup */}
            <AnimatedMockup />
          </div>
        </div>
      </section>

      {/* ============ PAIN POINTS ============ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <BetaBanner />
            <h2 className="text-3xl font-bold text-slate-900 mt-4 mb-4">
              Ti riconosci in questi problemi?
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Ogni giorno gli agenti di commercio affrontano sfide che rubano tempo e riducono le vendite.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "⏰", title: "Pianificazione lenta", desc: "Perdo tempo a gestire la pianificazione delle attività" },
              { icon: "📋", title: "Info frammentate", desc: "Non ho tutte le info utili per la vendita a portata di mano" },
              { icon: "🚗", title: "Guida pericolosa", desc: "Rischio incidenti per guardare e maneggiare uno schermo" },
              { icon: "📊", title: "Nessuna visione", desc: "Non ho il polso della situazione e dello storico vendite" },
              { icon: "🗺️", title: "Percorsi inefficienti", desc: "Non so se i miei piani di visita sono razionali ed efficaci" },
              { icon: "🎯", title: "Scarsa personalizzazione", desc: "Non ho tempo e info sufficienti per migliorare la qualità del servizio clienti" },
            ].map((pain, i) => (
              <div 
                key={i} 
                className="bg-white p-6 rounded-xl border border-slate-200 hover:border-red-300 hover:shadow-lg transition group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition">{pain.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{pain.title}</h3>
                <p className="text-slate-600 text-sm">{pain.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES / BENEFITS ============ */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <BetaBanner />
            <h2 className="text-3xl font-bold text-slate-900 mt-4 mb-4">
              REPING risolve tutto questo
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Il tuo AI CoPilot che capisce il tuo lavoro e ti supporta ogni giorno.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: "📱", title: "Info sottomano", desc: "Tutti i dati dei tuoi clienti, prodotti e storico sempre accessibili con una domanda.", bg: "from-blue-50 to-white border-blue-100" },
              { icon: "📊", title: "Elaborazioni dati", desc: "Analisi automatiche: fatturato, visite, trend. Chiedi e REPING calcola.", bg: "from-green-50 to-white border-green-100" },
              { icon: "📝", title: "Note personalizzate", desc: "Appunti e promemoria per vendite mirate. Mai più dimenticare un dettaglio.", bg: "from-purple-50 to-white border-purple-100" },
              { icon: "💡", title: "Consigli strategici", desc: "Indicazioni operative basate sui tuoi dati. L'AI suggerisce, tu decidi.", bg: "from-yellow-50 to-white border-yellow-100" },
              { icon: "🗺️", title: "Percorsi ottimizzati", desc: "Risparmia km e tempo. REPING pianifica i giri più efficienti.", bg: "from-red-50 to-white border-red-100" },
              { icon: "🚗", title: "Modalità Guida", desc: "Guida in sicurezza, REPING dialoga con te! Hands-free totale.", bg: "from-indigo-50 to-white border-indigo-100" },
            ].map((feature, i) => (
              <div 
                key={i} 
                className={`p-6 rounded-2xl bg-gradient-to-br ${feature.bg} border hover:shadow-xl transition`}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SICUREZZA E2E ============ */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Testo */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm mb-4">
                <span>🔐</span>
                Privacy by Design
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">
                I tuoi dati sono <span className="text-green-400">SOLO tuoi</span>
              </h2>
              
              <p className="text-slate-300 mb-6 text-lg leading-relaxed">
                I dati sensibili dei tuoi clienti meritano la massima protezione. 
                Con REPING, sono <strong className="text-white">cifrati end-to-end</strong> e leggibili 
                <strong className="text-white"> esclusivamente sul tuo dispositivo</strong>.
              </p>
              
              <p className="text-slate-400 mb-8">
                Nemmeno noi di REPING possiamo accedere ai tuoi dati. 
                È una scelta tecnica complessa, ma necessaria per la tua tranquillità.
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                  Crittografia end-to-end (AES-256)
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                  Zero-knowledge: nemmeno noi leggiamo i tuoi dati
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                  Conforme GDPR - Server in Europa
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                  La tua password = la tua chiave di cifratura
                </li>
              </ul>
            </div>
            
            {/* Visual */}
            <div className="relative">
              <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-4xl">🔐</span>
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-white font-bold text-lg">Dati sensibili cifrati</p>
                  <p className="text-slate-400 text-sm">Solo TU puoi decifrarli</p>
                </div>
                
                {/* Visual representation - dati realmente cifrati */}
                <div className="space-y-2">
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">🏢</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">Nome cliente/azienda</p>
                      <p className="text-green-400 font-mono text-xs">████████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">👤</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">Nome contatto</p>
                      <p className="text-green-400 font-mono text-xs">██████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">📧</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">Email</p>
                      <p className="text-green-400 font-mono text-xs">████████████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">📞</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">Telefono</p>
                      <p className="text-green-400 font-mono text-xs">██████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">📍</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">Indirizzo</p>
                      <p className="text-green-400 font-mono text-xs">████████████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-lg">🏛️</span>
                    <div className="flex-1">
                      <p className="text-slate-500 text-[10px]">P.IVA</p>
                      <p className="text-green-400 font-mono text-xs">██████████</p>
                    </div>
                    <span className="text-green-400 text-sm">🔒</span>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-green-400 text-xs font-medium">Cifrato AES-256-GCM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ VIDEO DEMO ============ */}
      {/* 🔒 BETA: Sezione video commentata - da riattivare quando il video sarà pronto
      <section id="demo" className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <BetaBanner />
          <h2 className="text-3xl font-bold text-white mt-4 mb-4">
            Guarda REPING in azione
          </h2>
          <p className="text-slate-400 mb-10">
            2 minuti per capire come REPING può trasformare il tuo lavoro.
          </p>

          <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 group cursor-pointer">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition shadow-lg">
                <span className="text-white text-4xl ml-2">▶</span>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 text-slate-500 text-sm">
              🎬 Video demo coming soon
            </div>
          </div>

          <p className="mt-6 text-slate-500 text-sm">
            Il video sarà disponibile a breve. Nel frattempo, <a href="#beta" className="text-blue-400 hover:underline">richiedi accesso al Beta</a> per provare dal vivo!
          </p>
        </div>
      </section>
      */}

      {/* ============ MODALITÀ D'USO ============ */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              3 Modalità d'Uso
            </h2>
            <p className="text-slate-600">
              Scegli come interagire con REPING in base alle tue esigenze
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* GUI */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">GUI Standard</h3>
              <p className="text-slate-600 text-sm">
                Interazione classica con interfaccia grafica, arricchita da <strong>comandi vocali</strong> e 
                funzioni <strong>proattive</strong> (pianificazione visite, utilizzo note clienti).
              </p>
              <div className="mt-4 text-xs text-slate-500">
                ✅ Tutti i piani
              </div>
            </div>
            
            {/* Chat */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Chat AI</h3>
              <p className="text-slate-600 text-sm">
                GUI + interazione in <strong>linguaggio naturale</strong> per funzioni avanzate: 
                elaborazioni statistiche, grafici personalizzati, analisi semantiche complesse.
              </p>
              <div className="mt-4 text-xs text-slate-500">
                ✅ Tutti i piani
              </div>
            </div>
            
            {/* Guida */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border-2 border-emerald-200">
              <div className="text-4xl mb-4">🚗</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Modalità Guida</h3>
              <p className="text-slate-600 text-sm">
                Uso <strong>solo dialogico</strong> (voce + audio) per tutte le funzioni dell'app. 
                Perfetta per la <strong>guida sicura</strong>: niente schermo, solo conversazione.
              </p>
              <div className="mt-4 text-xs text-emerald-600 font-medium">
                ✨ Solo BUSINESS e MULTIAGENT
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* BETA NOTICE - Very prominent */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl p-6 mb-10 text-center shadow-lg">
            <div className="text-2xl font-bold mb-2">🚀 BETA GRATUITA: Prova BUSINESS completo!</div>
            <p className="text-white/90">
              Per tutta la durata della fase Beta puoi provare <strong>BUSINESS completo</strong> (valore €99/mese) 
              gratuitamente su invito. Poi scegli: resta BUSINESS o passa a PREMIUM.
            </p>
            <a href="#beta" className="inline-block mt-3 px-6 py-2 bg-white text-emerald-600 rounded-full font-bold hover:bg-emerald-50 transition">
              Richiedi Accesso Beta →
            </a>
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Piani
            </h2>
            <p className="text-slate-600">
              Al termine della fase Beta saranno disponibili i seguenti piani
            </p>
          </div>

          {/* Pricing Grid - 3 columns on desktop */}
          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">

            {/* PREMIUM */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition">
              <div className="text-xs font-medium text-slate-400 mb-1">POST-BETA</div>
              <div className="text-lg font-bold text-slate-700 mb-2">PREMIUM</div>
              <div className="text-4xl font-bold text-slate-900 mb-1">€49</div>
              <div className="text-slate-500 text-sm mb-2">/mese</div>
              <div className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full inline-block mb-4">
                🎁 Primo mese gratuito
              </div>
              
              <div className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full inline-block mb-4">
                📱💬 GUI + Chat
              </div>
              
              <ul className="space-y-2.5 mb-6 text-sm">
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-green-500 mt-0.5">✓</span> Max 500 clienti
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-green-500 mt-0.5">✓</span> 60 interazioni/giorno
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-green-500 mt-0.5">✓</span> Storico 90 giorni
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-green-500 mt-0.5">✓</span> 9 export PDF/mese
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-green-500 mt-0.5">✓</span> Supporto prioritario
                </li>
              </ul>

              <div className="text-xs text-slate-400 text-center">
                Per chi non serve Modalità Guida
              </div>
            </div>

            {/* BUSINESS - Highlighted as current beta */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-6 rounded-2xl shadow-xl relative overflow-hidden transform lg:-translate-y-3 lg:scale-105">
              <div className="absolute top-0 left-0 right-0 bg-amber-400 text-amber-900 text-xs font-bold py-1.5 text-center">
                ⭐ DISPONIBILE ORA IN BETA GRATUITA
              </div>
              <div className="mt-6">
                <div className="text-xs font-medium text-emerald-200 mb-1">POST-BETA</div>
                <div className="text-lg font-bold text-white mb-2">BUSINESS</div>
                <div className="text-4xl font-bold text-white mb-1">€99</div>
                <div className="text-emerald-200 text-sm mb-2">/mese</div>
                <div className="bg-amber-400 text-amber-900 text-xs font-medium px-3 py-1 rounded-full inline-block mb-4">
                  🎁 Primo mese gratuito
                </div>
                
                <div className="bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full inline-block mb-4">
                  📱💬🚗 GUI + Chat + Guida
                </div>
                
                <ul className="space-y-2.5 mb-4 text-sm">
                  <li className="flex items-start gap-2 text-white">
                    <span className="text-green-300 mt-0.5">✓</span> Max 1000 clienti
                  </li>
                  <li className="flex items-start gap-2 text-white">
                    <span className="text-green-300 mt-0.5">✓</span> Interazioni illimitate
                  </li>
                  <li className="flex items-start gap-2 text-white">
                    <span className="text-green-300 mt-0.5">✓</span> Storico illimitato
                  </li>
                  <li className="flex items-start gap-2 text-white">
                    <span className="text-green-300 mt-0.5">✓</span> Export PDF illimitati
                  </li>
                  <li className="flex items-start gap-2 text-white">
                    <span className="text-green-300 mt-0.5">✓</span> Supporto dedicato
                  </li>
                </ul>
                
                <div className="border-t border-white/20 pt-3 space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-amber-300 text-sm font-medium">
                    <span className="mt-0.5">✨</span> Modalità Guida
                  </div>
                  <p className="text-white/80 text-xs ml-5 -mt-1">REPING dialoga con te mentre guidi!</p>
                  <div className="flex items-start gap-2 text-amber-300 text-sm font-medium">
                    <span className="mt-0.5">✨</span> Analitiche avanzate
                  </div>
                  <p className="text-white/80 text-xs ml-5 -mt-1">Insights sul tuo business</p>
                </div>

                <a href="#beta" className="block w-full py-2.5 bg-white text-emerald-600 rounded-xl font-bold text-center hover:bg-emerald-50 transition text-sm">
                  🎁 Prova Gratis in Beta
                </a>
              </div>
            </div>

            {/* MULTIAGENT */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition">
              <div className="text-xs font-medium text-orange-500 mb-1">PROSSIMAMENTE</div>
              <div className="text-lg font-bold text-slate-700 mb-2">MULTIAGENT</div>
              <div className="text-4xl font-bold text-slate-900 mb-1">€149</div>
              <div className="text-slate-500 text-sm mb-2">/utente/mese</div>
              <div className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full inline-block mb-4">
                🎁 Primo mese gratuito
              </div>
              
              <div className="text-xs text-slate-500 mb-3 font-medium">Tutto BUSINESS +</div>
              
              <ul className="space-y-2.5 mb-4 text-sm">
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-green-500 mt-0.5">✓</span> Dashboard Admin
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-green-500 mt-0.5">✓</span> Pitch & Infografiche
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-green-500 mt-0.5">✓</span> Community interna
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-green-500 mt-0.5">✓</span> Gamification
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-green-500 mt-0.5">✓</span> Analitiche comparative
                </li>
              </ul>
            </div>

          </div>

          {/* ENTERPRISE - Banner separato per imprenditori */}
          <div className="mt-12 bg-gradient-to-r from-slate-100 to-slate-50 rounded-2xl p-8 border border-slate-200">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Left: Text */}
              <div className="flex-1 text-center lg:text-left">
                <div className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                  Per aziende con esigenze specifiche
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  🏢 Soluzioni Enterprise
                </h3>
                <p className="text-slate-600 mb-4">
                  Hai una rete di vendita strutturata? Cerchi integrazioni con i tuoi sistemi esistenti? 
                  Parliamo delle <strong>soluzioni personalizzate</strong> per la tua azienda.
                </p>
                
                {/* Features grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-blue-500">🔗</span> CRM integrato
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-blue-500">⚡</span> API access
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-blue-500">🔐</span> SSO aziendale
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-blue-500">📊</span> BI & Reporting
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-blue-500">🛡️</span> SLA garantito
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-blue-500">🎨</span> White label
                  </div>
                </div>
              </div>
              
              {/* Right: CTA */}
              <div className="flex flex-col items-center lg:items-end gap-3">
                <div className="text-slate-500 text-sm">Disponibile prossimamente</div>
                <div className="text-xl font-bold text-slate-900">
                  Contattaci
                </div>
                <a 
                  href="mailto:info@reping.it?subject=Richiesta informazioni Enterprise" 
                  className="text-blue-600 hover:text-blue-800 font-medium text-lg"
                >
                  📧 info@reping.it
                </a>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            Tutti i prezzi sono IVA esclusa.
          </p>
        </div>
      </section>

      {/* ============ BETA CTA ============ */}
      <section id="beta" className="py-20 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-400 text-lg font-bold mb-6">
              🚀 BETA ESCLUSIVA - Posti limitati
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Candidati al programma Beta
            </h2>
            <p className="text-slate-300 text-lg">
              Cerchiamo <strong className="text-white">10 agenti di commercio</strong> per testare REPING.
              <br />
              Se selezionato: <strong className="text-amber-400">BUSINESS GRATUITO</strong> + supporto diretto con il team.
            </p>
          </div>

          {submitted ? (
            <div className="bg-green-500/20 border border-green-500/50 rounded-2xl p-8 text-center max-w-lg mx-auto">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-white mb-3">Candidatura inviata!</h3>
              <p className="text-slate-300 mb-4">
                Grazie <strong className="text-white">{form.nome}</strong>!
                <br />
                Valuteremo la tua candidatura e ti contatteremo entro 24h a <strong className="text-white">{form.email}</strong>
              </p>
              <p className="text-slate-400 text-sm">
                ⚠️ Se non verrai selezionato, i tuoi dati saranno cancellati.
              </p>
            </div>
          ) : (
            <form onSubmit={handleBetaRequest} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 md:p-8">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-6 text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/* Sezione: Dati personali */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">👤</span> Dati personali
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Nome e Cognome *</label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={e => updateForm("nome", e.target.value)}
                      placeholder="Mario Rossi"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => updateForm("email", e.target.value)}
                      placeholder="mario@esempio.it"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Telefono *</label>
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={e => updateForm("telefono", e.target.value)}
                      placeholder="+39 333 1234567"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Zona (regione/provincia) *</label>
                    <input
                      type="text"
                      value={form.zona}
                      onChange={e => updateForm("zona", e.target.value)}
                      placeholder="es. Lombardia, Milano e provincia"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sezione: Profilo professionale */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">💼</span> Profilo professionale
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Settore *</label>
                    <select
                      value={form.settore}
                      onChange={e => updateForm("settore", e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Seleziona...</option>
                      <option value="HoReCa">HoReCa (Hotel, Ristoranti, Caffè)</option>
                      <option value="Food&Beverage">Food & Beverage</option>
                      <option value="altro">Altro (specificare)</option>
                    </select>
                    {form.settore === "altro" && (
                      <input
                        type="text"
                        value={form.settoreAltro}
                        onChange={e => updateForm("settoreAltro", e.target.value)}
                        placeholder="Specifica il settore..."
                        className="w-full mt-2 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Ruolo *</label>
                    <select
                      value={form.ruolo}
                      onChange={e => updateForm("ruolo", e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Seleziona...</option>
                      <option value="Monomandatario">Agente Monomandatario</option>
                      <option value="Plurimandatario">Agente Plurimandatario</option>
                      <option value="Dipendente">Venditore Dipendente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Quanti clienti gestisci? *</label>
                    <select
                      value={form.clienti}
                      onChange={e => updateForm("clienti", e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Seleziona...</option>
                      <option value="<50">Meno di 50</option>
                      <option value="50-300">50 - 300</option>
                      <option value="300-500">300 - 500</option>
                      <option value=">500">Più di 500</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Anni di esperienza *</label>
                    <select
                      value={form.esperienza}
                      onChange={e => updateForm("esperienza", e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Seleziona...</option>
                      <option value="<2">Meno di 2 anni</option>
                      <option value="2-10">2 - 10 anni</option>
                      <option value=">10">Più di 10 anni</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sezione: Strumenti e dispositivi */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">🛠️</span> Strumenti e dispositivi
                </h3>
                
                <div className="mb-4">
                  <label className="block text-slate-400 text-sm mb-2">Strumenti attuali per gestire i clienti * (seleziona tutti)</label>
                  <div className="flex flex-wrap gap-2">
                    {["CRM", "Excel", "App", "Carta", "Misto"].map(strumento => (
                      <button
                        key={strumento}
                        type="button"
                        onClick={() => toggleStrumento(strumento)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          form.strumenti.includes(strumento)
                            ? "bg-blue-600 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {strumento}
                      </button>
                    ))}
                  </div>
                  {form.strumenti.includes("Misto") && (
                    <input
                      type="text"
                      value={form.strumentiAltro}
                      onChange={e => updateForm("strumentiAltro", e.target.value)}
                      placeholder="Specifica gli strumenti usati..."
                      className="w-full mt-2 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1">Dispositivo principale per lavoro *</label>
                  <select
                    value={form.dispositivi}
                    onChange={e => updateForm("dispositivi", e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Seleziona...</option>
                    <option value="iPhone">iPhone</option>
                    <option value="Android">Smartphone Android</option>
                    <option value="iPad">iPad</option>
                    <option value="Tablet Android">Tablet Android</option>
                    <option value="Mac">Mac</option>
                    <option value="PC Windows">PC Windows</option>
                    <option value="altro">Altro (specificare)</option>
                  </select>
                  {form.dispositivi === "altro" && (
                    <input
                      type="text"
                      value={form.dispositiviAltro}
                      onChange={e => updateForm("dispositiviAltro", e.target.value)}
                      placeholder="Specifica il dispositivo..."
                      className="w-full mt-2 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              </div>

              {/* Sezione: Come ci hai conosciuto */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">📣</span> Come ci hai conosciuto?
                </h3>
                <input
                  type="text"
                  value={form.comeConosciuto}
                  onChange={e => updateForm("comeConosciuto", e.target.value)}
                  placeholder="es. LinkedIn, passaparola, ricerca Google, altro..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Privacy e Submit */}
              <div className="border-t border-slate-700 pt-6">
                <label className="flex items-start gap-3 cursor-pointer mb-6">
                  <input
                    type="checkbox"
                    checked={form.privacy}
                    onChange={e => updateForm("privacy", e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-300 text-sm">
                    Ho letto e accetto la{" "}
                    <a href="https://reping.app/legal/privacy" target="_blank" className="text-blue-400 hover:underline">
                      Privacy Policy
                    </a>
                    . Comprendo che in caso di non selezione i miei dati saranno cancellati. *
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin">⏳</span> Invio in corso...
                    </>
                  ) : (
                    <>
                      🚀 Invia Candidatura
                    </>
                  )}
                </button>

                <p className="text-center text-slate-500 text-sm mt-4">
                  📧 Problemi? Scrivi a{" "}
                  <a href="mailto:info@reping.it" className="text-blue-400 hover:underline">info@reping.it</a>
                </p>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 bg-slate-900 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Logo */}
            <div>
              <RepingLogo size="md" light />
              <p className="text-slate-400 text-sm mt-4">
                Il tuo AI CoPilot alle Vendite.
                <br />
                Per agenti di commercio HoReCa.
              </p>
              <div className="mt-3">
                <BetaBanner />
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Prodotto</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#features" className="hover:text-white transition">Funzionalità</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Piani</a></li>
                {/* <li><a href="#demo" className="hover:text-white transition">Demo</a></li> */}
                <li><a href="#beta" className="hover:text-white transition">Beta</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legale</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="https://reping.app/legal/privacy" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="https://reping.app/legal/terms" className="hover:text-white transition">Termini di Servizio</a></li>
                <li><a href="https://reping.app/legal/cookies" className="hover:text-white transition">Cookie Policy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Contatti</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>📧 <a href="mailto:info@reping.it" className="hover:text-white transition">info@reping.it</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © 2025 REPING. Tutti i diritti riservati.
            </p>
            <p className="text-slate-500 text-sm">
              Made with ❤️ in Italy
            </p>
          </div>
        </div>
      </footer>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-slideInRight {
          animation: slideInRight 0.4s ease-out forwards;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
