// lib/rag/search.ts
// Ricerca semantica su accounts

import { embedText } from '../embeddings';
import { supabase } from '../supabase/client';

export interface SearchResult {
  account_id: string;
  name: string | null;
  city: string | null;
  notes: string | null;
  similarity: number;
}

/**
 * Cerca account per similarità semantica
 * Usa la funzione match_accounts definita in SQL
 */
export async function searchAccounts(
  query: string,
  userId: string,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    // Genera embedding della query
    const queryEmbedding = await embedText(query);
    
    // Chiama la funzione SQL match_accounts
    const { data, error } = await supabase.rpc('match_accounts', {
      query_embedding: queryEmbedding,
      match_count: limit,
      user_filter: userId,
    });
    
    if (error) {
      console.error('[RAG:search] Errore match_accounts:', error);
      return [];
    }
    
    return (data as SearchResult[]) || [];
  } catch (e) {
    console.error('[RAG:search] Errore:', e);
    return [];
  }
}

/**
 * Cerca account con threshold di similarità
 */
export async function searchAccountsWithThreshold(
  query: string,
  userId: string,
  threshold: number = 0.7,
  limit: number = 5
): Promise<SearchResult[]> {
  const results = await searchAccounts(query, userId, limit);
  return results.filter(r => r.similarity >= threshold);
}

/**
 * Formatta i risultati RAG per il contesto LLM
 */
export function formatRAGContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return '';
  }
  
  const lines = results.map((r, i) => {
    const parts = [`${i + 1}. ${r.name || 'Cliente senza nome'}`];
    if (r.city) parts.push(`(${r.city})`);
    if (r.notes) parts.push(`- Note: ${r.notes.slice(0, 200)}${r.notes.length > 200 ? '...' : ''}`);
    parts.push(`[similarità: ${(r.similarity * 100).toFixed(0)}%]`);
    return parts.join(' ');
  });
  
  return `Clienti rilevanti trovati:\n${lines.join('\n')}`;
}
