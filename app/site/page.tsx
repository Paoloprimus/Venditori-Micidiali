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

// Animated Demo Presentation with Voice
function AnimatedMockup() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scene, setScene] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Scene definitions - RALLENTATE
  const scenes = [
    { id: "morning", duration: 5000 },
    { id: "dashboard", duration: 8000 },
    { id: "question", duration: 10000 },
    { id: "route", duration: 9000 },
    { id: "driving", duration: 7000 },
    { id: "report", duration: 6000 },
    { id: "claim", duration: 5000 },
  ];

  // Text-to-Speech
  const speak = (text: string, isUser: boolean = false) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it-IT";
    utterance.rate = 0.9; // Leggermente più lento
    utterance.pitch = isUser ? 0.9 : 1.1; // User più grave, App più acuta
    utterance.volume = 0.8;
    
    // Prova a usare voci italiane
    const voices = window.speechSynthesis.getVoices();
    const italianVoice = voices.find(v => v.lang.startsWith("it"));
    if (italianVoice) utterance.voice = italianVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  // Stop everything
  const stopPresentation = () => {
    setIsPlaying(false);
    setScene(0);
    setSubStep(0);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Start presentation
  const startPresentation = () => {
    setIsPlaying(true);
    setScene(0);
    setSubStep(0);
  };

  // Voice for each scene
  useEffect(() => {
    if (!isPlaying) return;
    
    // Trigger voice based on scene and substep
    if (scene === 0 && subStep === 0) {
      setTimeout(() => speak("Buongiorno Paolo! Il tuo piano di oggi è pronto."), 500);
    }
    if (scene === 1 && subStep === 0) {
      setTimeout(() => speak("Ecco la tua dashboard. Oggi hai 5 visite programmate."), 500);
    }
    if (scene === 1 && subStep === 4) {
      speak("Attenzione: Bar Roma non ordina da 45 giorni.");
    }
    if (scene === 2 && subStep === 1) {
      speak("Quanto ho venduto questo mese?", true); // User voice
    }
    if (scene === 2 && subStep === 3) {
      speak("Questo mese hai fatturato 18.540 euro, con un incremento del 15% rispetto al mese scorso.");
    }
    if (scene === 3 && subStep === 0) {
      setTimeout(() => speak("Ho ottimizzato il tuo percorso per oggi."), 500);
    }
    if (scene === 3 && subStep === 6) {
      speak("Risparmierai 12 chilometri!");
    }
    if (scene === 4 && subStep === 0) {
      setTimeout(() => speak("Modalità guida attivata. Mani libere, in sicurezza."), 500);
    }
    if (scene === 4 && subStep === 2) {
      speak("Prossima tappa: Bar Roma, a 5 minuti.");
    }
    if (scene === 5 && subStep === 0) {
      setTimeout(() => speak("Ottimo lavoro! Ecco il report della tua giornata."), 500);
    }
    if (scene === 6 && subStep === 0) {
      setTimeout(() => speak("REPING. La tua giornata migliore, ogni giorno. Incremento fatturato previsto: più 12%. ROI mensile: 1,7 volte."), 800);
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
      } else {
        // Fine - non loop automatico
        setTimeout(() => {
          stopPresentation();
        }, 2000);
      }
    }, currentScene.duration);

    return () => clearTimeout(timer);
  }, [isPlaying, scene]);

  // Sub-step animations within scenes - RALLENTATE
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setSubStep(s => s + 1);
    }, 1500); // Era 800, ora 1500
    return () => clearInterval(timer);
  }, [isPlaying, scene]);

  const currentSceneId = scenes[scene]?.id || "morning";

  return (
    <div className="relative">
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-3xl p-4 border border-slate-700">
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
          {/* App bar */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-slate-500 text-xs">reping.app</span>
            <div className="text-slate-500 text-xs">
              {isPlaying && <span className="animate-pulse text-red-400">● REC</span>}
            </div>
          </div>
          
          {/* Content */}
          <div className="min-h-[340px] relative overflow-hidden">
            
            {/* Scene 0: Morning notification */}
            {currentSceneId === "morning" && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 animate-fadeIn">
                <div className="text-center">
                  <div className="text-4xl mb-4">☀️</div>
                  <div className="bg-blue-600/30 border border-blue-500/50 rounded-xl p-4 mx-4">
                    <p className="text-blue-300 text-sm font-medium">Buongiorno Paolo!</p>
                    <p className="text-white text-lg font-bold mt-1">Il tuo piano è pronto</p>
                    <p className="text-blue-400 text-xs mt-2">5 visite ottimali • 47km</p>
                  </div>
                </div>
              </div>
            )}

            {/* Scene 1: Dashboard */}
            {currentSceneId === "dashboard" && (
              <div className="absolute inset-0 p-4 bg-slate-900 animate-fadeIn">
                <p className="text-slate-400 text-xs mb-3">📊 Dashboard di oggi</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 p-3 rounded-lg text-center border border-blue-500/30">
                    <div className="text-2xl font-bold text-white">{subStep > 0 ? "5" : "0"}</div>
                    <div className="text-xs text-slate-400">Visite oggi</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 p-3 rounded-lg text-center border border-green-500/30">
                    <div className="text-2xl font-bold text-white">{subStep > 1 ? "€2.4k" : "€0"}</div>
                    <div className="text-xs text-slate-400">Target</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 p-3 rounded-lg text-center border border-purple-500/30">
                    <div className="text-2xl font-bold text-white">{subStep > 2 ? "47" : "0"}</div>
                    <div className="text-xs text-slate-400">Km</div>
                  </div>
                </div>
                {subStep > 3 && (
                  <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-3 animate-fadeIn">
                    <p className="text-amber-300 text-xs font-medium">⚠️ Alert</p>
                    <p className="text-white text-sm">Bar Roma non ordina da 45 giorni</p>
                  </div>
                )}
              </div>
            )}

            {/* Scene 2: AI Question */}
            {currentSceneId === "question" && (
              <div className="absolute inset-0 p-4 bg-slate-900 animate-fadeIn">
                <div className="space-y-3">
                  {subStep > 0 && (
                    <div className="bg-blue-600 text-white p-3 rounded-lg text-sm ml-auto max-w-[80%] animate-slideInRight">
                      Quanto ho venduto questo mese?
                    </div>
                  )}
                  {subStep > 1 && (
                    <div className="bg-slate-800 p-3 rounded-lg max-w-[85%] animate-slideInLeft">
                      <p className="text-white text-sm font-medium">Questo mese hai fatturato:</p>
                      <p className="text-3xl font-bold text-green-400 my-2">€18.540</p>
                      <p className="text-green-400 text-xs">+15% vs mese scorso 📈</p>
                      {subStep > 2 && (
                        <div className="mt-3 flex gap-1 h-12">
                          {[40, 55, 45, 70, 65, 80, 90].map((h, i) => (
                            <div key={i} className="flex-1 bg-blue-500/30 rounded-t relative">
                              <div 
                                className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t transition-all duration-500"
                                style={{ height: `${h}%` }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scene 3: Route optimization */}
            {currentSceneId === "route" && (
              <div className="absolute inset-0 p-4 bg-slate-900 animate-fadeIn">
                <p className="text-slate-400 text-xs mb-3">🗺️ Percorso ottimizzato</p>
                <div className="space-y-2">
                  {["🏠 Casa", "☕ Bar Roma", "🍕 Pizzeria Napoli", "🏨 Hotel Centrale", "🍷 Enoteca Verdi", "🏠 Casa"].map((stop, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center gap-2 transition-all duration-300 ${subStep > i ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 || i === 5 ? "bg-green-500" : "bg-blue-500"
                      } text-white`}>
                        {i + 1}
                      </div>
                      <span className="text-slate-300 text-sm">{stop}</span>
                      {i < 5 && <div className="flex-1 border-t border-dashed border-slate-700"></div>}
                    </div>
                  ))}
                </div>
                {subStep > 5 && (
                  <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-2 text-center animate-fadeIn">
                    <span className="text-green-400 font-bold">-12 km risparmiati!</span>
                  </div>
                )}
              </div>
            )}

            {/* Scene 4: Driving mode */}
            {currentSceneId === "driving" && (
              <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-center animate-fadeIn">
                <div className="text-xs text-slate-500 mb-2">🚗 MODALITÀ GUIDA</div>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4 animate-pulse">
                  <span className="text-4xl">🎤</span>
                </div>
                {subStep > 1 && (
                  <div className="text-center animate-fadeIn">
                    <p className="text-slate-400 text-sm">Prossima tappa:</p>
                    <p className="text-white text-xl font-bold">Bar Roma</p>
                    <p className="text-blue-400 text-sm mt-1">📍 2.3 km • 5 min</p>
                  </div>
                )}
              </div>
            )}

            {/* Scene 5: Report */}
            {currentSceneId === "report" && (
              <div className="absolute inset-0 p-4 bg-slate-900 flex flex-col items-center justify-center animate-fadeIn">
                <div className="text-4xl mb-4">📄</div>
                <p className="text-slate-400 text-sm mb-2">Fine giornata</p>
                <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-bold">✅ Report generato!</p>
                  <p className="text-white text-sm mt-2">5 visite • €2.850 ordini</p>
                  <p className="text-slate-400 text-xs mt-1">47 km • 4h 20m</p>
                </div>
              </div>
            )}

            {/* Scene 6: Claim */}
            {currentSceneId === "claim" && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center animate-fadeIn">
                <div className="text-center px-4">
                  <p className="text-white/80 text-sm mb-2">REPING</p>
                  <p className="text-white text-2xl font-bold leading-tight">
                    La tua giornata migliore,
                    <br />ogni giorno.
                  </p>
                  <div className="mt-4 flex gap-3 justify-center text-sm">
                    <div className="bg-white/20 px-3 py-1.5 rounded-lg">
                      <span className="text-white/70">Fatturato</span>
                      <span className="text-white font-bold ml-1">+12%</span>
                    </div>
                    <div className="bg-white/20 px-3 py-1.5 rounded-lg">
                      <span className="text-white/70">ROI</span>
                      <span className="text-white font-bold ml-1">~1,7x</span>
                    </div>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                    <span className="animate-pulse">●</span>
                    <span className="text-white text-sm font-medium">Beta disponibile</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Play button overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-2xl">
              <button 
                onClick={startPresentation}
                className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center hover:scale-110 transition shadow-lg group"
              >
                <span className="text-white text-3xl ml-1 group-hover:scale-110 transition">▶</span>
              </button>
            </div>
          )}

          {/* Stop button when playing */}
          {isPlaying && (
            <button 
              onClick={stopPresentation}
              className="absolute top-16 right-4 w-10 h-10 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center transition shadow-lg z-10"
              title="Ferma presentazione"
            >
              <span className="text-white text-lg font-bold">■</span>
            </button>
          )}

          {/* Progress bar */}
          {isPlaying && (
            <div className="h-1 bg-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${((scene + 1) / scenes.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Floating badge */}
      <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1">
        <span className="animate-pulse">●</span> AI Powered
      </div>

      {/* Voice hint */}
      {!isPlaying && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-slate-500 text-xs flex items-center gap-1">
          🔊 Con voce • Clicca ▶ per avviare
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

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleBetaRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    
    setSubmitting(true);
    // TODO: Inviare email a Supabase
    await new Promise(r => setTimeout(r, 1000));
    setSubmitted(true);
    setSubmitting(false);
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
            <a href="#demo" className="text-slate-300 hover:text-white transition">Demo</a>
            <a href="#pricing" className="text-slate-300 hover:text-white transition">Prezzi</a>
            <a href="#beta" className="text-slate-300 hover:text-white transition">Beta</a>
          </div>

          <Link 
            href="/login"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Accedi
          </Link>
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
                Parla con l'assistente, lui fa il resto.
              </p>

              <div className="flex flex-wrap gap-4">
                <a 
                  href="#demo"
                  className="px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition flex items-center gap-2"
                >
                  <span>▶</span> Guarda Demo
                </a>
                <a 
                  href="#beta"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition"
                >
                  Richiedi Accesso Beta
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap items-center gap-6 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">🔐</span>
                  Dati cifrati E2E
                </div>
                <div className="flex items-center gap-2">
                  <span>🇮🇹</span>
                  Made in Italy
                </div>
                <div className="flex items-center gap-2">
                  <span>🚗</span>
                  Hands-free
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
              { icon: "🚗", title: "Guida pericolosa", desc: "Non riesco a lavorare bene mentre guido" },
              { icon: "📊", title: "Nessuna visione", desc: "Non ho il polso della situazione e dello storico vendite" },
              { icon: "🗺️", title: "Percorsi inefficienti", desc: "Non so se i miei piani di visita sono razionali ed efficaci" },
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
              Un assistente AI che capisce il tuo lavoro e ti aiuta ogni giorno.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: "📱", title: "Info sottomano", desc: "Tutti i dati dei tuoi clienti, prodotti e storico sempre accessibili con una domanda.", bg: "from-blue-50 to-white border-blue-100" },
              { icon: "📊", title: "Elaborazioni dati", desc: "Analisi automatiche: fatturato, visite, trend. Chiedi e REPING calcola.", bg: "from-green-50 to-white border-green-100" },
              { icon: "📝", title: "Note personalizzate", desc: "Appunti e promemoria per vendite mirate. Mai più dimenticare un dettaglio.", bg: "from-purple-50 to-white border-purple-100" },
              { icon: "💡", title: "Consigli strategici", desc: "Indicazioni operative basate sui tuoi dati. L'AI suggerisce, tu decidi.", bg: "from-yellow-50 to-white border-yellow-100" },
              { icon: "🗺️", title: "Percorsi ottimizzati", desc: "Risparmia km e tempo. REPING pianifica i giri più efficienti.", bg: "from-red-50 to-white border-red-100" },
              { icon: "🚗", title: "Modalità Guida", desc: "Hands-free totale. Parla mentre guidi, REPING ascolta e risponde.", bg: "from-indigo-50 to-white border-indigo-100" },
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

      {/* ============ VIDEO DEMO ============ */}
      <section id="demo" className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <BetaBanner />
          <h2 className="text-3xl font-bold text-white mt-4 mb-4">
            Guarda REPING in azione
          </h2>
          <p className="text-slate-400 mb-10">
            2 minuti per capire come REPING può trasformare il tuo lavoro.
          </p>

          {/* Video placeholder */}
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

      {/* ============ PRICING ============ */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <BetaBanner />
            <h2 className="text-3xl font-bold text-slate-900 mt-4 mb-4">
              Scegli il piano giusto per te
            </h2>
            <p className="text-slate-600">
              Inizia gratis, scala quando vuoi.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* FREE */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-lg transition">
              <div className="text-sm font-medium text-slate-500 mb-2">STARTER</div>
              <div className="text-4xl font-bold text-slate-900 mb-1">€0</div>
              <div className="text-slate-500 mb-6">per sempre</div>
              
              <ul className="space-y-3 mb-8">
                {["30 domande/giorno", "Storico 90 giorni", "3 export PDF/mese", "Supporto community"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-600">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>

              <button className="w-full py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:border-slate-400 transition">
                Inizia Gratis
              </button>
            </div>

            {/* PREMIUM */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8 rounded-2xl shadow-xl transform md:-translate-y-4 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded">BETA GRATIS</span>
              </div>
              <div className="text-sm font-medium text-blue-200 mb-2">PREMIUM</div>
              <div className="text-4xl font-bold text-white mb-1">€50</div>
              <div className="text-blue-200 mb-6">/mese</div>
              
              <ul className="space-y-3 mb-8">
                {["300 domande/giorno", "Storico illimitato", "Export PDF illimitati", "Analytics avanzati", "Supporto prioritario"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-white">
                    <span className="text-green-300">✓</span> {f}
                  </li>
                ))}
              </ul>

              <button className="w-full py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition">
                Scegli Premium
              </button>
              
              <div className="mt-4 text-center text-blue-200 text-sm">
                ⭐ Il più scelto
              </div>
            </div>

            {/* PRO */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-lg transition">
              <div className="text-sm font-medium text-slate-500 mb-2">PRO</div>
              <div className="text-4xl font-bold text-slate-900 mb-1">€150</div>
              <div className="text-slate-500 mb-6">/mese</div>
              
              <ul className="space-y-3 mb-8">
                {["Domande illimitate", "Tutto Premium +", "API access", "Multi-utente", "Supporto dedicato"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-600">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>

              <button className="w-full py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:border-slate-400 transition">
                Contattaci
              </button>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            Tutti i prezzi sono IVA esclusa. Fatturazione mensile o annuale (-20%).
          </p>
        </div>
      </section>

      {/* ============ BETA CTA ============ */}
      <section id="beta" className="py-20 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/20 rounded-full text-white text-lg font-bold mb-6">
            🚀 BETA ESCLUSIVA - Posti limitati
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Vuoi provare REPING in anteprima?
          </h2>
          <p className="text-white/90 mb-8 text-lg">
            Stiamo cercando <strong>10 agenti di commercio</strong> per testare REPING.
            <br />
            Accesso <strong>PREMIUM GRATUITO</strong> + supporto diretto con il team.
          </p>

          {submitted ? (
            <div className="bg-white/20 border border-white/30 rounded-xl p-6 max-w-md mx-auto backdrop-blur">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-xl font-semibold text-white mb-2">Richiesta inviata!</h3>
              <p className="text-white/90">
                Ti contatteremo presto all'indirizzo <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleBetaRequest} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="La tua email"
                required
                className="flex-1 px-4 py-3 rounded-xl bg-white/20 border-2 border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-white/60 font-medium"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition disabled:opacity-50"
              >
                {submitting ? "Invio..." : "Richiedi Accesso"}
              </button>
            </form>
          )}

          <p className="mt-6 text-white/80 text-sm">
            📧 Oppure scrivi a <a href="mailto:info@reping.it" className="underline font-medium">info@reping.it</a>
          </p>
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
                <li><a href="#pricing" className="hover:text-white transition">Prezzi</a></li>
                <li><a href="#demo" className="hover:text-white transition">Demo</a></li>
                <li><a href="#beta" className="hover:text-white transition">Beta</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legale</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/legal/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/legal/terms" className="hover:text-white transition">Termini di Servizio</Link></li>
                <li><Link href="/legal/cookies" className="hover:text-white transition">Cookie Policy</Link></li>
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
