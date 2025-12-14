/**
 * ============================================================================
 * PAGINA: Preferenze Utente
 * ============================================================================
 * Impostazioni personalizzabili tra cui lo stile di Napoleone
 * ============================================================================
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { NapoleonStyle } from "@/lib/napoleon";

interface UserPreferences {
  napoleonVisible: boolean;
  napoleonStyle: NapoleonStyle;
  testPanelEnabled: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  napoleonVisible: true,
  napoleonStyle: 'equilibrato',
  testPanelEnabled: true,
};

const NAPOLEON_STYLES: Array<{ value: NapoleonStyle; label: string; description: string; example: string }> = [
  { 
    value: 'assertivo', 
    label: 'Assertivo', 
    description: 'Usa l\'imperativo diretto',
    example: '"Chiama Rossi Bar"'
  },
  { 
    value: 'equilibrato', 
    label: 'Equilibrato', 
    description: 'Espone la necessità del cliente',
    example: '"Rossi Bar ha bisogno di essere chiamato"'
  },
  { 
    value: 'discreto', 
    label: 'Discreto', 
    description: 'Suggerisce in modo indiretto',
    example: '"Chiamerei Rossi Bar"'
  },
];

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // 🧪 BETA: Mostra sempre il toggle Test Panel
  const [isTester, setIsTester] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carica preferenze e ruolo dal profilo
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences, role')
        .eq('id', user.id)
        .single();

      // 🧪 BETA: isTester sempre true (gestito nello state iniziale)

      if (profile?.preferences) {
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...profile.preferences,
        });
      }
    } catch (e) {
      console.error('Errore caricamento preferenze:', e);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { error } = await supabase
        .from('profiles')
        .update({ preferences })
        .eq('id', user.id);

      if (error) throw error;

      // Salva anche in localStorage per accesso veloce
      localStorage.setItem('napoleon_style', preferences.napoleonStyle);
      localStorage.setItem('napoleon_visible', String(preferences.napoleonVisible));
      localStorage.setItem('test_panel_enabled', String(preferences.testPanelEnabled));

      // Emetti evento per aggiornare Test Panel in tempo reale
      window.dispatchEvent(new CustomEvent('repping:testPanelChanged', {
        detail: { enabled: preferences.testPanelEnabled }
      }));

      setMessage({ type: 'success', text: 'Preferenze salvate!' });
    } catch (e: any) {
      console.error('Errore salvataggio:', e);
      setMessage({ type: 'error', text: e.message || 'Errore salvataggio' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            ← Torna alla home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">⚙️ Preferenze</h1>
          <p className="text-gray-600 mt-1">Personalizza il comportamento dell'app</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-3">Caricamento...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sezione Napoleone */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-400 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">💡</span>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Napoleone</h2>
                      <p className="text-blue-100 text-sm">Assistente proattivo</p>
                    </div>
                  </div>
                  {/* Toggle visibilità */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-white text-sm">Mostra in Dashboard</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={preferences.napoleonVisible}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          napoleonVisible: e.target.checked
                        }))}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        preferences.napoleonVisible ? 'bg-white' : 'bg-blue-800'
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                          preferences.napoleonVisible 
                            ? 'translate-x-5 bg-blue-600' 
                            : 'bg-blue-400'
                        }`}></div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className={`p-6 transition-opacity ${preferences.napoleonVisible ? '' : 'opacity-50'}`}>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Atteggiamento
                </label>
                
                <div className="space-y-3">
                  {NAPOLEON_STYLES.map((style) => (
                    <label 
                      key={style.value}
                      className={`
                        flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${preferences.napoleonStyle === style.value 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                        ${!preferences.napoleonVisible ? 'pointer-events-none' : ''}
                      `}
                    >
                      <input
                        type="radio"
                        name="napoleonStyle"
                        value={style.value}
                        checked={preferences.napoleonStyle === style.value}
                        disabled={!preferences.napoleonVisible}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          napoleonStyle: e.target.value as NapoleonStyle
                        }))}
                        className="mt-1 accent-blue-600"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{style.label}</span>
                        <p className="text-sm text-gray-600 mt-1">{style.description}</p>
                        <p className="text-sm text-blue-600 mt-1 italic">{style.example}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Sezione Test Panel - BETA: sempre visibile */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🧪</span>
                      <div>
                        <h2 className="text-lg font-semibold text-white">Test Companion</h2>
                        <p className="text-indigo-100 text-sm">Pannello per segnalazioni Beta</p>
                      </div>
                    </div>
                    {/* Toggle attivazione */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-white text-sm">Attivo</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={preferences.testPanelEnabled}
                          onChange={(e) => setPreferences(prev => ({
                            ...prev,
                            testPanelEnabled: e.target.checked
                          }))}
                          className="sr-only"
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${
                          preferences.testPanelEnabled ? 'bg-white' : 'bg-indigo-800'
                        }`}>
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                            preferences.testPanelEnabled 
                              ? 'translate-x-5 bg-indigo-600' 
                              : 'bg-indigo-400'
                          }`}></div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className={`p-6 transition-opacity ${preferences.testPanelEnabled ? '' : 'opacity-50'}`}>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>📍 Il pannello appare in basso a destra su ogni pagina</p>
                    <p>💡 Usa le categorie per segnalare:</p>
                    <ul className="ml-4 space-y-1">
                      <li>🐛 <strong>Bug</strong> - Errori e malfunzionamenti</li>
                      <li>🎨 <strong>UX</strong> - Problemi di usabilità</li>
                      <li>💡 <strong>Idea</strong> - Suggerimenti e miglioramenti</li>
                      <li>⚡ <strong>Perf</strong> - Lentezza o problemi di performance</li>
                    </ul>
                    <p className="pt-2 text-gray-500 italic">
                      ⌘+Enter per salvare velocemente
                    </p>
                </div>
              </div>
            </div>

            {/* Messaggio */}
            {message && (
              <div className={`
                px-4 py-3 rounded-lg text-sm
                ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}
              `}>
                {message.text}
              </div>
            )}

            {/* Bottone salva */}
            <button
              onClick={savePreferences}
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium
                       hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
            >
              {saving ? 'Salvataggio...' : 'Salva preferenze'}
            </button>

            {/* Link altre impostazioni */}
            <div className="text-center pt-4">
              <Link 
                href="/settings/my-data" 
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                I miei dati e privacy →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

