"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

/**
 * Pagina Demo - Auto-login con account temporaneo
 * 
 * Flusso:
 * 1. Mostra loading "Preparazione demo..."
 * 2. Chiama /api/demo/create-session per creare account temp
 * 3. Fa login automatico con le credenziali ricevute
 * 4. Setta flag isAnonDemo in sessionStorage
 * 5. Redirect alla home
 */
export default function DemoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function setupDemo() {
      try {
        // Step 1: Crea sessione demo
        setProgress(20);
        setStatus("loading");
        
        const res = await fetch("/api/demo/create-session", {
          method: "POST",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Errore creazione demo");
        }

        const { email, password, expiresAt, stats } = await res.json();
        console.log("[Demo] Session created:", { email, stats });

        // Step 2: Login
        setProgress(60);
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw new Error("Errore accesso demo: " + signInError.message);
        }

        // Step 3: Setta flag demo anonima
        setProgress(80);
        sessionStorage.setItem("reping:isAnonDemo", "true");
        sessionStorage.setItem("reping:demoExpiresAt", expiresAt);
        
        // Rimuovi flag onboarding per mostrare subito la dashboard
        localStorage.setItem("reping:welcome_shown", "true");
        localStorage.setItem("reping:onboarding_import_done", "true");

        // Step 4: Redirect
        setProgress(100);
        setStatus("success");
        
        // Piccolo delay per mostrare completamento
        setTimeout(() => {
          router.push("/");
        }, 500);

      } catch (err: any) {
        console.error("[Demo] Error:", err);
        setError(err.message || "Errore sconosciuto");
        setStatus("error");
      }
    }

    setupDemo();
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
      padding: 24,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 12 }}>
        <svg width="48" height="48" viewBox="0 0 512 512" style={{ borderRadius: 12 }}>
          <rect width="512" height="512" fill="#1e1e1e" rx="96"/>
          <text x="256" y="380" fontFamily="system-ui" fontSize="360" fontWeight="900" fill="#BEFF00" textAnchor="middle">R</text>
        </svg>
        <span style={{ color: "white", fontSize: 28, fontWeight: 700 }}>REPING</span>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>DEMO</span>
      </div>

      {/* Card */}
      <div style={{
        background: "white",
        borderRadius: 16,
        padding: 32,
        width: "100%",
        maxWidth: 400,
        textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {status === "loading" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{
                width: 64,
                height: 64,
                margin: "0 auto 16px",
                border: "4px solid #e5e7eb",
                borderTopColor: "#3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
            
            <h2 style={{ margin: "0 0 8px", color: "#1e293b", fontSize: 20 }}>
              Preparazione demo...
            </h2>
            <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>
              Stiamo creando il tuo ambiente di prova
            </p>

            {/* Progress bar */}
            <div style={{
              height: 6,
              background: "#e5e7eb",
              borderRadius: 3,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                transition: "width 0.3s ease",
              }} />
            </div>
            
            <p style={{ margin: "12px 0 0", color: "#94a3b8", fontSize: 12 }}>
              {progress < 40 ? "Creazione account..." : 
               progress < 70 ? "Caricamento dati esempio..." : 
               progress < 90 ? "Configurazione..." : "Quasi pronto!"}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{
              width: 64,
              height: 64,
              margin: "0 auto 16px",
              background: "#10b981",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ fontSize: 32 }}>✓</span>
            </div>
            <h2 style={{ margin: "0 0 8px", color: "#1e293b", fontSize: 20 }}>
              Demo pronta!
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
              Reindirizzamento in corso...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{
              width: 64,
              height: 64,
              margin: "0 auto 16px",
              background: "#ef4444",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ fontSize: 32, color: "white" }}>✕</span>
            </div>
            <h2 style={{ margin: "0 0 8px", color: "#1e293b", fontSize: 20 }}>
              Errore
            </h2>
            <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "12px 24px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Riprova
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <p style={{ marginTop: 24, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
        La demo scade automaticamente dopo 2 ore
      </p>
    </div>
  );
}
