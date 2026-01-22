"use client";

import { useState, useEffect } from "react";

const TOUR_KEY = "reping:guided_tour";

type TourStep = {
  id: string;
  title: string;
  message: string;
  target?: string; // CSS selector per spotlight (opzionale)
  position?: "center" | "bottom" | "top";
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "chat",
    title: "🎙️ Modalità Hands-Free",
    message: "Da qui puoi fare tutto parlando.\nChiedimi qualsiasi cosa: cercare clienti, registrare visite, generare report.\nIo capisco, eseguo, rispondo.",
    target: "[data-tour='chat-input']",
    position: "bottom",
  },
  {
    id: "intelligence",
    title: "🧠 Intelligenza Proattiva",
    message: "Non aspetto che mi chiedi.\nTi suggerisco io chi visitare, cosa fare, dove andare.\nGuarda i suggerimenti qui.",
    target: "[data-tour='napoleon-card']",
    position: "top",
  },
  {
    id: "dashboard",
    title: "📊 Tutto Sotto Controllo",
    message: "Clienti, visite, report, planning.\nTutto qui, sempre aggiornato.\nTu scegli come navigare: voce o click.",
    target: "[data-tour='dashboard']",
    position: "center",
  },
];

interface GuidedTourProps {
  onComplete?: () => void;
}

export default function GuidedTour({ onComplete }: GuidedTourProps) {
  const [show, setShow] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showCryptoToast, setShowCryptoToast] = useState(false);

  // Controlla se mostrare il tour (dopo demo data loaded)
  useEffect(() => {
    const checkShowTour = () => {
      const tourData = localStorage.getItem(TOUR_KEY);
      const onboardingData = localStorage.getItem("reping:onboarding_import_done");
      
      // Mostra solo se:
      // 1. Onboarding fatto con demo
      // 2. Tour non ancora completato/skippato
      if (onboardingData && !tourData) {
        try {
          const parsed = JSON.parse(onboardingData);
          if (parsed.usedDemo) {
            setTimeout(() => setShow(true), 500);
          }
        } catch {}
      }
    };

    checkShowTour();
    
    // Ascolta evento custom per trigger manuale
    window.addEventListener("reping:startTour", () => setShow(true));
    return () => window.removeEventListener("reping:startTour", () => setShow(true));
  }, []);

  const handleNext = () => {
    // Mostra toast crypto alla tappa 3 (dashboard)
    if (currentStep === 1) {
      setShowCryptoToast(true);
      setTimeout(() => setShowCryptoToast(false), 4000);
    }

    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(TOUR_KEY, JSON.stringify({ skipped: true, at: new Date().toISOString() }));
    setShow(false);
    onComplete?.();
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_KEY, JSON.stringify({ completed: true, at: new Date().toISOString() }));
    setShow(false);
    onComplete?.();
  };

  if (!show) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Overlay scuro */}
      <div 
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.75)",
          zIndex: 9990,
        }}
      />

      {/* Card del tour */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          background: "white",
          borderRadius: 16,
          padding: 0,
          maxWidth: 400,
          width: "90%",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header colorato */}
        <div
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            padding: "24px 24px 20px",
            color: "white",
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>
            Tappa {currentStep + 1} di {TOUR_STEPS.length}
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            {step.title}
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{ 
            margin: 0, 
            fontSize: 16, 
            lineHeight: 1.6, 
            color: "#374151",
            whiteSpace: "pre-line",
          }}>
            {step.message}
          </p>
        </div>

        {/* Progress dots */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: 8, 
          padding: "0 24px 16px" 
        }}>
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: idx === currentStep ? "#3b82f6" : "#e5e7eb",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>

        {/* Footer con bottoni */}
        <div style={{ 
          padding: "16px 24px 20px", 
          display: "flex", 
          gap: 12,
          borderTop: "1px solid #f3f4f6",
        }}>
          <button
            onClick={handleSkip}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "white",
              color: "#6b7280",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Salta tour
          </button>
          <button
            onClick={handleNext}
            style={{
              flex: 2,
              padding: "12px 16px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isLast ? "🚀 Inizia!" : "Avanti →"}
          </button>
        </div>
      </div>

      {/* Toast crypto (appare alla tappa 3) */}
      {showCryptoToast && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            background: "rgba(0, 0, 0, 0.9)",
            color: "white",
            padding: "16px 24px",
            borderRadius: 12,
            maxWidth: 360,
            textAlign: "center",
            animation: "fadeInUp 0.3s ease-out",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>🔐</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            Se ogni tanto l'app "respira", sta cifrando i tuoi dati.
            <br />
            <strong>È il prezzo della vera privacy.</strong>
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </>
  );
}

// Helper per trigger manuale del tour
export function startGuidedTour() {
  window.dispatchEvent(new CustomEvent("reping:startTour"));
}

// Helper per reset tour (test)
export function resetGuidedTour() {
  localStorage.removeItem(TOUR_KEY);
}
