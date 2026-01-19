/**
 * ============================================================================
 * 📌 PROMEMORIA CARD - Componente Dashboard
 * ============================================================================
 * Mostra max 3 promemoria (priorità urgenti/vecchi), con link alla lista completa
 * Pattern uguale a NapoleonCard
 * ============================================================================
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPromemoria, deletePromemoria, type Promemoria } from '@/lib/promemoria';

interface PromemoriaCardProps {
  className?: string;
}

export default function PromemoriaCard({ className = '' }: PromemoriaCardProps) {
  const [loading, setLoading] = useState(true);
  const [promemoria, setPromemoria] = useState<Promemoria[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [minimized, setMinimized] = useState(true);
  
  // Ref per evitare loop
  const initializedRef = useRef(false);

  // Carica promemoria
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const load = async () => {
      try {
        setLoading(true);
        const all = await fetchPromemoria();
        
        // Ordinamento: urgenti prima (più vecchi), poi normali (più vecchi)
        // fetchPromemoria() già ordina così, prendiamo i primi 3
        setPromemoria(all.slice(0, 3));
        setTotalCount(all.length);
      } catch (e) {
        console.error('[PromemoriaCard] Error:', e);
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, []);

  // Listener per aggiornamenti esterni (da drawer docs o chat)
  useEffect(() => {
    const handleUpdate = () => {
      initializedRef.current = false;
      fetchPromemoria().then(all => {
        setPromemoria(all.slice(0, 3));
        setTotalCount(all.length);
      });
    };
    
    window.addEventListener('promemoria-updated', handleUpdate);
    return () => window.removeEventListener('promemoria-updated', handleUpdate);
  }, []);

  const handleComplete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await deletePromemoria(id);
      setPromemoria(prev => prev.filter(p => p.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
      
      // Notifica altri componenti
      window.dispatchEvent(new CustomEvent('promemoria-updated'));
    } catch (err) {
      console.error('[PromemoriaCard] Errore completamento:', err);
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">📌</span>
          <div>
            <span className="font-bold text-gray-900">Promemoria</span>
            <p className="text-gray-500 text-xs">Le tue note importanti</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-600"></div>
          <span className="ml-2 text-gray-500 text-sm">Caricamento...</span>
        </div>
      </div>
    );
  }

  const hasPromemoria = promemoria.length > 0;
  const hasOther = totalCount > promemoria.length;

  // Formatta data relativa
  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'oggi';
    if (diffDays === 1) return 'ieri';
    if (diffDays < 7) return `${diffDays}g fa`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}sett fa`;
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}
      onClick={(e) => {
        // Se clicco sull'header, toggle accordion
        // Se clicco su un promemoria, non fare nulla (gestito internamente)
      }}
    >
      {/* Header - cliccabile per toggle accordion */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setMinimized(!minimized);
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📌</span>
          <div>
            <h3 className="font-bold text-gray-900">Promemoria</h3>
            <p className="text-gray-500 text-xs">Le tue note importanti</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center">
              {totalCount}
            </span>
          )}
          <span className={`text-gray-400 transition-transform ${minimized ? '' : 'rotate-90'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>

      {/* Content - accordion */}
      {!minimized && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {hasPromemoria ? (
            <div className="space-y-2 pt-3">
              {promemoria.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-lg p-3 flex items-start gap-2 ${
                    p.urgente 
                      ? 'bg-red-50 border border-red-200' 
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <button
                    onClick={(e) => handleComplete(p.id, e)}
                    className={`mt-0.5 w-4 h-4 rounded border-2 hover:border-green-500 
                             hover:bg-green-50 transition-colors flex-shrink-0 ${
                               p.urgente ? 'border-red-300' : 'border-gray-300'
                             }`}
                    title="Fatto!"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {p.urgente && <span className="text-sm">🔴</span>}
                      <span className="font-medium text-gray-900 text-sm line-clamp-2">
                        {p.nota}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      {formatRelativeDate(p.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Link alla lista completa */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Apri drawer docs con tab promemoria
                  window.dispatchEvent(new CustomEvent('open-promemoria'));
                }}
                className="block w-full text-center text-blue-600 hover:text-blue-700 text-sm pt-2 bg-transparent border-none cursor-pointer"
              >
                {hasOther 
                  ? `Vedi tutti i ${totalCount} promemoria →` 
                  : 'Gestisci promemoria →'
                }
              </button>
            </div>
          ) : (
            // Nessun promemoria
            <div className="text-center py-4">
              <span className="text-3xl">✅</span>
              <p className="text-gray-600 mt-2 text-sm">Nessun promemoria!</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('open-promemoria'));
                }}
                className="mt-3 inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg transition-colors"
              >
                + Aggiungi promemoria
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
