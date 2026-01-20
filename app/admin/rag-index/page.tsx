"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';

interface IndexStats {
  total: number;
  indexed: number;
  skipped: number;
  errors: number;
}

interface EmbeddingStatus {
  accountsTotal: number;
  accountsWithName: number;
  embeddingsCount: number;
  lastUpdated: string | null;
}

export default function RAGIndexPage() {
  const { ready: cryptoReady, userId } = useCrypto();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<EmbeddingStatus | null>(null);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Verifica se utente è admin
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.role === 'admin');
      setChecking(false);
    }
    checkAdmin();
  }, []);

  // Carica stato attuale embeddings
  async function loadStatus() {
    if (!userId) return;

    // Conta accounts totali
    const { count: totalCount } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Conta accounts con name
    const { count: namedCount } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('name', 'is', null);

    // Conta embeddings
    const { data: embData } = await supabase
      .from('account_embeddings')
      .select('account_id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    // Conta embeddings per questo utente (join con accounts)
    const { count: embCount } = await supabase
      .from('account_embeddings')
      .select('*, accounts!inner(*)', { count: 'exact', head: true })
      .eq('accounts.user_id', userId);

    setStatus({
      accountsTotal: totalCount || 0,
      accountsWithName: namedCount || 0,
      embeddingsCount: embCount || 0,
      lastUpdated: embData?.[0]?.updated_at || null,
    });
  }

  useEffect(() => {
    if (isAdmin && cryptoReady && userId) {
      loadStatus();
    }
  }, [isAdmin, cryptoReady, userId]);

  // Esegui indicizzazione
  async function runIndexing() {
    setLoading(true);
    setError(null);
    setStats(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessione non valida');
      }

      const res = await fetch('/api/rag/index-accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Errore indicizzazione');
      }

      setStats(json.stats);
      await loadStatus(); // Aggiorna status

    } catch (e: any) {
      setError(e.message || 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg">Verifica permessi admin...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-red-600">
        <h1 className="text-2xl font-bold mb-4">Accesso Negato</h1>
        <p>Non hai i permessi di amministratore.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        🧠 RAG - Indicizzazione Clienti
      </h1>

      <p className="mb-6 text-gray-700">
        Questa pagina genera gli <strong>embeddings</strong> per i tuoi clienti,
        abilitando la <strong>ricerca semantica</strong> nella chat.
        Quando chiedi qualcosa che l'NLU non capisce, il sistema cercherà
        clienti rilevanti e userà Claude per rispondere.
      </p>

      {/* Stato attuale */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">📊 Stato Attuale</h2>
        
        {status ? (
          <div className="space-y-2">
            <p>Account totali: <span className="font-bold">{status.accountsTotal}</span></p>
            <p>Account con nome: <span className="font-bold text-green-600">{status.accountsWithName}</span></p>
            <p>Embeddings generati: <span className="font-bold text-blue-600">{status.embeddingsCount}</span></p>
            {status.lastUpdated && (
              <p className="text-sm text-gray-500">
                Ultimo aggiornamento: {new Date(status.lastUpdated).toLocaleString('it-IT')}
              </p>
            )}
            
            {status.accountsWithName > status.embeddingsCount && (
              <p className="mt-4 text-orange-600">
                ⚠️ {status.accountsWithName - status.embeddingsCount} clienti non ancora indicizzati
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Caricamento...</p>
        )}
      </div>

      {/* Azione */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">🚀 Indicizza Clienti</h2>
        
        <p className="mb-4 text-gray-600">
          Genera embeddings per tutti i clienti con nome popolato.
          I clienti già indicizzati verranno saltati se non sono cambiati.
        </p>

        <button
          onClick={runIndexing}
          disabled={loading || !cryptoReady}
          className={`px-6 py-3 rounded-lg text-white font-semibold transition-colors ${
            loading || !cryptoReady
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? '⏳ Indicizzazione in corso...' : '🧠 Avvia Indicizzazione'}
        </button>

        {error && (
          <p className="mt-4 text-red-600">❌ {error}</p>
        )}

        {stats && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="font-semibold text-green-800">✅ Indicizzazione completata!</p>
            <ul className="mt-2 text-sm text-green-700">
              <li>Totali: {stats.total}</li>
              <li>Indicizzati: {stats.indexed}</li>
              <li>Saltati (già aggiornati): {stats.skipped}</li>
              {stats.errors > 0 && <li className="text-red-600">Errori: {stats.errors}</li>}
            </ul>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-blue-800">
        <p className="font-semibold">💡 Come funziona:</p>
        <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
          <li>Il sistema legge <code>name</code>, <code>city</code>, <code>notes</code> di ogni cliente</li>
          <li>Genera un embedding (vettore 1536D) con OpenAI</li>
          <li>Salva in <code>account_embeddings</code> per ricerca veloce</li>
          <li>Quando chiedi qualcosa di non riconosciuto, cerca clienti simili</li>
          <li>Claude usa il contesto trovato per rispondere</li>
        </ol>
      </div>
    </div>
  );
}
