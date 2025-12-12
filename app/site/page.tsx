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

// Animated Demo Presentation - iPhone Style - MP3 AUDIO SYNC VERSION
function AnimatedMockup() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scene, setScene] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState<"left" | "right" | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [audioDurations, setAudioDurations] = useState<number[]>([]);
  
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const subStepRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef<NodeJS.Timeout | null>(null);

  // Scene definitions from demo.csv (17 scenes)
  const scenes = [
    { id: 1, file: "narratore1.mp3", type: "narrator", label: "Intro", visualId: "login-dashboard" },
    { id: 2, file: "narratore2.mp3", type: "narrator", label: "Dashboard", visualId: "dashboard" },
    { id: 3, file: "narratore3.mp3", type: "narrator", label: "Drawer", visualId: "drawers" },
    { id: 4, file: "narratore4.mp3", type: "narrator", label: "Cliente", visualId: "client-detail" },
    { id: 5, file: "utente5.mp3", type: "user", label: "Domanda", visualId: "chat-ask-visits" },
    { id: 6, file: "reping6.mp3", type: "reping", label: "Piano", visualId: "chat-visits-response" },
    { id: 7, file: "utente7.mp3", type: "user", label: "Stats", visualId: "chat-ask-stats" },
    { id: 8, file: "reping8.mp3", type: "reping", label: "Fatturato", visualId: "chat-stats-response" },
    { id: 9, file: "narratore9.mp3", type: "narrator", label: "Proattivo", visualId: "proactive-alerts" },
    { id: 10, file: "narratore10.mp3", type: "narrator", label: "Guida", visualId: "driving-start" },
    { id: 11, file: "reping11.mp3", type: "reping", label: "Navigazione", visualId: "driving-active" },
    { id: 12, file: "narratore12.mp3", type: "narrator", label: "Registra", visualId: "visit-form" },
    { id: 13, file: "utente13.mp3", type: "user", label: "Dettatura", visualId: "visit-dictation" },
    { id: 14, file: "reping14.mp3", type: "reping", label: "Salvato", visualId: "visit-saved" },
    { id: 15, file: "narratore15.mp3", type: "narrator", label: "Report", visualId: "daily-report" },
    { id: 16, file: "utente16.mp3", type: "user", label: "Testimonianza", visualId: "testimonial" },
    { id: 17, file: "narratore17.mp3", type: "narrator", label: "Claim", visualId: "claim" },
  ];

  // Preload all audio files
  useEffect(() => {
    const loadAudios = async () => {
      const durations: number[] = [];
      const audios: HTMLAudioElement[] = [];
      
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        const audio = new Audio(`/demo/${s.file}`);
        audio.preload = "auto";
        
        await new Promise<void>((resolve) => {
          audio.addEventListener("loadedmetadata", () => {
            durations.push(audio.duration * 1000); // Convert to ms
            setLoadingProgress(Math.round(((i + 1) / scenes.length) * 100));
            resolve();
          });
          audio.addEventListener("error", () => {
            console.warn(`Failed to load ${s.file}, using fallback duration`);
            durations.push(8000); // Fallback 8s
            setLoadingProgress(Math.round(((i + 1) / scenes.length) * 100));
            resolve();
          });
          // Force load
          audio.load();
        });
        
        audios.push(audio);
      }
      
      audioRefs.current = audios;
      setAudioDurations(durations);
      setIsLoaded(true);
    };
    
    loadAudios();
    
    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  const totalDuration = audioDurations.length > 0 
    ? audioDurations.reduce((acc, d) => acc + d, 0) 
    : 90000; // Fallback ~90s

  // Get duration for current scene
  const getSceneDuration = (sceneIndex: number) => {
    return audioDurations[sceneIndex] || 8000;
  };

  // Typing animation
  const typeText = (fullText: string, duration: number) => {
    setTypingText("");
    const chars = fullText.split("");
    const interval = Math.max(30, duration / chars.length);
    chars.forEach((char, i) => {
      setTimeout(() => setTypingText(prev => prev + char), i * interval);
    });
  };

  // Stop all audio and timers
  const stopPresentation = () => {
    setIsPlaying(false);
    
    // Stop current audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    
    // Clear timers
    if (subStepRef.current) clearInterval(subStepRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
  };

  // Reset to beginning
  const resetPresentation = () => {
    stopPresentation();
    setScene(0);
    setSubStep(0);
    setTypingText("");
    setElapsedTime(0);
    setDrawerOpen(null);
    
    // Reset all audios
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  };

  // Start from beginning
  const startPresentation = () => {
    if (!isLoaded) return;
    resetPresentation();
    setIsPlaying(true);
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!isLoaded) return;
    
    if (isPlaying) {
      stopPresentation();
    } else {
      setIsPlaying(true);
    }
  };

  // Seek to specific scene
  const seekToScene = (targetScene: number) => {
    if (!isLoaded) return;
    
    stopPresentation();
    setScene(targetScene);
    setSubStep(0);
    setTypingText("");
    setDrawerOpen(null);
    
    // Calculate elapsed time up to this scene
    let elapsed = 0;
    for (let i = 0; i < targetScene; i++) {
      elapsed += getSceneDuration(i);
    }
    setElapsedTime(elapsed);
    
    // Reset all audios
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    setIsPlaying(true);
  };

  // Progress bar click handler
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLoaded) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const targetTime = percent * totalDuration;
    
    let accumulated = 0;
    for (let i = 0; i < scenes.length; i++) {
      const dur = getSceneDuration(i);
      if (accumulated + dur > targetTime) {
        seekToScene(i);
        return;
      }
      accumulated += dur;
    }
  };

  // Play audio for current scene
  useEffect(() => {
    if (!isPlaying || !isLoaded) return;
    
    const audio = audioRefs.current[scene];
    if (!audio) return;
    
    currentAudioRef.current = audio;
    audio.currentTime = 0;
    audio.play().catch(err => console.warn("Audio play failed:", err));
    
    // When audio ends, go to next scene
    const handleEnded = () => {
      if (scene < scenes.length - 1) {
        setScene(s => s + 1);
        setSubStep(0);
        setTypingText("");
      } else {
        resetPresentation();
      }
    };
    
    audio.addEventListener("ended", handleEnded);
    
    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isPlaying, scene, isLoaded]);

  // Scene-specific visual actions
  useEffect(() => {
    if (!isPlaying) return;
    
    const visualId = scenes[scene]?.visualId;
    const duration = getSceneDuration(scene);
    
    // Reset drawer for non-drawer scenes
    if (visualId !== "drawers") setDrawerOpen(null);
    
    // Scene-specific animations
    switch (visualId) {
      case "drawers":
        // Show left drawer first, then right
        setDrawerOpen("left");
        setTimeout(() => setDrawerOpen(null), duration * 0.4);
        setTimeout(() => setDrawerOpen("right"), duration * 0.5);
        setTimeout(() => setDrawerOpen(null), duration * 0.9);
        break;
        
      case "chat-ask-visits":
        typeText("Che visite ho in programma oggi?", duration * 0.7);
        break;
        
      case "chat-ask-stats":
        typeText("Quanto ho fatturato questo mese?", duration * 0.6);
        break;
        
      case "visit-dictation":
        typeText("€210 • Richiede campioni crostatine. Molto interessato.", duration * 0.8);
        break;
    }
  }, [isPlaying, scene, audioDurations]);

  // Sub-steps animation (for progressive content reveal)
  useEffect(() => {
    if (!isPlaying) return;
    
    subStepRef.current = setInterval(() => {
      setSubStep(s => s + 1);
    }, 600);
    
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

  const currentVisualId = scenes[scene]?.visualId || "login-dashboard";
  const currentType = scenes[scene]?.type || "narrator";
  const progressPercent = totalDuration > 0 ? (elapsedTime / totalDuration) * 100 : 0;

  // Format time display
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
                    <span className={`text-[10px] ${currentType === "reping" ? "text-purple-400" : currentType === "user" ? "text-blue-400" : "text-green-400"}`}>
                      ●{currentType === "reping" ? "REPING" : currentType === "user" ? "UTENTE" : "DEMO"}
                    </span>
                  )}
                  <span>📶</span>
                  <span>🔋</span>
                </div>
              </div>

              {/* LEFT DRAWER */}
              <div className={`absolute inset-y-0 left-0 w-[70%] bg-slate-800 z-30 transition-transform duration-300 ${drawerOpen === "left" ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="pt-12 px-3">
                  <p className="text-white font-bold text-sm mb-3">📜 Storico Chat</p>
                  <div className="space-y-2">
                    {["Piano visite lunedì", "Stats Verona", "Clienti inattivi", "Report settimana", "Analisi trimestrale"].map((chat, i) => (
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
                      { icon: "📅", label: "Visite", desc: "Piano giornaliero" },
                      { icon: "👥", label: "Clienti", desc: "Lista e schede" },
                      { icon: "📝", label: "Promemoria", desc: "Note e reminder" },
                      { icon: "📊", label: "Report", desc: "Statistiche" },
                      { icon: "🚗", label: "Guida", desc: "Modalità hands-free" },
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

              {/* SCENE 1: Login → Dashboard transition */}
              {currentVisualId === "login-dashboard" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[400px]">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4">
                    <span className="text-white text-2xl font-bold">R</span>
                  </div>
                  <p className="text-white font-bold text-lg">REPING</p>
                  <p className="text-slate-400 text-xs mt-1">Accesso in corso...</p>
                  <div className="mt-4 w-32 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse" style={{ width: `${Math.min(subStep * 20, 100)}%` }}></div>
                  </div>
                </div>
              )}

              {/* SCENE 2: Dashboard completa */}
              {currentVisualId === "dashboard" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-lg font-semibold">Buongiorno, Marco!</p>
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs">👤</div>
                  </div>
                  <p className="text-slate-400 text-xs mb-4">Mercoledì 11 Dicembre</p>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className={`bg-blue-600/20 p-2 rounded-xl text-center border border-blue-500/30 ${subStep > 1 ? "animate-pulse" : ""}`}>
                      <div className="text-xl font-bold text-white">{subStep > 0 ? "8" : "..."}</div>
                      <div className="text-[10px] text-slate-400">Visite oggi</div>
                    </div>
                    <div className={`bg-green-600/20 p-2 rounded-xl text-center border border-green-500/30 ${subStep > 2 ? "animate-pulse" : ""}`}>
                      <div className="text-xl font-bold text-white">{subStep > 1 ? "€24.5k" : "..."}</div>
                      <div className="text-[10px] text-slate-400">Mese</div>
                    </div>
                    <div className={`bg-purple-600/20 p-2 rounded-xl text-center border border-purple-500/30 ${subStep > 3 ? "animate-pulse" : ""}`}>
                      <div className="text-xl font-bold text-white">{subStep > 2 ? "127" : "..."}</div>
                      <div className="text-[10px] text-slate-400">Clienti</div>
                    </div>
                  </div>

                  <div className={`bg-amber-500/20 border border-amber-500/40 rounded-xl p-2.5 mb-3 ${subStep > 4 ? "animate-pulse" : ""}`}>
                    <p className="text-amber-300 text-xs font-medium">⚠️ Promemoria REPING</p>
                    <p className="text-white text-xs">Bar Roma: non ordina da 45 giorni</p>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-2.5">
                    <p className="text-slate-400 text-[10px] mb-1">📅 Visite oggi</p>
                    <div className="space-y-1 text-[10px]">
                      <p className="text-slate-300">09:00 - Bar Roma</p>
                      <p className="text-slate-300">10:30 - Pizzeria Napoli</p>
                      <p className="text-slate-300">12:00 - Hotel Centrale</p>
                      <p className="text-slate-400">+ altre 5 visite</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 3: Drawers (content shown via drawer overlays) */}
              {currentVisualId === "drawers" && (
                <div className="px-4 animate-fadeIn">
                  <p className="text-white text-lg font-semibold mb-4">Dashboard</p>
                  <p className="text-slate-400 text-xs">
                    {drawerOpen === "left" ? "← Storico conversazioni" : 
                     drawerOpen === "right" ? "Menu funzioni →" : 
                     "Swipe per navigare"}
                  </p>
                </div>
              )}

              {/* SCENE 4: Client Detail */}
              {currentVisualId === "client-detail" && (
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

                  {subStep > 2 && (
                    <div className="bg-slate-800 rounded-xl p-3 mb-3 animate-slideInLeft">
                      <p className="text-slate-400 text-[10px] mb-1">📝 Note personali</p>
                      <p className="text-white text-xs">Mario preferisce prodotti bio. Pagamento sempre puntuale.</p>
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
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">28 Set</span>
                          <span className="text-white font-medium">€195</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SCENE 5: Chat - User asks about visits */}
              {currentVisualId === "chat-ask-visits" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">💬</span>
                    <span className="text-white font-medium">Chat REPING</span>
                    <div className="ml-auto bg-red-500/20 px-2 py-0.5 rounded-full">
                      <span className="text-red-400 text-[10px]">🎤 REC</span>
                    </div>
                  </div>

                  {typingText && (
                    <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-sm text-sm ml-auto max-w-[85%] animate-slideInRight">
                      {typingText}
                      <span className="animate-pulse">|</span>
                    </div>
                  )}

                  <div className="absolute bottom-16 left-4 right-4">
                    <div className="bg-slate-800 rounded-full px-4 py-2 flex items-center gap-2 border border-red-500/50">
                      <span className="text-slate-300 text-xs flex-1">{typingText || "Parla o scrivi..."}</span>
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-sm">🎤</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 6: Chat - REPING responds with visit plan */}
              {currentVisualId === "chat-visits-response" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">💬</span>
                    <span className="text-white font-medium text-sm">Chat</span>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-blue-600 text-white p-2 rounded-2xl rounded-br-sm text-xs ml-auto max-w-[75%]">
                      Che visite ho in programma oggi?
                    </div>

                    <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-sm max-w-[95%] animate-slideInLeft">
                      <p className="text-white text-xs font-medium mb-2">🗺️ Piano visite oggi:</p>
                      <div className="space-y-1 text-[10px]">
                        {subStep > 0 && <p className="text-slate-300">1. 09:00 - Bar Roma ⚠️</p>}
                        {subStep > 1 && <p className="text-slate-300">2. 10:30 - Pizzeria Napoli</p>}
                        {subStep > 2 && <p className="text-slate-300">3. 12:00 - Hotel Centrale</p>}
                        {subStep > 3 && <p className="text-slate-300">4. 14:00 - Enoteca Verdi</p>}
                        {subStep > 4 && <p className="text-slate-300">5. 15:30 - Ristorante Milano</p>}
                        {subStep > 5 && <p className="text-slate-300">6. 16:30 - Caffè Centrale</p>}
                        {subStep > 6 && <p className="text-slate-300">7. 17:30 - Trattoria Da Gino</p>}
                        {subStep > 7 && <p className="text-slate-300">8. 18:30 - Pasticceria Dolce Vita</p>}
                      </div>
                      {subStep > 9 && (
                        <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
                          <p className="text-green-400 text-[10px]">✓ 138km totali</p>
                          <p className="text-blue-400 text-[10px]">💡 Proponi nuovi prodotti a Bar Roma</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 7: Chat - User asks about revenue */}
              {currentVisualId === "chat-ask-stats" && (
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

              {/* SCENE 8: Chat - REPING responds with stats */}
              {currentVisualId === "chat-stats-response" && (
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
                      <p className="text-green-400 text-xs">+18% vs mese scorso 🎉</p>
                    </div>

                    <div className="bg-slate-900 rounded-lg p-2">
                      <div className="flex items-end justify-between h-16 gap-1">
                        {[45, 60, 55, 75, 65, 85, 70, 90, 80, 95, 88].map((h, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-500" style={{ height: `${subStep > i ? h : 10}%` }}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 9: Proactive Alerts */}
              {currentVisualId === "proactive-alerts" && (
                <div className="px-4 animate-fadeIn">
                  <p className="text-white font-medium mb-3">💡 Suggerimenti REPING</p>

                  <div className="space-y-2">
                    {subStep > 0 && (
                      <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-3 animate-slideInLeft">
                        <p className="text-amber-300 text-xs font-medium mb-1">⚠️ Clienti inattivi</p>
                        <p className="text-white text-xs">3 clienti non ordinano da 30+ giorni</p>
                      </div>
                    )}

                    {subStep > 2 && (
                      <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-3 animate-slideInLeft">
                        <p className="text-blue-300 text-xs font-medium mb-1">📈 Opportunità</p>
                        <p className="text-white text-xs">Hotel Centrale: +40% ordini</p>
                      </div>
                    )}

                    {subStep > 4 && (
                      <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-3 animate-slideInLeft">
                        <p className="text-green-300 text-xs font-medium mb-1">🎯 Target</p>
                        <p className="text-white text-xs">Mancano €5.420</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SCENE 10: Driving Start */}
              {currentVisualId === "driving-start" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[400px]">
                  <div className={`w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-4 ${subStep > 2 ? "animate-pulse" : ""}`}>
                    <span className="text-3xl">🚗</span>
                  </div>
                  <p className="text-white font-bold text-lg mb-1">Modalità Guida</p>
                  <p className="text-slate-400 text-xs text-center mb-4">Interfaccia hands-free<br />REPING ti guida a voce</p>
                  {subStep > 3 && (
                    <div className="bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-medium animate-pulse">
                      GUIDA ATTIVA
                    </div>
                  )}
                </div>
              )}

              {/* SCENE 11: Driving Active */}
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
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <p className="text-emerald-400 text-2xl font-bold">3 km</p>
                          <p className="text-slate-400 text-xs">~5 min</p>
                        </div>
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(subStep * 10, 100)}%` }}></div>
                        </div>
                      </div>
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

              {/* SCENE 12: Visit Form */}
              {currentVisualId === "visit-form" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">☕</span>
                    <span className="text-white font-medium">Bar Roma</span>
                    <span className="ml-auto bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">Visita</span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-slate-400 text-[10px] mb-1">💰 Importo ordine</p>
                      <div className="bg-slate-900 rounded-lg p-2 text-white text-xl font-bold">€___</div>
                    </div>

                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-slate-400 text-[10px] mb-1">📝 Note</p>
                      <div className="bg-slate-900 rounded-lg p-2 text-slate-500 text-xs min-h-[50px]">
                        Tocca per dettare...
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="bg-red-500/20 border border-red-500/50 rounded-full px-6 py-3 flex items-center gap-2 animate-pulse">
                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                        <span className="text-white text-sm">🎤 Registra</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 13: Visit Dictation */}
              {currentVisualId === "visit-dictation" && (
                <div className="px-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">☕</span>
                    <span className="text-white font-medium">Bar Roma</span>
                    <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">REC</span>
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
                        {typingText.includes("campioni") ? "Richiede campioni crostatine. Molto interessato." : (
                          <span className="text-slate-500 animate-pulse">Dettatura in corso...</span>
                        )}
                      </div>
                    </div>

                    {/* Audio waveform */}
                    <div className="flex justify-center items-center gap-1 h-8">
                      {[3, 5, 8, 6, 9, 4, 7, 5, 8, 6, 4, 7, 5].map((h, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-red-500 rounded-full animate-pulse" 
                          style={{ 
                            height: `${h * 3}px`,
                            animationDelay: `${i * 0.1}s`
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 14: Visit Saved */}
              {currentVisualId === "visit-saved" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[400px]">
                  <div className="w-16 h-16 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl text-green-400">✓</span>
                  </div>
                  <p className="text-white font-bold text-lg mb-1">Visita salvata!</p>
                  <p className="text-slate-400 text-xs text-center mb-4">Bar Roma • €210</p>

                  {subStep > 2 && (
                    <div className="bg-slate-800 rounded-xl p-3 w-full animate-slideInLeft">
                      <p className="text-slate-400 text-[10px] mb-1">Prossima tappa</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">Pizzeria Napoli</p>
                          <p className="text-slate-400 text-xs">5 km • ~8 min</p>
                        </div>
                        <div className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs">
                          Naviga →
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SCENE 15: Daily Report */}
              {currentVisualId === "daily-report" && (
                <div className="px-4 animate-fadeIn">
                  <p className="text-white text-lg font-semibold mb-1">Report Giornata</p>
                  <p className="text-slate-400 text-xs mb-4">11 Dicembre</p>

                  <div className="bg-slate-800 rounded-xl p-4 mb-3 text-center">
                    <p className="text-white text-2xl font-bold">€1.850</p>
                    <p className="text-slate-400 text-xs">Fatturato oggi</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-slate-800 p-2 rounded-xl text-center">
                      <div className="text-lg font-bold text-green-400">8/8</div>
                      <div className="text-[10px] text-slate-400">Visite ✓</div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-xl text-center">
                      <div className="text-lg font-bold text-blue-400">138km</div>
                      <div className="text-[10px] text-slate-400">Percorsi</div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-xl text-center">
                      <div className="text-lg font-bold text-purple-400">+12%</div>
                      <div className="text-[10px] text-slate-400">vs media</div>
                    </div>
                  </div>

                  {subStep > 3 && (
                    <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-3 text-center animate-slideInLeft">
                      <p className="text-blue-300 text-xs">📤 Report inviato</p>
                    </div>
                  )}
                </div>
              )}

              {/* SCENE 16: Testimonial */}
              {currentVisualId === "testimonial" && (
                <div className="px-4 animate-fadeIn flex flex-col items-center justify-center h-[400px]">
                  <div className="bg-slate-800 rounded-xl p-4 mb-4">
                    <p className="text-slate-400 text-xs mb-2">Valuta la giornata</p>
                    <div className="flex justify-center gap-4">
                      <div className={`w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center ${subStep > 2 ? "bg-green-500/30 border-2 border-green-500" : ""}`}>
                        <span className="text-2xl">👍</span>
                      </div>
                      <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                        <span className="text-2xl">👎</span>
                      </div>
                    </div>
                  </div>

                  {subStep > 3 && (
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center animate-slideInLeft">
                      <p className="text-white text-sm italic leading-relaxed">
                        "Prima di REPING perdevo un'ora al giorno. Ora faccio tutto in pochi minuti. Fatturato +20% in 3 mesi!"
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">👤</div>
                        <p className="text-slate-400 text-xs">Marco, Agente HoReCa</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SCENE 17: Claim */}
              {currentVisualId === "claim" && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center animate-fadeIn rounded-b-[2.5rem]">
                  <div className="text-center px-6">
                    <div className={`w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${subStep > 1 ? "animate-pulse" : ""}`}>
                      <span className="text-white text-2xl font-bold">R</span>
                    </div>
                    <p className="text-white/80 text-sm mb-1">REPING</p>
                    {subStep > 2 && (
                      <p className="text-white text-xl font-bold leading-tight animate-fadeIn">
                        Vendi di più,
                        <br />meglio e in meno tempo.
                      </p>
                    )}
                    {subStep > 4 && (
                      <div className="mt-6 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full animate-pulse">
                        <span className="text-white text-sm font-medium">Richiedi accesso Beta →</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
            </div>

            {/* Loading overlay */}
            {!isLoaded && (
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center rounded-[2.5rem]">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-lg font-bold">R</span>
                </div>
                <p className="text-white font-medium mb-2">Caricamento demo...</p>
                <div className="w-32 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${loadingProgress}%` }}></div>
                </div>
                <p className="text-slate-500 text-xs mt-2">{loadingProgress}%</p>
              </div>
            )}

            {/* Play overlay when loaded but not started */}
            {isLoaded && !isPlaying && scene === 0 && elapsedTime === 0 && (
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
            className={`h-2 bg-slate-700 rounded-full overflow-hidden mb-2 ${isLoaded ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
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
              {/* Rewind */}
              <button
                onClick={() => seekToScene(Math.max(0, scene - 1))}
                disabled={!isLoaded}
                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition disabled:opacity-50"
                title="Scena precedente"
              >
                <span className="text-white text-xs">⏮</span>
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                disabled={!isLoaded}
                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition disabled:opacity-50"
              >
                <span className="text-white text-lg">{isPlaying ? "⏸" : "▶"}</span>
              </button>

              {/* Forward */}
              <button
                onClick={() => seekToScene(Math.min(scenes.length - 1, scene + 1))}
                disabled={!isLoaded}
                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition disabled:opacity-50"
                title="Scena successiva"
              >
                <span className="text-white text-xs">⏭</span>
              </button>

              {/* Reset */}
              <button
                onClick={resetPresentation}
                disabled={!isLoaded}
                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition disabled:opacity-50"
                title="Ricomincia"
              >
                <span className="text-white text-xs">↺</span>
              </button>
            </div>

            <span className="text-slate-500 text-[10px] w-20 text-right truncate">
              {scenes[scene]?.label || "..."}
            </span>
          </div>
        </div>
      </div>

      {/* Hint */}
      {isLoaded && !isPlaying && scene === 0 && elapsedTime === 0 && (
        <div className="text-center mt-4 text-slate-500 text-xs">
          🔊 Demo con audio • Clicca ▶ per avviare
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
