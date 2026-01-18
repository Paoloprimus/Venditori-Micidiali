/**
 * ============================================================================
 * 🎩 PAGINA: Suggerimenti Napoleone
 * ============================================================================
 * Lista completa dei suggerimenti con possibilità di spuntare/rimandare
 * ============================================================================
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import {
  generateSuggestions,
  getSuggestions,
  getCompletedSuggestions,
  completeSuggestion,
  postponeSuggestion,
  ignoreSuggestion,
  type NapoleonSuggestion,
  type NapoleonAnalysis,
  PRIORITY_EMOJI,
  ACTION_EMOJI,
} from '@/lib/napoleon';

type TabType = 'attivi' | 'completati';

export default function NapoleonPage() {
  const { crypto, ready: cryptoReady } = useCrypto();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<NapoleonSuggestion[]>([]);
  const [completedSuggestions, setCompletedSuggestions] = useState<NapoleonSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('attivi');
  const [analysis, setAnalysis] = useState<NapoleonAnalysis | null>(null);

  const loadSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [active, completed] = await Promise.all([
        getSuggestions(user.id),
        getCompletedSuggestions(user.id, 30),
      ]);

      setSuggestions(active);
      setCompletedSuggestions(completed);
    } catch (e) {
      console.error('[Napoleon] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!crypto || !cryptoReady) {
      console.error('[Napoleon] Crypto non pronto');
      return;
    }
    try {
      setGenerating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const result = await generateSuggestions(user.id, crypto);
      setAnalysis(result);
      setSuggestions(result.suggestions);
    } catch (e) {
      console.error('[Napoleon] Generate error:', e);
    } finally {
      setGenerating(false);
    }
  }, [crypto, cryptoReady]);

  const handleComplete = useCallback(async (id: string) => {
    const success = await completeSuggestion(id);
    if (success) {
      setSuggestions(prev => prev.filter(s => s.id !== id));
      // Ricarica completati
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const completed = await getCompletedSuggestions(user.id, 30);
        setCompletedSuggestions(completed);
      }
    }
  }, []);

  const handlePostpone = useCallback(async (id: string) => {
    await postponeSuggestion(id);
    // Sposta in fondo alla lista
    setSuggestions(prev => {
      const item = prev.find(s => s.id === id);
      if (!item) return prev;
      return [...prev.filter(s => s.id !== id), { ...item, status: 'rimandato' as const }];
    });
  }, []);

  const handleIgnore = useCallback(async (id: string) => {
    const success = await ignoreSuggestion(id);
    if (success) {
      setSuggestions(prev => prev.filter(s => s.id !== id));
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const priorityColors = {
    urgente: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    importante: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    utile: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  };

  const displaySuggestions = activeTab === 'attivi' ? suggestions : completedSuggestions;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-slate-300 hover:text-white mb-4"
          >
            ← Torna alla home
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-4xl">💡</span>
            <div>
              <h1 className="text-2xl font-bold">Napoleone</h1>
              <p className="text-slate-300 text-sm">I tuoi suggerimenti d'azione</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs e bottone genera */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('attivi')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'attivi'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Attivi ({suggestions.length})
            </button>
            <button
              onClick={() => setActiveTab('completati')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'completati'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Completati ({completedSuggestions.length})
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm
                     hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                Analizzo...
              </>
            ) : (
              <>↻ Aggiorna</>
            )}
          </button>
        </div>

        {/* Feedback generazione */}
        {analysis && analysis.newGenerated > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 text-sm text-green-800">
            ✅ Generati {analysis.newGenerated} nuovi suggerimenti
          </div>
        )}
      </div>

      {/* Lista suggerimenti */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-blue-200 border-t-blue-600 rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-3">Caricamento...</p>
          </div>
        ) : displaySuggestions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <span className="text-5xl">
              {activeTab === 'attivi' ? '✅' : '📋'}
            </span>
            <p className="text-gray-600 mt-4 font-medium">
              {activeTab === 'attivi' 
                ? 'Nessun suggerimento attivo' 
                : 'Nessun suggerimento completato negli ultimi 30 giorni'
              }
            </p>
            {activeTab === 'attivi' && (
              <button
                onClick={handleGenerate}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium
                         hover:bg-blue-500 transition-colors"
              >
                Genera suggerimenti
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displaySuggestions.map((suggestion) => {
              const colors = priorityColors[suggestion.priority];
              const actionEmoji = ACTION_EMOJI[suggestion.action_type] || '📌';
              const priorityEmoji = PRIORITY_EMOJI[suggestion.priority];
              const isCompleted = suggestion.status === 'completato';

              return (
                <div
                  key={suggestion.id}
                  className={`
                    ${colors.bg} ${colors.border} border rounded-xl p-4
                    ${isCompleted ? 'opacity-60' : ''}
                    transition-all hover:shadow-md
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox / Status */}
                    {!isCompleted ? (
                      <button
                        onClick={() => handleComplete(suggestion.id)}
                        className="mt-1 w-5 h-5 rounded border-2 border-gray-300 hover:border-green-500 
                                 hover:bg-green-50 transition-colors flex-shrink-0"
                        title="Segna come completato"
                      />
                    ) : (
                      <div className="mt-1 w-5 h-5 rounded bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{priorityEmoji}</span>
                        <span>{actionEmoji}</span>
                        <span className={`font-semibold ${colors.text}`}>
                          {suggestion.action_text}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">
                        {suggestion.reason}
                      </p>
                      {isCompleted && suggestion.completed_at && (
                        <p className="text-gray-400 text-xs mt-2">
                          Completato il {new Date(suggestion.completed_at).toLocaleDateString('it-IT')}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {suggestion.client_id && (
                        <Link
                          href={`/clients/${suggestion.client_id}?from=napoleon`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                          title="Vai al cliente"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                      {!isCompleted && (
                        <button
                          onClick={() => handleIgnore(suggestion.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                          title="Ignora"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

