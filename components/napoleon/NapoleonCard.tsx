/**
 * ============================================================================
 * 🎩 NAPOLEONE CARD v2.0 - Componente Dashboard
 * ============================================================================
 * Mostra max 3 suggerimenti urgenti, altrimenti bottone "Posso suggerirti?"
 * Click sulla card porta alla pagina /napoleon
 * ============================================================================
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import {
  generateSuggestions,
  getUrgentSuggestions,
  getSuggestions,
  completeSuggestion,
  type NapoleonSuggestion,
  PRIORITY_EMOJI,
  ACTION_EMOJI,
} from '@/lib/napoleon';

interface NapoleonCardProps {
  className?: string;
}

export default function NapoleonCard({ className = '' }: NapoleonCardProps) {
  const router = useRouter();
  const { crypto, ready: cryptoReady } = useCrypto();
  const [loading, setLoading] = useState(true);
  const [urgentSuggestions, setUrgentSuggestions] = useState<NapoleonSuggestion[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [visible, setVisible] = useState(true);
  
  // Refs per evitare loop
  const initializedRef = useRef(false);
  const loadingRef = useRef(false);

  // Controlla preferenze visibilità (una sola volta)
  useEffect(() => {
    const savedVisible = localStorage.getItem('napoleon_visible');
    if (savedVisible === 'false') {
      setVisible(false);
    }
    
    const handleVisibilityChange = (e: CustomEvent) => {
      setVisible(e.detail.enabled);
    };
    window.addEventListener('repping:napoleonVisibilityChanged', handleVisibilityChange as EventListener);
    return () => window.removeEventListener('repping:napoleonVisibilityChanged', handleVisibilityChange as EventListener);
  }, []);

  // Carica suggerimenti esistenti subito, genera nuovi solo se crypto è pronto
  useEffect(() => {
    if (initializedRef.current) return;
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    initializedRef.current = true;
    
    const load = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Prima carica suggerimenti esistenti dal DB (non richiede crypto)
        console.log('[NapoleonCard] Caricamento suggerimenti esistenti...');
        const [urgent, all] = await Promise.all([
          getUrgentSuggestions(user.id, 3),
          getSuggestions(user.id),
        ]);

        setUrgentSuggestions(urgent);
        setTotalCount(all.length);
        setLoading(false);
        console.log('[NapoleonCard] Caricati:', urgent.length, 'urgenti,', all.length, 'totali');

        // Se crypto è pronto, genera nuovi suggerimenti in background
        if (cryptoReady && crypto) {
          console.log('[NapoleonCard] Generazione nuovi suggerimenti in background...');
          try {
            await generateSuggestions(user.id, crypto);
            // Ricarica dopo generazione
            const [newUrgent, newAll] = await Promise.all([
              getUrgentSuggestions(user.id, 3),
              getSuggestions(user.id),
            ]);
            setUrgentSuggestions(newUrgent);
            setTotalCount(newAll.length);
          } catch (e) {
            console.warn('[NapoleonCard] Generazione fallita:', e);
          }
        }
      } catch (e) {
        console.error('[NapoleonCard] Error:', e);
        setLoading(false);
      } finally {
        loadingRef.current = false;
      }
    };
    
    load();
  }, []); // Esegue solo al mount

  const handleComplete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await completeSuggestion(id);
    if (success) {
      setUrgentSuggestions(prev => prev.filter(s => s.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  // Non mostrare nulla durante il caricamento iniziale
  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl shadow-lg p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">💡</span>
          <div>
            <span className="text-white font-bold">Napoleone</span>
            <p className="text-blue-100 text-xs">Suggerimenti proattivi</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
          <span className="ml-2 text-white/70 text-sm">Analizzo...</span>
        </div>
      </div>
    );
  }

  // Non mostrare se nascosto nelle preferenze
  if (!visible) {
    return null;
  }

  const hasUrgent = urgentSuggestions.length > 0;
  const hasOther = totalCount > urgentSuggestions.length;

  return (
    <Link href="/napoleon" className={`block ${className}`}>
      <div className="bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3"
          onClick={(e) => {
            if (hasUrgent) {
              e.preventDefault();
              setMinimized(!minimized);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-bold text-white">Napoleone</h3>
              <p className="text-blue-100 text-xs">Suggerimenti proattivi</p>
            </div>
            {totalCount > 0 && (
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full ml-auto">
                {totalCount}
              </span>
            )}
          </div>
          <div className="text-white/70 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Content */}
        {!minimized && (
          <div className="px-4 pb-4">
            {hasUrgent ? (
              // Mostra max 3 suggerimenti urgenti
              <div className="space-y-2">
                {urgentSuggestions.map((suggestion) => {
                  const actionEmoji = ACTION_EMOJI[suggestion.action_type] || '📌';
                  
                  return (
                    <div
                      key={suggestion.id}
                      className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
                    >
                      <button
                        onClick={(e) => handleComplete(suggestion.id, e)}
                        className="mt-0.5 w-4 h-4 rounded border-2 border-red-300 hover:border-green-500 
                                 hover:bg-green-50 transition-colors flex-shrink-0"
                        title="Fatto!"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{PRIORITY_EMOJI.urgente}</span>
                          <span className="text-sm">{actionEmoji}</span>
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {suggestion.action_text}
                          </span>
                        </div>
                        <p className="text-gray-600 text-xs mt-0.5 line-clamp-1">
                          {suggestion.reason}
                        </p>
                      </div>
                      {suggestion.client_id && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/clients/${suggestion.client_id}`);
                          }}
                          className="p-1 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
                
                {hasOther && (
                  <p className="text-center text-white/60 text-xs pt-1">
                    +{totalCount - urgentSuggestions.length} altri suggerimenti →
                  </p>
                )}
              </div>
            ) : totalCount > 0 ? (
              // Nessun urgente ma ci sono altri suggerimenti
              <div className="text-center py-4">
                <span className="text-3xl">✅</span>
                <p className="text-white/80 mt-2 text-sm">Nessuna urgenza</p>
                <div className="mt-3 inline-block bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                  Posso suggerirti? ({totalCount})
                </div>
              </div>
            ) : (
              // Nessun suggerimento
              <div className="text-center py-4">
                <span className="text-3xl">🎯</span>
                <p className="text-white/80 mt-2 text-sm">Tutto sotto controllo!</p>
                <p className="text-white/50 text-xs mt-1">Clicca per vedere lo storico</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
