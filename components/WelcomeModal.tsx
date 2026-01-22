"use client";

import { useState, useEffect } from "react";

const WELCOME_SHOWN_KEY = "reping:welcome_shown";

interface WelcomeModalProps {
  userName: string;
}

export default function WelcomeModal({ userName }: WelcomeModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Mostra solo se non è già stato mostrato
    const alreadyShown = localStorage.getItem(WELCOME_SHOWN_KEY);
    if (!alreadyShown) {
      // Piccolo delay per evitare flash durante il caricamento
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(WELCOME_SHOWN_KEY, new Date().toISOString());
    setShow(false);
    // Emetti evento custom per triggerare OnboardingImport
    console.log('[WelcomeModal] 📣 Emetto evento welcomeClosed');
    window.dispatchEvent(new CustomEvent("reping:welcomeClosed"));
  };

  if (!show) return null;

  const firstName = userName.split(" ")[0] || "Agente";

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.7)" }}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
        style={{ animation: "fadeInScale 0.3s ease-out" }}
      >
        {/* Header con gradiente */}
        <div 
          className="px-6 py-8 text-center text-white"
          style={{ 
            background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)" 
          }}
        >
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-2xl font-bold mb-2">
            Benvenuto in REPING, {firstName}!
          </h1>
          <p className="text-blue-100 text-lg">
            Sono il tuo <strong>AI CoPilot alle Vendite!</strong>
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <p className="text-center text-slate-700 text-lg">
            Insieme venderai <strong>di più</strong>, <strong>meglio</strong> e in <strong>meno tempo</strong>!
          </p>

          {/* Warning box */}
          <div 
            className="rounded-xl p-4 border-2"
            style={{ 
              background: "#FEF3C7", 
              borderColor: "#F59E0B" 
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-amber-800 text-sm uppercase tracking-wide mb-2">
                  Importantissimo
                </p>
                <p className="text-amber-900 text-sm leading-relaxed">
                  I <strong>dati sensibili dei tuoi clienti</strong> sono cifrati 
                  <strong> end-to-end</strong> (solo tu puoi conoscerli!).
                </p>
                <p className="text-amber-900 text-sm leading-relaxed mt-2">
                  La tua password è anche la <strong>chiave di crittografia</strong>.
                </p>
                <p className="text-red-700 font-bold text-sm mt-2">
                  🔐 NON PERDERLA! Se la perdi, tutti i dati criptati dei tuoi clienti 
                  saranno IRRECUPERABILI!
                </p>
                <p className="text-amber-800 text-xs mt-3 italic">
                  💡 Se ogni tanto l'app "respira", sta cifrando i tuoi dati. 
                  È il prezzo della vera privacy.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleClose}
            className="w-full py-4 rounded-xl text-white font-bold text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ 
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)" 
            }}
          >
            BUON ONBOARDING! →
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

// Helper per resettare il welcome (utile per test)
export function resetWelcomeModal() {
  localStorage.removeItem(WELCOME_SHOWN_KEY);
}

