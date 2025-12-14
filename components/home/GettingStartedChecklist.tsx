"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

const CHECKLIST_KEY = "reping:getting_started";
const DISMISSED_KEY = "reping:getting_started_dismissed";

interface ChecklistState {
  hasClients: boolean;
  hasVoiceClient: boolean; // 🆕 Ha provato creazione vocale
  // 🔒 BETA: hasProducts rimosso - riattivare per MULTIAGENT
  // hasProducts: boolean;
  hasAskedAssistant: boolean;
  hasFirstVisit: boolean;
  hasSentFeedback: boolean;
}

interface Props {
  onAskAssistant?: () => void; // Callback per passare alla chat
}

export default function GettingStartedChecklist({ onAskAssistant }: Props) {
  const [state, setState] = useState<ChecklistState>({
    hasClients: false,
    hasVoiceClient: false,
    // 🔒 BETA: hasProducts rimosso
    hasAskedAssistant: false,
    hasFirstVisit: false,
    hasSentFeedback: false,
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

      // 🔒 BETA: Check prodotti rimosso - riattivare per MULTIAGENT
      // const { count: productsCount } = await supabase
      //   .from("products")
      //   .select("id", { count: "exact", head: true });

      // Check messaggi (ha usato l'assistente?)
      const { count: messagesCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "user");

      // Check visite (ha registrato almeno una visita?)
      const { count: visitsCount } = await supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Check feedback (ha inviato almeno un feedback?)
      const { count: feedbackCount } = await supabase
        .from("test_notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const newState: ChecklistState = {
        hasClients: (clientsCount || 0) > 0,
        hasVoiceClient: false, // 🆕 Verrà settato da localStorage se ha usato voice
        // 🔒 BETA: hasProducts rimosso
        hasAskedAssistant: (messagesCount || 0) > 0,
        hasFirstVisit: (visitsCount || 0) > 0,
        hasSentFeedback: (feedbackCount || 0) > 0,
      };

      // 🆕 Check localStorage per voiceClient
      const voiceClientUsed = localStorage.getItem('reping:used_voice_client');
      if (voiceClientUsed) {
        newState.hasVoiceClient = true;
      }

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

  // Apre il Test Companion Panel
  const handleOpenTestPanel = () => {
    // Attiva il pannello se disattivato
    localStorage.setItem("reping:testPanelEnabled", "true");
    // Apri il pannello
    window.dispatchEvent(new CustomEvent("repping:testPanelChanged", { detail: { enabled: true, open: true } }));
  };

  // Calcola progresso (5 step per BETA - aggiunto voice)
  const completed = [
    state.hasClients,
    state.hasVoiceClient,
    state.hasAskedAssistant,
    state.hasFirstVisit,
    state.hasSentFeedback,
  ].filter(Boolean).length;

  const totalSteps = 5;
  const allComplete = completed === totalSteps;

  // Non mostrare se dismissato o tutto completato
  if (dismissed || allComplete || loading) {
    return null;
  }

  const progressPercent = (completed / totalSteps) * 100;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-amber-50 border-b border-slate-100 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🚀</span>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Primi Passi - Beta</h3>
            <p className="text-xs text-slate-500">{completed}/{totalSteps} completati</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-amber-500 transition-all duration-500"
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
          {/* Step 1: Aggiungi cliente a voce - PRIORITARIO */}
          <ChecklistItem
            done={state.hasVoiceClient}
            icon="🎙️"
            title="Aggiungi un cliente a voce"
            description="Solo 30 secondi - Prova la magia di REPING!"
            action={
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('repping:startGuidedClientCreation'));
                }}
                className="text-blue-600 text-xs hover:underline font-semibold"
              >
                Prova ora →
              </button>
            }
          />

          {/* Step 2: Importa clienti CSV (se ha molti clienti) */}
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

          {/* 🔒 BETA: Step Prodotti nascosto - riattivare per MULTIAGENT
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
          */}

          {/* Step 3: Prova assistente */}
          <ChecklistItem
            done={state.hasAskedAssistant}
            icon="💬"
            title="Chiedi qualcosa all'AI"
            description='Es: "Quanti clienti ho a Verona?"'
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

          {/* Step 4: Registra prima visita */}
          <ChecklistItem
            done={state.hasFirstVisit}
            icon="📝"
            title="Registra una visita"
            description="Prova a registrare una visita di prova"
            action={
              <Link 
                href="/tools/add-visit" 
                className="text-blue-600 text-xs hover:underline"
              >
                Registra →
              </Link>
            }
          />

          {/* Step 5: BETA - Invia feedback */}
          <ChecklistItem
            done={state.hasSentFeedback}
            icon="🧪"
            title="Aiutaci a migliorare"
            description="Segnala bug o suggerimenti"
            action={
              <button 
                onClick={handleOpenTestPanel}
                className="text-amber-600 text-xs hover:underline font-medium"
              >
                Apri Test Panel →
              </button>
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

