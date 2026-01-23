"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { id: 1, text: "Creazione ambiente demo...", key: "create" },
  { id: 2, text: "Caricamento dati di esempio...", key: "seed" },
  { id: 3, text: "Inizializzazione cifratura E2E...", key: "crypto" },
  { id: 4, text: "Accesso sicuro in corso...", key: "login" },
  { id: 5, text: "Preparazione dashboard...", key: "ready" },
];

export default function DemoLoadingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    async function setupDemo() {
      try {
        // STEP 1: Crea utente
        setCurrentStep(1);
        const createRes = await fetch("/api/demo/create-user", { method: "POST" });
        const createData = await createRes.json();

        if (!createRes.ok) {
          throw new Error(createData.error || "Errore creazione utente");
        }

        const { email, password, userId } = createData;

        // STEP 2: Seed dati (prima del login, usa admin API)
        setCurrentStep(2);
        const seedRes = await fetch("/api/demo/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!seedRes.ok) {
          console.warn("[Demo] Seed warning:", await seedRes.text());
        }

        // STEP 3: Crypto init (simulato)
        setCurrentStep(3);
        await new Promise(r => setTimeout(r, 600));

        // Setta flag demo PRIMA del login
        sessionStorage.setItem("reping:isAnonDemo", "true");
        localStorage.setItem("reping:welcome_shown", "true");
        localStorage.setItem("reping:onboarding_import_done", "true");

        // STEP 4: Login via API route (setta cookies server-side)
        setCurrentStep(4);
        const encodedEmail = btoa(email);
        const encodedPassword = btoa(password);

        // STEP 5: Ready + redirect
        setCurrentStep(5);
        await new Promise(r => setTimeout(r, 400));

        // Redirect all'API di login che setta i cookies e poi va alla home
        window.location.href = `/api/demo/auto-login?e=${encodedEmail}&p=${encodedPassword}`;

      } catch (err: any) {
        console.error("[DemoLoading] Error:", err);
        setError(err.message || "Errore durante il setup");
      }
    }

    setupDemo();
  }, []);

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        padding: 20,
      }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <h2 style={{ color: "white", marginBottom: 16 }}>Ops! Qualcosa è andato storto</h2>
          <p style={{ color: "#ef4444", marginBottom: 24 }}>{error}</p>
          <a 
            href="https://reping.it" 
            style={{ 
              display: "inline-block",
              padding: "12px 24px",
              background: "#3b82f6",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Torna alla home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      padding: 20,
    }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <svg width="80" height="80" viewBox="0 0 512 512" style={{ margin: "0 auto", display: "block" }}>
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
        <div style={{ marginBottom: 32, textAlign: "left" }}>
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
                width: 28,
                height: 28,
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
                flexShrink: 0,
              }}>
                {currentStep > step.id ? (
                  <span style={{ color: "white", fontSize: 14 }}>✓</span>
                ) : currentStep === step.id ? (
                  <div style={{
                    width: 12,
                    height: 12,
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
    </div>
  );
}
