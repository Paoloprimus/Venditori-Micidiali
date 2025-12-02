/**
 * ============================================================================
 * COMPONENTE: Passphrase Debug Panel
 * ============================================================================
 * 
 * PERCORSO: /components/PassphraseDebugPanel.tsx
 * 
 * DESCRIZIONE:
 * Pannello floating che monitora in tempo reale lo stato della passphrase
 * in sessionStorage e localStorage, con timestamp e log degli eventi.
 * 
 * USO:
 * Aggiungere in qualsiasi pagina per debuggare la persistenza della passphrase:
 * 
 * import PassphraseDebugPanel from '@/components/PassphraseDebugPanel';
 * 
 * function MyPage() {
 *   return (
 *     <>
 *       <PassphraseDebugPanel />
 *       {/* resto della pagina *\/}
 *     </>
 *   );
 * }
 * 
 * ============================================================================
 */

"use client";

import { useEffect, useState } from "react";

type LogEntry = {
  timestamp: string;
  event: string;
  sessionHas: boolean;
  localHas: boolean;
};

export default function PassphraseDebugPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessionHas, setSessionHas] = useState(false);
  const [localHas, setLocalHas] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>("");
  const [isMinimized, setIsMinimized] = useState(true); // ✅ Minimizzato di default
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Controlla lo stato della passphrase
  const checkPassphrase = () => {
    const now = new Date().toLocaleTimeString();
    let sessionExists = false;
    let localExists = false;

    try {
      const sessionPass = sessionStorage.getItem("repping:pph");
      sessionExists = !!sessionPass;
    } catch {}

    try {
      const localPass = localStorage.getItem("repping:pph");
      localExists = !!localPass;
    } catch {}

    setSessionHas(sessionExists);
    setLocalHas(localExists);
    setLastCheck(now);

    return { sessionExists, localExists, now };
  };

  // Log evento
  const addLog = (event: string) => {
    const { sessionExists, localExists, now } = checkPassphrase();
    
    const entry: LogEntry = {
      timestamp: now,
      event,
      sessionHas: sessionExists,
      localHas: localExists,
    };

    setLogs(prev => [entry, ...prev].slice(0, 20)); // Keep last 20
  };

  //监控初始状态
  useEffect(() => {
    addLog("Panel mounted");
    checkPassphrase();
  }, []);

  // Auto-refresh ogni 2 secondi
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      checkPassphrase();
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Monitora eventi storage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "repping:pph") {
        addLog(`Storage changed: ${e.storageArea === sessionStorage ? 'session' : 'local'}`);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Monitora navigazione
  useEffect(() => {
    const handleBeforeUnload = () => {
      addLog("Page unload");
    };

    const handleVisibilityChange = () => {
      addLog(`Visibility: ${document.hidden ? 'hidden' : 'visible'}`);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Test: Cancella manualmente
  const clearSession = () => {
    try {
      sessionStorage.removeItem("repping:pph");
      addLog("Manual clear: sessionStorage");
    } catch {}
  };

  const clearLocal = () => {
    try {
      localStorage.removeItem("repping:pph");
      addLog("Manual clear: localStorage");
    } catch {}
  };

  const clearBoth = () => {
    clearSession();
    clearLocal();
  };

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          background: "#1f2937",
          color: "white",
          padding: "12px 20px",
          borderRadius: 8,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          zIndex: 9999,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        🔐 Debug Panel
        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>
          Session: {sessionHas ? "✅" : "❌"} | Local: {localHas ? "✅" : "❌"}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 400,
        maxHeight: 600,
        background: "white",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        overflow: "hidden",
        zIndex: 9999,
        border: "2px solid #e5e7eb",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#1f2937",
          color: "white",
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14 }}>🔐 Passphrase Debug</div>
        <button
          onClick={() => setIsMinimized(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: 18,
          }}
        >
          ➖
        </button>
      </div>

      {/* Status */}
      <div style={{ padding: 16, background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>SessionStorage</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: sessionHas ? "#10b981" : "#ef4444" }}>
              {sessionHas ? "✅ Present" : "❌ Missing"}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>LocalStorage</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: localHas ? "#10b981" : "#ef4444" }}>
              {localHas ? "✅ Present" : "❌ Missing"}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          Last check: {lastCheck}
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            onClick={clearSession}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Clear Session
          </button>
          <button
            onClick={clearLocal}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Clear Local
          </button>
          <button
            onClick={clearBoth}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Clear Both
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            id="autoRefresh"
          />
          <label htmlFor="autoRefresh" style={{ fontSize: 11, color: "#6b7280" }}>
            Auto-refresh (2s)
          </label>
        </div>
      </div>

      {/* Event Log */}
      <div style={{ padding: 16, maxHeight: 300, overflow: "auto" }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: "#374151" }}>
          Event Log
        </div>
        {logs.length === 0 && (
          <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: 20 }}>
            No events yet
          </div>
        )}
        {logs.map((log, idx) => (
          <div
            key={idx}
            style={{
              fontSize: 10,
              padding: "8px 12px",
              marginBottom: 4,
              background: "#f9fafb",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: "#374151" }}>{log.event}</span>
              <span style={{ color: "#9ca3af" }}>{log.timestamp}</span>
            </div>
            <div style={{ display: "flex", gap: 12, color: "#6b7280" }}>
              <span>Session: {log.sessionHas ? "✅" : "❌"}</span>
              <span>Local: {log.localHas ? "✅" : "❌"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
