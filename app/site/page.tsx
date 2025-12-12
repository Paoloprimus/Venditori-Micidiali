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

// Animated Demo Presentation - iPhone Style - VERSIONE COMPLETA
function AnimatedMockup() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scene, setScene] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState<"left" | "right" | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const subStepRef = useRef<NodeJS.Timeout | null>(null);

  // Scene definitions - 17 scene complete (~90 secondi)
  const scenes = [
    { id: "login", duration: 3000, label: "Accesso" },
    { id: "dashboard", duration: 5000, label: "Dashboard" },
    { id: "drawer-left", duration: 4000, label: "Storico Chat" },
    { id: "drawer-right", duration: 5000, label: "Menu Funzioni" },
    { id: "clients-list", duration: 5000, label: "Lista Clienti" },
    { id: "client-detail", duration: 5000, label: "Scheda Cliente" },
    { id: "chat-plan-ask", duration: 6000, label: "Richiesta Piano", tts: true },
    { id: "chat-plan-response", duration: 7000, label: "Piano Visite", tts: true },
    { id: "chat-stats-ask", duration: 5000, label: "Richiesta Stats" },
    { id: "chat-stats-response", duration: 6000, label: "Statistiche" },
    { id: "proactive-alert", duration: 4000, label: "Suggerimento" },
    { id: "driving-start", duration: 5000, label: "Avvio Guida" },
    { id: "driving-active", duration: 7000, label: "Modalità Guida", tts: true },
    { id: "visit-register", duration: 6000, label: "Registra Visita", tts: true },
    { id: "visit-saved", duration: 4000, label: "Visita Salvata" },
    { id: "daily-report", duration: 5000, label: "Report Giornata" },
    { id: "claim", duration: 4000, label: "REPING" },
  ];

  const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);

  // Text-to-Speech
  const speak = (text: string, isMale: boolean = false) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it-IT";
    utterance.rate = 0.95;
    utterance.volume = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const italianVoices = voices.filter(v => v.lang.startsWith("it") || v.lang === "it-IT");
    if (italianVoices.length > 0) {
      utterance.voice = italianVoices[isMale ? 0 : Math.min(1, italianVoices.length - 1)];
    }
    utterance.pitch = isMale ? 0.85 : 1.1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Typing animation
  const typeText = (fullText: string, duration: number) => {
    setTypingText("");
    const chars = fullText.split("");
    const interval = duration / chars.length;
    chars.forEach((char, i) => {
      setTimeout(() => setTypingText(prev => prev + char), i * interval);
    });
  };

  // Controls
  const stopPresentation = () => {
    setIsPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (subStepRef.current) clearInterval(subStepRef.current);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const resetPresentation = () => {
    stopPresentation();
    setScene(0);
    setSubStep(0);
    setTypingText("");
    setElapsedTime(0);
    setDrawerOpen(null);
  };

  const startPresentation = () => {
    resetPresentation();
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stopPresentation();
    } else {
      setIsPlaying(true);
    }
  };

  // Seek to scene
  const seekToScene = (targetScene: number) => {
    stopPresentation();
    setScene(targetScene);
    setSubStep(0);
    setTypingText("");
    setDrawerOpen(null);
    // Calculate elapsed time
    let elapsed = 0;
    for (let i = 0; i < targetScene; i++) {
      elapsed += scenes[i].duration;
    }
    setElapsedTime(elapsed);
    setIsPlaying(true);
  };

  // Progress bar click handler
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const targetTime = percent * totalDuration;
    
    let accumulated = 0;
    for (let i = 0; i < scenes.length; i++) {
      if (accumulated + scenes[i].duration > targetTime) {
        seekToScene(i);
        return;
      }
      accumulated += scenes[i].duration;
    }
  };

  // Scene-specific actions
  useEffect(() => {
    if (!isPlaying) return;
    const sceneId = scenes[scene]?.id;

    // Reset drawer
    if (!sceneId?.includes("drawer")) setDrawerOpen(null);

    // Scene actions
    if (sceneId === "drawer-left") setDrawerOpen("left");
    if (sceneId === "drawer-right") setDrawerOpen("right");

    if (sceneId === "chat-plan-ask" && subStep === 0) {
      typeText("Organizzami le visite di oggi", 2500);
      setTimeout(() => speak("Organizzami le visite di oggi", true), 500);
    }

    if (sceneId === "chat-plan-response" && subStep === 0) {
      setTimeout(() => {
        speak("Ecco il piano ottimizzato. Hai 5 visite oggi. Prima tappa Bar Roma alle 9, poi Pizzeria Napoli, Hotel Centrale, Enoteca Verdi e Ristorante Milano. Percorso totale 38 chilometri. Consiglio: Bar Roma non ordina da 45 giorni.");
      }, 500);
    }

    if (sceneId === "chat-stats-ask" && subStep === 0) {
      typeText("Quanto ho fatturato questo mese?", 2000);
    }

    if (sceneId === "driving-active" && subStep === 0) {
      setTimeout(() => {
        speak("Prossima tappa: Bar Roma, a 2 chilometri. Tempo stimato 5 minuti. Ricorda: questo cliente preferisce i prodotti biologici.");
      }, 800);
    }

    if (sceneId === "visit-register" && subStep === 0) {
      setTimeout(() => {
        speak("Ordine 210 euro. Note: il cliente chiede campioni della nuova linea aperitivi.", true);
        typeText("€210 • Richiede campioni aperitivi", 3500);
      }, 800);
    }
  }, [isPlaying, scene, subStep]);

  // Scene progression
  useEffect(() => {
    if (!isPlaying) return;
    const currentScene = scenes[scene];
    if (!currentScene) {
      resetPresentation();
      return;
    }

    timerRef.current = setTimeout(() => {
      if (scene < scenes.length - 1) {
        setScene(s => s + 1);
        setSubStep(0);
        setTypingText("");
      } else {
        resetPresentation();
      }
    }, currentScene.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, scene]);

  // Sub-steps & elapsed time
  useEffect(() => {
    if (!isPlaying) return;
    subStepRef.current = setInterval(() => {
      setSubStep(s => s + 1);
      setElapsedTime(t => t + 800);
    }, 800);
    return () => {
      if (subStepRef.current) clearInterval(subStepRef.current);
    };
  }, [isPlaying, scene]);

  const currentSceneId = scenes[scene]?.id || "login";
  const progressPercent = (elapsedTime / totalDuration) * 100;

  // Format time
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative">
      {/* iPhone Frame */}
      <div className="relative mx-auto" style={{ width: "280px" }}>
        <div className="bg-slate-800 rounded-[3rem] p-2 shadow-2xl border-4 border-slate-700">
          <div className="bg-black rounded-[2.5rem] overflow-hidden relative">
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-700"></div>
            </div>

            {/* Screen content */}
            <div className="min-h-[480px] bg-slate-900 relative overflow-hidden">
              {/* Status bar */}
              <div className="pt-8 px-6 pb-2 flex justify-between items-center text-xs text-white relative z-10">
                <span>9:41</span>
                <div className="flex gap-1 items-center">
                  {isPlaying && <span className="text-green-400 text-[10px]">●DEMO</span>}
                  <span>📶</span>
                  <span>🔋</span>
                </div>
              </div>

              {/* LEFT DRAWER */}
              <div className={`absolute inset-y-0 left-0 w-[70%] bg-slate-800 z-30 transition-transform duration-300 ${drawerOpen === "left" ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="pt-12 px-3">
                  <p className="text-white font-bold text-sm mb-3">📜 Storico Chat</p>
                  <div className="space-y-2">
                    {["Piano visite lunedì", "Stats Verona", "Clienti inattivi", "Report settimana"].map((chat, i) => (
                      <div key={i} className={`bg-slate-700/50 p-2 rounded-lg text-xs text-slate-300 ${i === 0 ? "border border-blue-500/50" : ""}`}>
                        {chat}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT DRAWER */}
              <div className={`absolute inset-y-0 right-0 w-[75%] bg-slate-800 z-30 transition-transform duration-300 ${drawerOpen === "right" ? "translate-x-0" : "translate-x-full"}`}>
                <div className="pt-12 px-3">
                  <p className="text-white font-bold text-sm mb-3">⚙️ Menu</p>
                  <div className="space-y-1.5">
                    {[
                      { icon: "👥", label: "Clienti", desc: "Lista e schede" },
                      { icon: "📊", label: "Statistiche", desc: "Grafici e report" },
                      { icon: "🗺️", label: "Pianifica", desc: "Percorsi visite" },
                      { icon: "🚗", label: "Guida", desc: "Modalità hands-free" },
                      { icon: "📝", label: "Note", desc: "Appunti clienti" },
                      { icon: "⚙️", label: "Impostazioni", desc: "Preferenze" },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-700/50 p-2 rounded-lg flex items-center gap-2">
                        <span>{item.icon}</span>
                        <div>
                          <p className="text-white text-xs font-medium">{item.label}</p>
                          <p className="text-slate-400 text-[10px]">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SCENE: Login */}
              {currentSceneId === "login" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[400px]">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4">
                    <span className="text-white text-2xl font-bold">R</span>
                  </div>
                  <p className="text-white font-bold text-lg">REPING</p>
                  <p className="text-slate-400 text-xs mt-1">Accesso in corso...</p>
                  <div className="mt-4 w-32 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse" style={{ width: `${subStep * 25}%` }}></div>
                  </div>
                </div>
              )}

              {/* SCENE: Dashboard */}
              {currentSceneId === "dashboard" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-lg font-semibold">Buongiorno, Marco!</p>
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs">👤</div>
                  </div>
                  <p className="text-slate-400 text-xs mb-4">Mercoledì 11 Dicembre</p>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-blue-600/20 p-2 rounded-xl text-center border border-blue-500/30">
                      <div className="text-xl font-bold text-white">5</div>
                      <div className="text-[10px] text-slate-400">Visite oggi</div>
                    </div>
                    <div className="bg-green-600/20 p-2 rounded-xl text-center border border-green-500/30">
                      <div className="text-xl font-bold text-white">€24.5k</div>
                      <div className="text-[10px] text-slate-400">Mese</div>
                    </div>
                    <div className="bg-purple-600/20 p-2 rounded-xl text-center border border-purple-500/30">
                      <div className="text-xl font-bold text-white">127</div>
                      <div className="text-[10px] text-slate-400">Clienti</div>
                    </div>
                  </div>

                  <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-2.5 mb-3">
                    <p className="text-amber-300 text-xs font-medium">⚠️ Promemoria REPING</p>
                    <p className="text-white text-xs">Bar Roma: non ordina da 45 giorni</p>
                    <p className="text-white text-xs">Hotel Centrale: scadenza pagamento</p>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-2.5">
                    <p className="text-slate-400 text-[10px] mb-1">📈 Trend settimanale</p>
                    <div className="flex items-end gap-1 h-12">
                      {[40, 65, 45, 80, 60, 90, 75].map((h, i) => (
                        <div key={i} className="flex-1 bg-blue-500/60 rounded-t" style={{ height: `${h}%` }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE: Drawer Left (handled by drawer overlay) */}
              {currentSceneId === "drawer-left" && (
                <div className="px-4 animate-fadeIn opacity-50">
                  <p className="text-white text-lg font-semibold mb-4">Dashboard</p>
                  <p className="text-slate-400 text-xs">← Swipe per storico chat</p>
                </div>
              )}

              {/* SCENE: Drawer Right (handled by drawer overlay) */}
              {currentSceneId === "drawer-right" && (
                <div className="px-4 animate-fadeIn opacity-50">
                  <p className="text-white text-lg font-semibold mb-4">Dashboard</p>
                  <p className="text-slate-400 text-xs text-right">Menu funzioni →</p>
                </div>
              )}

              {/* SCENE: Clients List */}
              {currentSceneId === "clients-list" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">👥</span>
                    <span className="text-white font-medium">Clienti</span>
                    <span className="ml-auto text-slate-400 text-xs">127 totali</span>
                  </div>

                  <div className="bg-slate-800 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                    <span className="text-slate-500">🔍</span>
                    <span className="text-slate-400 text-xs">{subStep > 2 ? "Bar Roma" : "Cerca cliente..."}</span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { name: "Bar Roma", city: "Verona", status: "⚠️", highlight: subStep > 2 },
                      { name: "Pizzeria Napoli", city: "Verona", status: "✅" },
                      { name: "Hotel Centrale", city: "Verona", status: "💳" },
                      { name: "Enoteca Verdi", city: "Legnago", status: "✅" },
                      { name: "Rist. Milano", city: "Mantova", status: "✅" },
                    ].map((client, i) => (
                      <div key={i} className={`bg-slate-800 p-2.5 rounded-xl flex items-center gap-3 ${client.highlight ? "ring-2 ring-blue-500" : ""}`}>
                        <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs">🏪</div>
                        <div className="flex-1">
                          <p className="text-white text-xs font-medium">{client.name}</p>
                          <p className="text-slate-400 text-[10px]">{client.city}</p>
                        </div>
                        <span>{client.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SCENE: Client Detail */}
              {currentSceneId === "client-detail" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-slate-400 text-xs">←</span>
                    <span className="text-white font-medium">Bar Roma</span>
                    <span className="ml-auto bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full">45gg</span>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center">☕</div>
                      <div>
                        <p className="text-white text-sm font-medium">Bar Roma</p>
                        <p className="text-slate-400 text-xs">Via Mazzini 15, Verona</p>
                        <p className="text-blue-400 text-xs">📞 045 8012345</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-3 mb-3">
                    <p className="text-slate-400 text-[10px] mb-1">📝 Note personali</p>
                    <p className="text-white text-xs">Mario preferisce prodotti bio. Pagamento sempre puntuale. Interessato a linea aperitivi.</p>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-3">
                    <p className="text-slate-400 text-[10px] mb-2">📊 Ultimi ordini</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">26 Ott</span>
                        <span className="text-white font-medium">€185</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">12 Ott</span>
                        <span className="text-white font-medium">€220</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">28 Set</span>
                        <span className="text-white font-medium">€195</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE: Chat Plan Ask */}
              {currentSceneId === "chat-plan-ask" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">💬</span>
                    <span className="text-white font-medium">Chat REPING</span>
                    <div className="ml-auto bg-green-500/20 px-2 py-0.5 rounded-full">
                      <span className="text-green-400 text-[10px]">🎤 Voce</span>
                    </div>
                  </div>

                  {typingText && (
                    <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-sm text-sm ml-auto max-w-[85%] animate-slideInRight">
                      {typingText}
                      <span className="animate-pulse">|</span>
                    </div>
                  )}

                  <div className="absolute bottom-16 left-4 right-4">
                    <div className="bg-slate-800 rounded-full px-4 py-2 flex items-center gap-2 border border-slate-700">
                      <span className="text-slate-300 text-xs flex-1">{typingText || "Parla o scrivi..."}</span>
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-sm">🎤</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE: Chat Plan Response */}
              {currentSceneId === "chat-plan-response" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">💬</span>
                    <span className="text-white font-medium text-sm">Chat</span>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-blue-600 text-white p-2 rounded-2xl rounded-br-sm text-xs ml-auto max-w-[75%]">
                      Organizzami le visite di oggi
                    </div>

                    <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-sm max-w-[95%] animate-slideInLeft">
                      <p className="text-white text-xs font-medium mb-2">🗺️ Piano ottimizzato:</p>
                      <div className="space-y-1 text-[10px]">
                        {subStep > 0 && <p className="text-slate-300">1. 09:00 - Bar Roma ⚠️ <span className="text-slate-500">2km</span></p>}
                        {subStep > 1 && <p className="text-slate-300">2. 10:30 - Pizzeria Napoli <span className="text-slate-500">5km</span></p>}
                        {subStep > 2 && <p className="text-slate-300">3. 12:00 - Hotel Centrale <span className="text-slate-500">8km</span></p>}
                        {subStep > 3 && <p className="text-slate-300">4. 14:30 - Enoteca Verdi <span className="text-slate-500">12km</span></p>}
                        {subStep > 4 && <p className="text-slate-300">5. 16:00 - Rist. Milano <span className="text-slate-500">11km</span></p>}
                      </div>
                      {subStep > 5 && (
                        <div className="mt-2 pt-2 border-t border-slate-700 flex items-center gap-2">
                          <span className="text-green-400 text-[10px]">✓ 38km totali</span>
                          <span className="text-blue-400 text-[10px]">💡 Proponi aperitivi a Bar Roma</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE: Chat Stats Ask */}
              {currentSceneId === "chat-stats-ask" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">💬</span>
                    <span className="text-white font-medium">Chat</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="bg-slate-800 p-2 rounded-2xl rounded-bl-sm text-xs max-w-[80%] text-slate-300">
                      Piano visite confermato ✓
                    </div>

                    {typingText && (
                      <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-sm text-sm ml-auto max-w-[85%]">
                        {typingText}
                        <span className="animate-pulse">|</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SCENE: Chat Stats Response */}
              {currentSceneId === "chat-stats-response" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📊</span>
                    <span className="text-white font-medium text-sm">Statistiche</span>
                  </div>

                  <div className="bg-blue-600 text-white p-2 rounded-2xl rounded-br-sm text-xs ml-auto max-w-[80%] mb-2">
                    Quanto ho fatturato questo mese?
                  </div>

                  <div className="bg-slate-800 p-3 rounded-2xl animate-slideInLeft">
                    <div className="text-center mb-3">
                      <p className="text-slate-400 text-[10px]">Fatturato Dicembre</p>
                      <p className="text-white text-2xl font-bold">€24.580</p>
                      <p className="text-green-400 text-xs">+18% vs mese scorso</p>
                    </div>

                    <div className="bg-slate-900 rounded-lg p-2">
                      <div className="flex items-end justify-between h-16 gap-1">
                        {[45, 60, 55, 75, 65, 85, 70, 90, 80, 95, 88].map((h, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t" style={{ height: `${h}%` }}></div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1 text-[8px] text-slate-500">
                        <span>1 Dic</span>
                        <span>Oggi</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE: Proactive Alert */}
              {currentSceneId === "proactive-alert" && (
                <div className="px-4 animate-fadeIn">
                  <p className="text-white font-medium mb-3">💡 Suggerimenti REPING</p>

                  <div className="space-y-2">
                    <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-3 animate-slideInLeft">
                      <p className="text-amber-300 text-xs font-medium mb-1">⚠️ Clienti inattivi</p>
                      <p className="text-white text-xs">3 clienti non ordinano da 30+ giorni</p>
                      <p className="text-amber-400 text-[10px] mt-1">Tap per vedere lista →</p>
                    </div>

                    <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-3 animate-slideInLeft" style={{ animationDelay: "0.2s" }}>
                      <p className="text-blue-300 text-xs font-medium mb-1">📈 Opportunità</p>
                      <p className="text-white text-xs">Hotel Centrale ha aumentato ordini +40%</p>
                      <p className="text-blue-400 text-[10px] mt-1">Proponi upgrade quantità</p>
                    </div>

                    <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-3 animate-slideInLeft" style={{ animationDelay: "0.4s" }}>
                      <p className="text-green-300 text-xs font-medium mb-1">🎯 Obiettivo</p>
                      <p className="text-white text-xs">Mancano €5.420 al target mensile</p>
                      <p className="text-green-400 text-[10px] mt-1">4 giorni rimanenti</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE: Driving Start */}
              {currentSceneId === "driving-start" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[400px]">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <span className="text-3xl">🚗</span>
                  </div>
                  <p className="text-white font-bold text-lg mb-1">Modalità Guida</p>
                  <p className="text-slate-400 text-xs text-center mb-4">Interfaccia hands-free<br />REPING ti guida a voce</p>
                  <div className="bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-medium">
                    Avvia Modalità Guida
                  </div>
                </div>
              )}

              {/* SCENE: Driving Active */}
              {currentSceneId === "driving-active" && (
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-emerald-900 animate-fadeIn">
                  <div className="pt-12 px-4">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 px-4 py-1 rounded-full mb-4">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <span className="text-emerald-400 text-xs font-medium">GUIDA ATTIVA</span>
                      </div>
                    </div>

                    <div className="bg-slate-800/80 rounded-2xl p-4 mb-4">
                      <p className="text-slate-400 text-xs mb-1">Prossima tappa</p>
                      <p className="text-white text-xl font-bold">Bar Roma</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <p className="text-emerald-400 text-2xl font-bold">2 km</p>
                          <p className="text-slate-400 text-xs">~5 min</p>
                        </div>
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: "30%" }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-3">
                      <p className="text-blue-300 text-xs">💡 Ricorda</p>
                      <p className="text-white text-sm">Mario preferisce prodotti biologici</p>
                    </div>

                    <div className="absolute bottom-20 left-4 right-4">
                      <div className="bg-red-500/20 border border-red-500/50 rounded-full px-4 py-3 flex items-center justify-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-white text-sm font-medium">REPING sta parlando...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE: Visit Register */}
              {currentSceneId === "visit-register" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">☕</span>
                    <span className="text-white font-medium">Bar Roma</span>
                    <span className="ml-auto bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">Visita</span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-slate-400 text-[10px] mb-1">💰 Importo ordine</p>
                      <div className="bg-slate-900 rounded-lg p-2 text-white text-xl font-bold">
                        {typingText.includes("€") ? "€210" : "€___"}
                      </div>
                    </div>

                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-slate-400 text-[10px] mb-1">📝 Note vocali</p>
                      <div className="bg-slate-900 rounded-lg p-2 text-slate-300 text-xs min-h-[50px]">
                        {typingText.includes("campioni") ? "Richiede campioni della nuova linea aperitivi. Molto interessato." : (
                          <span className="text-slate-500">Dettatura...</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="bg-red-500/20 border border-red-500/50 rounded-full px-4 py-2 flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-300 text-xs">Registrazione vocale</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE: Visit Saved */}
              {currentSceneId === "visit-saved" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[400px]">
                  <div className="w-16 h-16 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">✓</span>
                  </div>
                  <p className="text-white font-bold text-lg mb-1">Visita salvata!</p>
                  <p className="text-slate-400 text-xs text-center mb-4">Bar Roma • €210</p>

                  <div className="bg-slate-800 rounded-xl p-3 w-full">
                    <p className="text-slate-400 text-[10px] mb-1">Prossima tappa</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">Pizzeria Napoli</p>
                        <p className="text-slate-400 text-xs">5 km • ~10 min</p>
                      </div>
                      <div className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs">
                        Naviga →
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE: Daily Report */}
              {currentSceneId === "daily-report" && (
                <div className="px-4 animate-fadeIn">
                  <p className="text-white text-lg font-semibold mb-1">Report Giornata</p>
                  <p className="text-slate-400 text-xs mb-4">Mercoledì 11 Dicembre</p>

                  <div className="bg-slate-800 rounded-xl p-4 mb-3 text-center">
                    <p className="text-white text-2xl font-bold">€1.850</p>
                    <p className="text-slate-400 text-xs">Fatturato oggi</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-800 p-3 rounded-xl text-center">
                      <div className="text-xl font-bold text-green-400">5/5</div>
                      <div className="text-[10px] text-slate-400">Visite</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-xl text-center">
                      <div className="text-xl font-bold text-blue-400">38km</div>
                      <div className="text-[10px] text-slate-400">Percorsi</div>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-3 text-center">
                    <p className="text-blue-300 text-xs">📤 Report inviato automaticamente</p>
                  </div>
                </div>
              )}

              {/* SCENE: Claim */}
              {currentSceneId === "claim" && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center animate-fadeIn rounded-b-[2.5rem]">
                  <div className="text-center px-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl font-bold">R</span>
                    </div>
                    <p className="text-white/80 text-sm mb-1">REPING</p>
                    <p className="text-white text-xl font-bold leading-tight">
                      Vendi di più,
                      <br />meglio e in meno tempo.
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                      <span className="text-white text-sm font-medium">Richiedi accesso Beta →</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
            </div>

            {/* Play overlay when stopped at start */}
            {!isPlaying && scene === 0 && elapsedTime === 0 && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-[2.5rem]">
                <button
                  onClick={startPresentation}
                  className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center hover:scale-110 transition shadow-lg"
                >
                  <span className="text-white text-3xl ml-1">▶</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Controls bar */}
        <div className="mt-4 bg-slate-800 rounded-xl p-3">
          {/* Progress bar (clickable) */}
          <div
            className="h-2 bg-slate-700 rounded-full overflow-hidden cursor-pointer mb-2"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>

          {/* Time & controls */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-mono">
              {formatTime(elapsedTime)} / {formatTime(totalDuration)}
            </span>

            <div className="flex items-center gap-2">
              {/* Rewind */}
              <button
                onClick={() => seekToScene(Math.max(0, scene - 1))}
                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition"
                title="Scena precedente"
              >
                <span className="text-white text-xs">⏮</span>
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition"
              >
                <span className="text-white text-lg">{isPlaying ? "⏸" : "▶"}</span>
              </button>

              {/* Forward */}
              <button
                onClick={() => seekToScene(Math.min(scenes.length - 1, scene + 1))}
                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition"
                title="Scena successiva"
              >
                <span className="text-white text-xs">⏭</span>
              </button>

              {/* Reset */}
              <button
                onClick={resetPresentation}
                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition"
                title="Ricomincia"
              >
                <span className="text-white text-xs">↺</span>
              </button>
            </div>

            <span className="text-slate-500 text-[10px] w-16 text-right">
              {scenes[scene]?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Hint */}
      {!isPlaying && scene === 0 && elapsedTime === 0 && (
        <div className="text-center mt-4 text-slate-500 text-xs">
          🔊 Demo interattiva • Clicca ▶ per avviare
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
            Accedi all'app
          </a>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="pt-40 pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Testo */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Il tuo AI CoPilot
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400"> alle Vendite</span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Vendi di più, meglio e in meno tempo.
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
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-xl hover:opacity-90 transition shadow-lg"
                >
                  Richiedi Accesso Beta
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap items-center gap-3 text-sm">
                <div className="bg-slate-700/50 text-slate-300 px-3 py-1.5 rounded-full">Dati cifrati E2E</div>
                <div className="bg-slate-700/50 text-slate-300 px-3 py-1.5 rounded-full">Made in Italy</div>
                <div className="bg-slate-700/50 text-slate-300 px-3 py-1.5 rounded-full">Hands-free</div>
                <div className="bg-slate-700/50 text-slate-300 px-3 py-1.5 rounded-full">GDPR compliant</div>
                <div className="bg-slate-700/50 text-slate-300 px-3 py-1.5 rounded-full">Statistiche</div>
                <div className="bg-slate-700/50 text-slate-300 px-3 py-1.5 rounded-full">Suggerimenti</div>
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
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Quanto pesano queste difficoltà nel tuo lavoro?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "⏰", title: "Pianificazione lenta", desc: "Perdi tempo a gestire la pianificazione delle attività" },
              { icon: "📋", title: "Info frammentate", desc: "Non hai tutte le info utili per la vendita a portata di mano" },
              { icon: "🚗", title: "Guida pericolosa", desc: "Rischio incidenti per guardare e maneggiare uno schermo" },
              { icon: "📊", title: "Visione debole", desc: "Poco orientato verso l'obiettivo finale" },
              { icon: "🗺️", title: "Percorsi inefficienti", desc: "Non sei certo della tua pianificazione" },
              { icon: "🎯", title: "Scarsa personalizzazione", desc: "Non hai tempo e info sufficienti per migliorare la qualità del servizio clienti" },
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
              AI CoPilot che capisce il tuo lavoro e ti supporta in molti modi.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: "", title: "Info sottomano", desc: "Tutti i dati sempre immediatamente accessibili, anche solo con una domanda.", bg: "from-blue-50 to-white border-blue-100" },
              { icon: "", title: "Elaborazioni dati", desc: "Analisi automatiche: fatturato, visite, trend. Chiedi e REPING calcola.", bg: "from-green-50 to-white border-green-100" },
              { icon: "", title: "Note personalizzate", desc: "Appunti e promemoria per vendite mirate. Mai più dimenticare un dettaglio.", bg: "from-purple-50 to-white border-purple-100" },
              { icon: "", title: "Consigli strategici", desc: "Indicazioni operative basate sui tuoi dati. L'AI suggerisce, tu decidi.", bg: "from-yellow-50 to-white border-yellow-100" },
              { icon: "", title: "Percorsi ottimizzati", desc: "Risparmia km e tempo. REPING pianifica i giri più efficienti.", bg: "from-red-50 to-white border-red-100" },
              { icon: "", title: "Modalità Guida", desc: "Guida in sicurezza, REPING dialoga con te! Hands-free totale.", bg: "from-indigo-50 to-white border-indigo-100" },
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
Interazione classica con interfaccia grafica, arricchita da
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
                <div className="text-lg font-semibold text-slate-700">Contatto</div>
                <a 
                  href="mailto:info@reping.it?subject=Richiesta informazioni Enterprise" 
                  className="text-blue-600 hover:text-blue-800 font-bold text-xl"
                >
                  info@reping.it
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
              🚀 BETA PER PRO SELEZIONATI
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Candidati al programma Beta
            </h2>
            <p className="text-slate-300 text-lg">
              Cerchiamo <strong className="text-white">10 agenti di commercio qualificati</strong> per testare REPING.
              <br />
              Se selezionato: <strong className="text-amber-400">BUSINESS GRATUITO per 1 anno</strong> + supporto diretto con il team.
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
                  Problemi? Scrivi a{" "}
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
