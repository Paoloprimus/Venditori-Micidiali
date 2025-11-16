// lib/cache.ts
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type { QueryPlan } from './semantic/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Genera embedding per query usando OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.toLowerCase().trim(),
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('[cache] Embedding error:', error);
    throw error;
  }
}

/**
 * Cerca query simili nella cache usando cosine similarity
 */
export async function findSimilarQuery(
  embedding: number[],
  userId: string,
  supabase: any
): Promise<{ plan: QueryPlan; similarity: number; cacheId: string } | null> {
  try {
    // Query pgvector con cosine similarity
    // Threshold: 0.85 (più alto = più simile)
    const { data, error } = await supabase.rpc('match_query_cache', {
      query_embedding: embedding,
      match_threshold: 0.85,
      match_count: 1,
      target_user_id: userId
    });
    
    if (error) {
      console.error('[cache] Search error:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const match = data[0];
    
    // Incrementa hit_count
    await supabase
      .from('query_cache')
      .update({ 
        hit_count: match.hit_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', match.id);
    
    return {
      plan: match.query_plan,
      similarity: match.similarity,
      cacheId: match.id
    };
  } catch (error) {
    console.error('[cache] Find similar error:', error);
    return null;
  }
}

/**
 * Salva nuova entry nella cache
 */
export async function saveCacheEntry(
  queryText: string,
  embedding: number[],
  plan: QueryPlan,
  userId: string,
  supabase: any
): Promise<void> {
  try {
    const { error } = await supabase
      .from('query_cache')
      .insert({
        user_id: userId,
        query_text: queryText,
        query_embedding: embedding,
        query_plan: plan,
        hit_count: 0
      });
    
    if (error) {
      console.error('[cache] Save error:', error);
    }
  } catch (error) {
    console.error('[cache] Save exception:', error);
  }
}
