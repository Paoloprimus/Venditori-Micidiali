// app/site/demo.tsx
// Animated Demo Presentation - SCENEGGIATURA v3
// ~70 secondi, 13 scene, focus su: Import → Proattività → Problema → Soluzione → Guida → Report → Sicurezza

"use client";

import { useState, useEffect, useRef } from "react";

export default function AnimatedMockup() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scene, setScene] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const subStepRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef<NodeJS.Timeout | null>(null);
  const sceneTimerRef = useRef<NodeJS.Timeout | null>(null);

  // SCENEGGIATURA v3 - 13 scene, ~70 secondi
  const scenes = [
    // BLOCCO 0: IMPORT (5s)
    { id: 0, duration: 5000, label: "Import", visualId: "import-data" },
    
    // BLOCCO 1: PROATTIVITÀ (5s) - NUOVO!
    { id: 1, duration: 5000, label: "Proattivo", visualId: "proactive-alert" },
    
    // BLOCCO 2: IL PROBLEMA (8s)
    { id: 2, duration: 4000, label: "Chaos", visualId: "morning-chaos" },
    { id: 3, duration: 4000, label: "Domanda", visualId: "chat-question" },
    
    // BLOCCO 3: PIANIFICAZIONE (12s)
    { id: 4, duration: 6000, label: "Piano", visualId: "chat-plan" },
    { id: 5, duration: 6000, label: "Dettaglio", visualId: "client-detail" },
    
    // BLOCCO 4: GUIDA (10s)
    { id: 6, duration: 5000, label: "Guida", visualId: "driving-start" },
    { id: 7, duration: 5000, label: "Hands-free", visualId: "driving-active" },
    
    // BLOCCO 5: POST-VISITA (10s)
    { id: 8, duration: 5000, label: "Registra", visualId: "visit-record" },
    { id: 9, duration: 5000, label: "Salvato", visualId: "visit-saved" },
    
    // BLOCCO 6: FINE GIORNATA (6s)
    { id: 10, duration: 6000, label: "Report", visualId: "daily-report" },
    
    // BLOCCO 7: SICUREZZA (4s) - NUOVO!
    { id: 11, duration: 4000, label: "Sicurezza", visualId: "security" },
    
    // CLOSING (5s)
    { id: 12, duration: 5000, label: "Claim", visualId: "claim" },
  ];

  const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);

  // Typing animation
  const typeText = (fullText: string, duration: number) => {
    setTypingText("");
    const chars = fullText.split("");
    const interval = Math.max(30, duration / chars.length);
    chars.forEach((char, i) => {
      setTimeout(() => setTypingText(prev => prev + char), i * interval);
    });
  };

  // Stop all timers
  const stopPresentation = () => {
    setIsPlaying(false);
    if (subStepRef.current) clearInterval(subStepRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
  };

  // Reset to beginning
  const resetPresentation = () => {
    stopPresentation();
    setScene(0);
    setSubStep(0);
    setTypingText("");
    setElapsedTime(0);
  };

  // Start from beginning
  const startPresentation = () => {
    resetPresentation();
    setIsPlaying(true);
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (isPlaying) {
      stopPresentation();
    } else {
      setIsPlaying(true);
    }
  };

  // Seek to specific scene
  const seekToScene = (targetScene: number) => {
    stopPresentation();
    setScene(targetScene);
    setSubStep(0);
    setTypingText("");
    
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

  // Scene progression timer
  useEffect(() => {
    if (!isPlaying) return;
    
    const currentScene = scenes[scene];
    if (!currentScene) return;
    
    sceneTimerRef.current = setTimeout(() => {
      if (scene < scenes.length - 1) {
        setScene(s => s + 1);
        setSubStep(0);
        setTypingText("");
      } else {
        resetPresentation();
      }
    }, currentScene.duration);
    
    return () => {
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    };
  }, [isPlaying, scene]);

  // Scene-specific animations
  useEffect(() => {
    if (!isPlaying) return;
    
    const visualId = scenes[scene]?.visualId;
    const duration = scenes[scene]?.duration || 5000;
    
    switch (visualId) {
      case "chat-question":
        typeText("Cosa devo fare oggi?", duration * 0.7);
        break;
      case "visit-record":
        setTimeout(() => typeText("€210 • Vuole campioni crostatine", duration * 0.6), 1000);
        break;
    }
  }, [isPlaying, scene]);

  // Sub-steps animation
  useEffect(() => {
    if (!isPlaying) return;
    
    subStepRef.current = setInterval(() => {
      setSubStep(s => s + 1);
    }, 500);
    
    return () => {
      if (subStepRef.current) clearInterval(subStepRef.current);
    };
  }, [isPlaying, scene]);

  // Elapsed time tracker
  useEffect(() => {
    if (!isPlaying) return;
    
    elapsedRef.current = setInterval(() => {
      setElapsedTime(t => t + 100);
    }, 100);
    
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [isPlaying]);

  const currentVisualId = scenes[scene]?.visualId || "import-data";
  const progressPercent = totalDuration > 0 ? (elapsedTime / totalDuration) * 100 : 0;

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
                  {isPlaying && (
                    <span className="text-[10px] text-green-400">● DEMO</span>
                  )}
                  <span>📶</span>
                  <span>🔋</span>
                </div>
              </div>

              {/* ========== SCENA 0: IMPORT DATA ========== */}
              {currentVisualId === "import-data" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[400px]">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4">
                    <span className="text-white text-3xl">📄</span>
                  </div>
                  <p className="text-white font-bold text-lg mb-2">Inizia in 2 minuti</p>
                  <p className="text-slate-400 text-xs text-center mb-4 px-4">
                    Carica il tuo Excel o CSV con i clienti.
                    <br />
                    <span className="text-cyan-400">REPING fa tutto il resto.</span>
                  </p>
                  
                  {subStep > 2 && (
                    <div className="bg-slate-800 rounded-xl p-3 w-full max-w-[200px] animate-slideInLeft">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-green-400">✓</span>
                        <span className="text-white text-xs">clienti.xlsx caricato</span>
                      </div>
                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 transition-all" style={{ width: `${Math.min(subStep * 15, 100)}%` }}></div>
                      </div>
                      <p className="text-slate-500 text-[10px] mt-1">127 clienti importati</p>
                    </div>
                  )}
                </div>
              )}

              {/* ========== SCENA 1: PROACTIVE ALERT (NUOVO!) ========== */}
              {currentVisualId === "proactive-alert" && (
                <div className="px-4 animate-fadeIn">
                  <p className="text-slate-400 text-xs mb-3">Il giorno dopo...</p>
                  
                  {/* Notifica push */}
                  <div className="bg-slate-800 rounded-2xl p-3 mb-3 border border-slate-700 animate-slideInLeft">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">R</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white text-xs font-medium">REPING</span>
                          <span className="text-slate-500 text-[10px]">ora</span>
                        </div>
                        <p className="text-white text-sm font-medium">⚠️ Bar Roma non ordina da 45 giorni</p>
                        <p className="text-slate-400 text-xs mt-1">Priorità alta • Media ordini: €200</p>
                      </div>
                    </div>
                  </div>

                  {subStep > 2 && (
                    <div className="bg-slate-800 rounded-2xl p-3 mb-3 border border-slate-700 animate-slideInLeft">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">R</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm">💡 Hotel Centrale ha ordinato meno del solito</p>
                          <p className="text-slate-400 text-xs mt-1">-40% vs media trimestrale</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {subStep > 5 && (
                    <div className="text-center mt-4">
                      <p className="text-cyan-400 text-sm font-medium animate-pulse">
                        🧠 REPING ti avvisa PRIMA
                      </p>
                      <p className="text-slate-500 text-xs mt-1">Non aspetta che tu lo chieda</p>
                    </div>
                  )}
                </div>
              )}

              {/* ========== SCENA 2: MORNING CHAOS ========== */}
              {currentVisualId === "morning-chaos" && (
                <div className="px-4 animate-fadeIn">
                  <p className="text-slate-400 text-xs mb-3">Sono le 8 di mattina...</p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-2">
                      <span className="text-xs">📊</span>
                      <p className="text-[10px] text-red-300">Excel</p>
                    </div>
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2">
                      <span className="text-xs">💬</span>
                      <p className="text-[10px] text-green-300">WhatsApp</p>
                    </div>
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-2">
                      <span className="text-xs">📝</span>
                      <p className="text-[10px] text-yellow-300">Appunti</p>
                    </div>
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-2">
                      <span className="text-xs">📱</span>
                      <p className="text-[10px] text-blue-300">Telefono</p>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-3 text-center">
                    <p className="text-white text-sm mb-1">8 visite da pianificare</p>
                    <p className="text-slate-400 text-xs">Chi non ordina da settimane?</p>
                    <p className="text-slate-400 text-xs">Quale giro fare?</p>
                  </div>

                  {subStep > 3 && (
                    <div className="mt-4 text-center animate-pulse">
                      <p className="text-cyan-400 text-sm font-medium">E se bastasse chiedere?</p>
                    </div>
                  )}
                </div>
              )}

              {/* ========== SCENA 3: CHAT QUESTION ========== */}
              {currentVisualId === "chat-question" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">💬</span>
                    <span className="text-white font-medium">Chat REPING</span>
                  </div>

                  {typingText && (
                    <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-sm text-sm ml-auto max-w-[85%] animate-slideInRight">
                      {typingText}
                      <span className="animate-pulse">|</span>
                    </div>
                  )}

                  <div className="absolute bottom-16 left-4 right-4">
                    <div className="bg-slate-800 rounded-full px-4 py-2 flex items-center gap-2 border border-blue-500/50">
                      <span className="text-slate-300 text-xs flex-1">{typingText || "Parla o scrivi..."}</span>
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-sm">🎤</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== SCENA 4: CHAT PLAN ========== */}
              {currentVisualId === "chat-plan" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">💬</span>
                    <span className="text-white font-medium text-sm">Chat</span>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-blue-600 text-white p-2 rounded-2xl rounded-br-sm text-xs ml-auto max-w-[75%]">
                      Cosa devo fare oggi?
                    </div>

                    <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-sm max-w-[95%] animate-slideInLeft">
                      <p className="text-white text-xs font-medium mb-2">📋 Hai 8 visite oggi:</p>
                      <div className="space-y-1 text-[10px]">
                        {subStep > 0 && <p className="text-amber-400">1. Bar Roma ⚠️ 45gg senza ordini</p>}
                        {subStep > 1 && <p className="text-slate-300">2. Pizzeria Napoli</p>}
                        {subStep > 2 && <p className="text-slate-300">3. Hotel Centrale</p>}
                        {subStep > 3 && <p className="text-slate-300">4. Enoteca Verdi</p>}
                        {subStep > 4 && <p className="text-slate-400">+ altre 4...</p>}
                      </div>
                      {subStep > 6 && (
                        <div className="mt-2 pt-2 border-t border-slate-700">
                          <p className="text-cyan-400 text-[10px]">💡 Inizia da Bar Roma: è prioritario</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ========== SCENA 5: CLIENT DETAIL ========== */}
              {currentVisualId === "client-detail" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-slate-400 text-xs">←</span>
                    <span className="text-white font-medium">Bar Roma</span>
                    <span className="text-emerald-400 text-[10px]">🔐</span>
                    <span className="ml-auto bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full">⚠️ 45gg</span>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center">☕</div>
                      <div>
                        <p className="text-white text-sm font-medium">Bar Roma</p>
                        <p className="text-slate-400 text-xs">Via Mazzini 15, Verona</p>
                        <p className="text-blue-400 text-xs">📞 045 8012345</p>
                      </div>
                    </div>
                  </div>

                  {subStep > 2 && (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 mb-3 animate-slideInLeft">
                      <p className="text-cyan-400 text-xs font-medium mb-1">💡 Suggerimento AI</p>
                      <p className="text-white text-xs">Mario preferisce prodotti bio. Proponigli la nuova linea biologica!</p>
                    </div>
                  )}

                  {subStep > 4 && (
                    <div className="bg-slate-800 rounded-xl p-3 animate-slideInLeft">
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
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========== SCENA 6: DRIVING START ========== */}
              {currentVisualId === "driving-start" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[400px]">
                  <div className={`w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-4 ${subStep > 2 ? "animate-pulse" : ""}`}>
                    <span className="text-3xl">🚗</span>
                  </div>
                  <p className="text-white font-bold text-lg mb-1">Modalità Guida</p>
                  <p className="text-slate-400 text-xs text-center mb-4">
                    Zero distrazioni.
                    <br />
                    REPING ti guida a voce.
                  </p>
                  {subStep > 3 && (
                    <div className="bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-medium animate-pulse">
                      GUIDA ATTIVA
                    </div>
                  )}
                </div>
              )}

              {/* ========== SCENA 7: DRIVING ACTIVE ========== */}
              {currentVisualId === "driving-active" && (
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
                      <p className="text-slate-400 text-xs mt-1">Via Mazzini 15, Verona</p>
                    </div>

                    {subStep > 3 && (
                      <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-3 animate-slideInLeft">
                        <p className="text-blue-300 text-xs">💡 Ricorda</p>
                        <p className="text-white text-sm">Mario preferisce prodotti biologici</p>
                      </div>
                    )}

                    <div className="absolute bottom-20 left-4 right-4">
                      <div className="bg-purple-500/20 border border-purple-500/50 rounded-full px-4 py-3 flex items-center justify-center gap-2">
                        <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
                        <span className="text-white text-sm font-medium">REPING sta parlando...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== SCENA 8: VISIT RECORD ========== */}
              {currentVisualId === "visit-record" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">☕</span>
                    <span className="text-white font-medium">Bar Roma</span>
                    <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">🎤 REC</span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-slate-400 text-[10px] mb-1">💰 Importo</p>
                      <div className="bg-slate-900 rounded-lg p-2 text-white text-xl font-bold">
                        {typingText.includes("€") ? "€210" : "€___"}
                      </div>
                    </div>

                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-slate-400 text-[10px] mb-1">📝 Note vocali</p>
                      <div className="bg-slate-900 rounded-lg p-2 text-slate-300 text-xs min-h-[40px]">
                        {typingText.includes("campioni") ? "Vuole campioni crostatine" : (
                          <span className="text-slate-500 animate-pulse">Dettatura...</span>
                        )}
                      </div>
                    </div>

                    {/* Audio waveform */}
                    <div className="flex justify-center items-center gap-1 h-6">
                      {[3, 5, 8, 6, 9, 4, 7, 5, 8, 6].map((h, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-red-500 rounded-full animate-pulse" 
                          style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ========== SCENA 9: VISIT SAVED ========== */}
              {currentVisualId === "visit-saved" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[400px]">
                  <div className="w-16 h-16 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl text-green-400">✓</span>
                  </div>
                  <p className="text-white font-bold text-lg mb-1">Visita salvata!</p>
                  <p className="text-slate-400 text-xs text-center mb-4">Bar Roma • €210</p>

                  {subStep > 2 && (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 w-full animate-slideInLeft">
                      <p className="text-cyan-400 text-xs font-medium mb-1">🔔 Reminder creato</p>
                      <p className="text-white text-xs">Invia campioni crostatine entro venerdì</p>
                    </div>
                  )}

                  {subStep > 4 && (
                    <div className="bg-slate-800 rounded-xl p-3 w-full mt-3 animate-slideInLeft">
                      <p className="text-slate-400 text-[10px] mb-1">Prossima tappa</p>
                      <p className="text-white text-sm font-medium">Pizzeria Napoli →</p>
                    </div>
                  )}
                </div>
              )}

              {/* ========== SCENA 10: DAILY REPORT ========== */}
              {currentVisualId === "daily-report" && (
                <div className="px-4 animate-fadeIn">
                  <p className="text-white text-lg font-semibold mb-1">📊 Fine giornata</p>
                  <p className="text-slate-400 text-xs mb-4">REPING ha tracciato tutto</p>

                  <div className="bg-slate-800 rounded-xl p-4 mb-3 text-center">
                    <p className="text-white text-2xl font-bold">€1.850</p>
                    <p className="text-slate-400 text-xs">Fatturato oggi</p>
                    <p className="text-green-400 text-xs mt-1">+12% vs media</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-800 p-2 rounded-xl text-center">
                      <div className="text-lg font-bold text-green-400">8/8</div>
                      <div className="text-[10px] text-slate-400">Visite ✓</div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-xl text-center">
                      <div className="text-lg font-bold text-blue-400">3</div>
                      <div className="text-[10px] text-slate-400">Reminder</div>
                    </div>
                  </div>

                  {subStep > 4 && (
                    <div className="bg-purple-500/20 border border-purple-500/40 rounded-xl p-3 text-center animate-slideInLeft">
                      <p className="text-purple-300 text-xs">🧠 REPING impara</p>
                      <p className="text-white text-xs">Domani sarà ancora più intelligente</p>
                    </div>
                  )}
                </div>
              )}

              {/* ========== SCENA 11: SECURITY (NUOVO!) ========== */}
              {currentVisualId === "security" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[400px]">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">🔐</span>
                  </div>
                  <p className="text-white font-bold text-lg mb-2">I tuoi dati, solo tuoi</p>
                  <p className="text-slate-400 text-xs text-center mb-4 px-4">
                    Crittografia end-to-end.
                    <br />
                    <span className="text-emerald-400">Nemmeno noi possiamo leggerli.</span>
                  </p>
                  
                  {subStep > 2 && (
                    <div className="space-y-2 w-full max-w-[200px]">
                      <div className="bg-slate-800 rounded-lg p-2 flex items-center gap-2 animate-slideInLeft">
                        <span className="text-green-400">✓</span>
                        <span className="text-slate-300 text-xs">Clienti cifrati</span>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2 flex items-center gap-2 animate-slideInLeft" style={{ animationDelay: "0.1s" }}>
                        <span className="text-green-400">✓</span>
                        <span className="text-slate-300 text-xs">Visite cifrate</span>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2 flex items-center gap-2 animate-slideInLeft" style={{ animationDelay: "0.2s" }}>
                        <span className="text-green-400">✓</span>
                        <span className="text-slate-300 text-xs">Note cifrate</span>
                      </div>
                    </div>
                  )}

                  {subStep > 5 && (
                    <p className="text-emerald-400 text-xs mt-4 animate-pulse">GDPR compliant</p>
                  )}
                </div>
              )}

              {/* ========== SCENA 12: CLAIM ========== */}
              {currentVisualId === "claim" && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center animate-fadeIn rounded-b-[2.5rem]">
                  <div className="text-center px-6">
                    <div className={`w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${subStep > 2 ? "animate-pulse" : ""}`}>
                      <span className="text-white text-2xl font-bold">R</span>
                    </div>
                    <p className="text-white/80 text-sm mb-1">REPING</p>
                    
                    {subStep > 2 && (
                      <p className="text-white text-lg font-bold leading-tight animate-fadeIn">
                        L'AI che impara da te.
                        <br />
                        <span className="text-cyan-300">Ogni giorno più intelligente.</span>
                      </p>
                    )}

                    {subStep > 3 && (
                      <p className="text-white/60 text-xs mt-2 animate-fadeIn">
                        🔐 Solo tu puoi vedere i tuoi dati
                      </p>
                    )}
                    
                    {subStep > 5 && (
                      <div className="mt-5 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full animate-pulse">
                        <span className="text-white text-sm font-medium">Richiedi accesso Beta →</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
            </div>

            {/* Play overlay */}
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
          {/* Progress bar */}
          <div
            className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2 cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>

          {/* Time & controls */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-mono">
              {formatTime(elapsedTime)} / {formatTime(totalDuration)}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => seekToScene(Math.max(0, scene - 1))}
                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition"
              >
                <span className="text-white text-xs">⏮</span>
              </button>

              <button
                onClick={togglePlayPause}
                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition"
              >
                <span className="text-white text-lg">{isPlaying ? "⏸" : "▶"}</span>
              </button>

              <button
                onClick={() => seekToScene(Math.min(scenes.length - 1, scene + 1))}
                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition"
              >
                <span className="text-white text-xs">⏭</span>
              </button>

              <button
                onClick={resetPresentation}
                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition"
              >
                <span className="text-white text-xs">↺</span>
              </button>
            </div>

            <span className="text-slate-500 text-[10px] w-16 text-right">
              {scenes[scene]?.label || "..."}
            </span>
          </div>
        </div>
      </div>

      {/* Hint */}
      {!isPlaying && scene === 0 && elapsedTime === 0 && (
        <div className="text-center mt-4 text-slate-500 text-xs">
          Clicca ▶ per vedere la demo (~1 min)
        </div>
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideInLeft { animation: slideInLeft 0.4s ease-out; }
        .animate-slideInRight { animation: slideInRight 0.4s ease-out; }
      `}</style>
    </div>
  );
}
