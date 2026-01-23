"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const STEPS = [
  { id: 1, text: "Creazione ambiente demo...", duration: 800 },
  { id: 2, text: "Accesso sicuro in corso...", duration: 1200 },
  { id: 3, text: "Inizializzazione cifratura E2E...", duration: 1500 },
  { id: 4, text: "Caricamento dati di esempio...", duration: 1000 },
  { id: 5, text: "Preparazione dashboard...", duration: 800 },
];

function DemoLoadingContent() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const emailParam = searchParams.get("e");
    const passwordParam = searchParams.get("p");

    if (!emailParam || !passwordParam) {
      setError("Parametri mancanti. Torna alla home.");
      return;
    }

    // Avvia gli step di loading
    let stepIndex = 0;
    const runSteps = async () => {
      for (const step of STEPS) {
        setCurrentStep(step.id);
        await new Promise(r => setTimeout(r, step.duration));
        stepIndex++;
        
        // A metà degli step, fai il login effettivo
        if (stepIndex === 2) {
          try {
            // Redirect all'API di login (avviene in background mentre mostriamo gli step)
            const loginUrl = `/api/demo/auto-login?e=${emailParam}&p=${passwordParam}`;
            
            // Fetch per fare login senza redirect immediato
            const res = await fetch(loginUrl, { 
              method: 'GET',
              redirect: 'manual',
              credentials: 'include',
            });
            
            // Se il login ha settato i cookies, prosegui con gli step
            if (res.type === 'opaqueredirect' || res.ok || res.status === 302) {
              console.log("[DemoLoading] Login fetch completed");
            }
          } catch (e) {
            console.log("[DemoLoading] Fetch error (expected for redirect):", e);
          }
        }
      }
      
      // Tutti gli step completati, vai alla home
      window.location.href = "/";
    };

    runSteps();
  }, [searchParams]);

  if (error) {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#ef4444", marginBottom: 24 }}>{error}</p>
        <a 
          href="https://reping.it" 
          style={{ 
            color: "#3b82f6", 
            textDecoration: "underline",
            fontSize: 16,
          }}
        >
          Torna alla home
        </a>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", maxWidth: 400 }}>
      {/* Logo */}
      <div style={{ marginBottom: 32 }}>
        <svg width="80" height="80" viewBox="0 0 512 512" style={{ margin: "0 auto" }}>
          <rect width="512" height="512" fill="#1e1e1e" rx="96"/>
          <text x="256" y="380" fontFamily="system-ui" fontSize="360" fontWeight="900" fill="#BEFF00" textAnchor="middle">R</text>
        </svg>
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          color: "white", 
          marginTop: 16,
          marginBottom: 8,
        }}>
          REPING Demo
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>
          Preparazione dell'ambiente di prova
        </p>
      </div>

      {/* Progress steps */}
      <div style={{ marginBottom: 32 }}>
        {STEPS.map((step) => (
          <div 
            key={step.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              marginBottom: 8,
              borderRadius: 8,
              background: currentStep >= step.id ? "rgba(59, 130, 246, 0.1)" : "transparent",
              transition: "all 0.3s",
            }}
          >
            {/* Icona stato */}
            <div style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: currentStep > step.id 
                ? "#10b981" 
                : currentStep === step.id 
                  ? "#3b82f6" 
                  : "#334155",
              transition: "all 0.3s",
            }}>
              {currentStep > step.id ? (
                <span style={{ color: "white", fontSize: 14 }}>✓</span>
              ) : currentStep === step.id ? (
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "2px solid white",
                  borderTopColor: "transparent",
                  animation: "spin 0.8s linear infinite",
                }} />
              ) : (
                <span style={{ color: "#64748b", fontSize: 12 }}>{step.id}</span>
              )}
            </div>
            
            {/* Testo */}
            <span style={{
              color: currentStep >= step.id ? "white" : "#64748b",
              fontSize: 14,
              fontWeight: currentStep === step.id ? 600 : 400,
              transition: "all 0.3s",
            }}>
              {step.text}
            </span>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div style={{
        background: "rgba(251, 191, 36, 0.1)",
        border: "1px solid rgba(251, 191, 36, 0.3)",
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
      }}>
        <p style={{ color: "#fbbf24", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          🔐 REPING utilizza crittografia end-to-end.<br/>
          I tuoi dati sono protetti e visibili solo a te.
        </p>
      </div>

      {/* Footer */}
      <p style={{ color: "#64748b", fontSize: 12 }}>
        Questa è una demo con dati fittizi
      </p>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function DemoLoadingPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      padding: 20,
    }}>
      <Suspense fallback={
        <div style={{ color: "white", textAlign: "center" }}>
          <div style={{
            width: 48,
            height: 48,
            margin: "0 auto 16px",
            border: "4px solid #334155",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <p>Caricamento...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }>
        <DemoLoadingContent />
      </Suspense>
    </div>
  );
}
