"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Chiave localStorage per le preferenze cookie
const COOKIE_CONSENT_KEY = "repping:cookie_consent";

export interface CookieConsent {
  necessary: true; // sempre true, non modificabile
  analytics: boolean;
  timestamp: string;
  version: string;
}

const CURRENT_VERSION = "v1.0";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as CookieConsent;
  } catch {
    return null;
  }
}

export function saveCookieConsent(consent: Omit<CookieConsent, "necessary" | "timestamp" | "version">): CookieConsent {
  const full: CookieConsent = {
    necessary: true,
    analytics: consent.analytics,
    timestamp: new Date().toISOString(),
    version: CURRENT_VERSION,
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(full));
  return full;
}

export function hasAnalyticsConsent(): boolean {
  const consent = getCookieConsent();
  return consent?.analytics ?? false;
}

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    // Mostra il banner solo se non c'è già un consenso salvato
    const existing = getCookieConsent();
    if (!existing) {
      // Piccolo delay per evitare flash durante SSR hydration
      const timer = setTimeout(() => setShowBanner(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    saveCookieConsent({ analytics: true });
    setShowBanner(false);
    // Trigger evento per attivare analytics
    window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: { analytics: true } }));
  };

  const handleAcceptNecessary = () => {
    saveCookieConsent({ analytics: false });
    setShowBanner(false);
    window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: { analytics: false } }));
  };

  const handleSavePreferences = () => {
    saveCookieConsent({ analytics: analyticsEnabled });
    setShowBanner(false);
    window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: { analytics: analyticsEnabled } }));
  };

  if (!showBanner) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-slate-200 shadow-lg"
      role="dialog"
      aria-label="Banner consenso cookie"
    >
      <div className="max-w-3xl mx-auto">
        {!showDetails ? (
          // Vista compatta
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-slate-700">
                <span className="text-lg mr-2">🍪</span>
                Utilizziamo cookie tecnici necessari e, con il tuo consenso, cookie analytics per migliorare REPPING.{" "}
                <Link href="/legal/cookies" className="text-blue-600 hover:underline">
                  Leggi la Cookie Policy
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleAcceptNecessary}
                className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition"
              >
                Solo necessari
              </button>
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition"
              >
                Personalizza
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Accetta tutti
              </button>
            </div>
          </div>
        ) : (
          // Vista dettagliata
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Preferenze Cookie</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Chiudi dettagli"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Cookie necessari */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 text-sm">Cookie Tecnici</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Obbligatori</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Indispensabili per il funzionamento di REPPING. Includono autenticazione e preferenze.
                  </p>
                </div>
              </div>

              {/* Cookie analytics */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 text-sm">Cookie Analytics</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Opzionali</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Ci aiutano a capire come usi l'app per migliorarla. Dati anonimi e aggregati.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <Link href="/legal/cookies" className="text-xs text-blue-600 hover:underline">
                Maggiori informazioni
              </Link>
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptNecessary}
                  className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition"
                >
                  Rifiuta opzionali
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Salva preferenze
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente per resettare/mostrare le preferenze cookie (da usare in footer/settings)
export function CookieSettingsLink({ className = "" }: { className?: string }) {
  const handleClick = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    window.location.reload();
  };

  return (
    <button onClick={handleClick} className={className}>
      Gestisci Cookie
    </button>
  );
}

