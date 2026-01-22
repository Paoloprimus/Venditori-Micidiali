"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Banner persistente che appare quando ci sono dati demo.
 * Rimane visibile finché l'utente non importa i propri clienti.
 * Non blocca l'uso dell'app (posizionato in basso).
 */
export default function DemoBanner() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [demoCount, setDemoCount] = useState(0);
  const [minimized, setMinimized] = useState(false);

  // Verifica presenza dati demo
  useEffect(() => {
    async function checkDemoData() {
      try {
        console.log("[DemoBanner] Checking for demo data...");
        const res = await fetch("/api/demo/clear");
        const data = await res.json();
        console.log("[DemoBanner] Response:", data);
        
        if (res.ok) {
          if (data.hasDemoData) {
            console.log("[DemoBanner] ✅ Demo data found, showing banner");
            setVisible(true);
            setDemoCount(data.demoCount || 0);
          } else {
            console.log("[DemoBanner] No demo data");
            setVisible(false);
          }
        } else {
          console.error("[DemoBanner] API error:", data);
        }
      } catch (e) {
        console.error("[DemoBanner] Fetch error:", e);
      }
    }

    // Check iniziale (con piccolo delay per aspettare auth)
    setTimeout(checkDemoData, 1000);

    // Ricontrolla periodicamente (ogni 30 secondi) o dopo navigazione
    const interval = setInterval(checkDemoData, 30000);

    // Ascolta evento di cancellazione demo
    const handleDemoCleared = () => {
      setVisible(false);
    };
    window.addEventListener("reping:demoCleared", handleDemoCleared);

    return () => {
      clearInterval(interval);
      window.removeEventListener("reping:demoCleared", handleDemoCleared);
    };
  }, []);

  const handleGoToImport = () => {
    router.push("/tools/import-clients");
  };

  if (!visible) return null;

  // Versione minimizzata (solo icona)
  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9000,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        title="Modalità Demo attiva - Clicca per espandere"
      >
        <span style={{ fontSize: 24 }}>🧪</span>
      </div>
    );
  }

  // Versione espansa (banner compatto - una riga)
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        background: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)",
        boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        height: 36,
      }}
    >
      {/* Icona e testo compatto */}
      <span style={{ fontSize: 14 }}>🧪</span>
      <span style={{ 
        color: "white", 
        fontSize: 12,
        fontWeight: 500,
      }}>
        Demo attiva ({demoCount} clienti di prova)
      </span>

      {/* Bottone import compatto */}
      <button
        onClick={handleGoToImport}
        style={{
          padding: "4px 12px",
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.6)",
          background: "rgba(255,255,255,0.15)",
          color: "white",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "white";
          e.currentTarget.style.color = "#d97706";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.15)";
          e.currentTarget.style.color = "white";
        }}
      >
        Importa clienti
      </button>

      {/* Bottone minimizza */}
      <button
        onClick={() => setMinimized(true)}
        style={{
          marginLeft: 4,
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.2)",
          color: "white",
          fontSize: 10,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Riduci"
      >
        ✕
      </button>
    </div>
  );
}

// Helper per forzare refresh del banner (da chiamare dopo clear)
export function notifyDemoCleared() {
  window.dispatchEvent(new CustomEvent("reping:demoCleared"));
}
