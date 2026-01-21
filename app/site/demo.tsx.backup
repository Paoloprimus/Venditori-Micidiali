// app/site/demo.tsx
// Animated Demo Presentation - iPhone Style - MP3 AUDIO SYNC VERSION

"use client";

import { useState, useEffect, useRef } from "react";

export default function AnimatedMockup() {
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
    { id: 16, file: "narratore17.mp3", type: "narrator", label: "Claim", visualId: "claim" },
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
        typeText("Che visite ho oggi?", duration * 0.7);
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
                    {["merc 12/11/25", "Stats Verona", "mar 11/11/25", "lun 10/11/25", "ven 07/11/25", "gio 06/11/25", "vmerc 05/11/25","Analisi trimestrale"].map((chat, i) => (
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
                      <div className="text-xl font-bold text-white">{subStep > 1 ? "€24k" : "..."}</div>
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
                      Che visite ho oggi?
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
                        {[45, 45, 60, 55, 75, 65, 85, 70, 90, 80, 80, 95].map((h, i) => (
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

              {/* SCENE 16 (ex 17): Claim - con valutazione iniziale */}
              {currentVisualId === "claim" && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center animate-fadeIn rounded-b-[2.5rem]">
                  <div className="text-center px-6">
                    
                    {/* Valutazione giornata - visibile solo all'inizio (subStep 0-3) */}
                    {subStep < 4 && (
                      <div className="bg-white/10 rounded-xl p-4 mb-6 animate-fadeIn">
                        <p className="text-white/70 text-xs mb-2">Valuta la giornata</p>
                        <div className="flex justify-center gap-4">
                          <div className={`w-12 h-12 bg-white/10 rounded-full flex items-center justify-center transition-all ${subStep > 1 ? "bg-green-500/30 border-2 border-green-400 scale-110" : ""}`}>
                            <span className="text-2xl">👍</span>
                          </div>
                          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                            <span className="text-2xl">👎</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Logo e Claim - appare dopo la valutazione */}
                    {subStep >= 4 && (
                      <>
                        <div className={`w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${subStep > 5 ? "animate-pulse" : ""}`}>
                          <span className="text-white text-2xl font-bold">R</span>
                        </div>
                        <p className="text-white/80 text-sm mb-1">REPING</p>
                        {subStep > 5 && (
                          <p className="text-white text-xl font-bold leading-tight animate-fadeIn">
                            Vendi di più,
                            <br />meglio e in meno tempo.
                          </p>
                        )}
                        {subStep > 7 && (
                          <div className="mt-6 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full animate-pulse">
                            <span className="text-white text-sm font-medium">Richiedi accesso Beta →</span>
                          </div>
                        )}
                      </>
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
