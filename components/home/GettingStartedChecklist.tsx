"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

const CHECKLIST_KEY = "reping:getting_started";
const DISMISSED_KEY = "reping:getting_started_dismissed";

interface ChecklistState {
  hasClients: boolean;
  hasProducts: boolean;
  hasAskedAssistant: boolean;
  hasPlannedRoute: boolean;
}

interface Props {
  onAskAssistant?: () => void; // Callback per passare alla chat
}

export default function GettingStartedChecklist({ onAskAssistant }: Props) {
  const [state, setState] = useState<ChecklistState>({
    hasClients: false,
    hasProducts: false,
    hasAskedAssistant: false,
    hasPlannedRoute: false,
  });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Carica stato iniziale
  useEffect(() => {
    // Check se dismissed
    const wasDismissed = localStorage.getItem(DISMISSED_KEY);
    if (wasDismissed) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    // Carica stato salvato
    const saved = localStorage.getItem(CHECKLIST_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(prev => ({ ...prev, ...parsed }));
      } catch {}
    }

    // Verifica stato reale dal DB
    checkRealState();
  }, []);

  async function checkRealState() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check clienti
      const { count: clientsCount } = await supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Check prodotti (prodotti sono globali, non per user)
      const { count: productsCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });

      // Check messaggi (ha usato l'assistente?)
      const { count: messagesCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "user");

      // Check planning (ha visitato /planning o creato visite?)
      // Per semplicità, usiamo il localStorage flag
      const hasPlanned = localStorage.getItem("reping:has_planned") === "true";

      const newState: ChecklistState = {
        hasClients: (clientsCount || 0) > 0,
        hasProducts: (productsCount || 0) > 0,
        hasAskedAssistant: (messagesCount || 0) > 0,
        hasPlannedRoute: hasPlanned,
      };

      setState(newState);
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(newState));
    } catch (err) {
      console.error("Errore check stato onboarding:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
    setDismissed(true);
  };

  const handleMarkPlanned = () => {
    localStorage.setItem("reping:has_planned", "true");
    setState(prev => {
      const newState = { ...prev, hasPlannedRoute: true };
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(newState));
      return newState;
    });
  };

  // Calcola progresso
  const completed = [
    state.hasClients,
    state.hasProducts,
    state.hasAskedAssistant,
    state.hasPlannedRoute,
  ].filter(Boolean).length;

  const allComplete = completed === 4;

  // Non mostrare se dismissato o tutto completato
  if (dismissed || allComplete || loading) {
    return null;
  }

  const progressPercent = (completed / 4) * 100;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-100 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🚀</span>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Primi Passi</h3>
            <p className="text-xs text-slate-500">{completed}/4 completati</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="text-slate-400 hover:text-slate-600 p-1"
            title="Chiudi (puoi riaprire dalle Impostazioni)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Lista steps */}
      {expanded && (
        <div className="p-4 space-y-3">
          {/* Step 1: Importa clienti */}
          <ChecklistItem
            done={state.hasClients}
            icon="👥"
            title="Importa i tuoi clienti"
            description="Carica il tuo portafoglio clienti da CSV"
            action={
              <Link href="/tools/import-clients" className="text-blue-600 text-xs hover:underline">
                Importa →
              </Link>
            }
          />

          {/* Step 2: Carica prodotti */}
          <ChecklistItem
            done={state.hasProducts}
            icon="📦"
            title="Carica il listino prodotti"
            description="Importa catalogo con prezzi e giacenze"
            action={
              <Link href="/tools/import-products" className="text-blue-600 text-xs hover:underline">
                Importa →
              </Link>
            }
          />

          {/* Step 3: Prova assistente */}
          <ChecklistItem
            done={state.hasAskedAssistant}
            icon="💬"
            title="Prova a chiedere qualcosa"
            description='Es: "Quanti clienti ho a Milano?"'
            action={
              onAskAssistant ? (
                <button onClick={onAskAssistant} className="text-blue-600 text-xs hover:underline">
                  Vai alla Chat →
                </button>
              ) : (
                <Link href="/" className="text-blue-600 text-xs hover:underline">
                  Vai alla Chat →
                </Link>
              )
            }
          />

          {/* Step 4: Pianifica giro */}
          <ChecklistItem
            done={state.hasPlannedRoute}
            icon="🗺️"
            title="Pianifica il primo giro"
            description="Ottimizza il percorso delle visite"
            action={
              <Link 
                href="/planning" 
                onClick={handleMarkPlanned}
                className="text-blue-600 text-xs hover:underline"
              >
                Pianifica →
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}

// Sub-component per ogni item
function ChecklistItem({ 
  done, 
  icon, 
  title, 
  description, 
  action 
}: { 
  done: boolean; 
  icon: string; 
  title: string; 
  description: string; 
  action: React.ReactNode;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
      done ? "bg-green-50" : "bg-slate-50 hover:bg-slate-100"
    }`}>
      {/* Checkbox */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        done 
          ? "bg-green-500 text-white" 
          : "bg-white border-2 border-slate-300"
      }`}>
        {done && <span className="text-xs">✓</span>}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className={`font-medium text-sm ${done ? "text-green-700 line-through" : "text-slate-800"}`}>
            {title}
          </span>
        </div>
        <p className={`text-xs mt-0.5 ${done ? "text-green-600" : "text-slate-500"}`}>
          {description}
        </p>
      </div>

      {/* Action */}
      {!done && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

// Helper per resettare la checklist (utile per test)
export function resetGettingStarted() {
  localStorage.removeItem(CHECKLIST_KEY);
  localStorage.removeItem(DISMISSED_KEY);
  localStorage.removeItem("reping:has_planned");
}

