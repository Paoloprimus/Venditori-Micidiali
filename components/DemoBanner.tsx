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
        const res = await fetch("/api/demo/clear");
        if (res.ok) {
          const data = await res.json();
          if (data.hasDemoData) {
            setVisible(true);
            setDemoCount(data.demoCount || 0);
          } else {
            setVisible(false);
          }
        }
      } catch (e) {
        // Ignora errori
      }
    }

    // Check iniziale
    checkDemoData();

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

  // Versione espansa (banner completo)
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.15)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      {/* Icona e testo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>🧪</span>
        <div>
          <p style={{ 
            margin: 0, 
            color: "white", 
            fontWeight: 600, 
            fontSize: 14,
          }}>
            Modalità Demo attiva
          </p>
          <p style={{ 
            margin: 0, 
            color: "rgba(255,255,255,0.85)", 
            fontSize: 12,
          }}>
            Stai usando {demoCount} clienti di prova
          </p>
        </div>
      </div>

      {/* Bottone import */}
      <button
        onClick={handleGoToImport}
        style={{
          padding: "10px 20px",
          borderRadius: 8,
          border: "2px solid white",
          background: "rgba(255,255,255,0.15)",
          color: "white",
          fontSize: 14,
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
        📥 Importa i tuoi clienti
      </button>

      {/* Bottone minimizza */}
      <button
        onClick={() => setMinimized(true)}
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.2)",
          color: "white",
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Riduci a icona"
      >
        ▼
      </button>
    </div>
  );
}

// Helper per forzare refresh del banner (da chiamare dopo clear)
export function notifyDemoCleared() {
  window.dispatchEvent(new CustomEvent("reping:demoCleared"));
}
