// lib/promemoria.ts
/**
 * ============================================================================
 * LIBRERIA: Gestione Promemoria
 * ============================================================================
 * 
 * CRUD completo per promemoria SENZA crittografia
 * (L'AI deve leggerli per suggerimenti contestuali)
 * 
 * Pattern: stesso di products (INSERT/UPDATE/DELETE semplici)
 * 
 * ============================================================================
 */

import { supabase } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type Promemoria = {
  id: string;
  user_id: string;
  nota: string;
  urgente: boolean;
  created_at: string;
  updated_at: string;
};

export type PromemoriaInput = {
  nota: string;
  urgente: boolean;
};

// ============================================================================
// CREATE
// ============================================================================

export async function createPromemoria(input: PromemoriaInput): Promise<Promemoria> {
  
  // 1. Verifica autenticazione
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Non autenticato');
  }

  // 2. INSERT semplice
  const { data, error } = await supabase
    .from('promemoria')
    .insert({
      user_id: user.id,
      nota: input.nota,
      urgente: input.urgente,
    })
    .select()
    .single();

  if (error) {
    console.error('[Promemoria] Errore INSERT:', error);
    throw new Error(error.message);
  }

  return data;
}

// ============================================================================
// READ
// ============================================================================

export async function fetchPromemoria(): Promise<Promemoria[]> {
  
  // 1. Verifica autenticazione
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Non autenticato');
  }

  // 2. Query tutti i promemoria dell'utente
  // Ordine: urgenti prima (più vecchi prima), poi normali (più vecchi prima)
  const { data, error } = await supabase
    .from('promemoria')
    .select('*')
    .eq('user_id', user.id)
    .order('urgente', { ascending: false })
    .order('created_at', { ascending: true }); // Più vecchi prima

  if (error) {
    console.error('[Promemoria] Errore SELECT:', error);
    throw new Error(error.message);
  }

  return data || [];
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updatePromemoria(
  id: string,
  input: Partial<PromemoriaInput>
): Promise<Promemoria> {
  
  // 1. Verifica autenticazione
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Non autenticato');
  }

  // 2. UPDATE semplice
  const { data, error } = await supabase
    .from('promemoria')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[Promemoria] Errore UPDATE:', error);
    throw new Error(error.message);
  }

  return data;
}

// ============================================================================
// DELETE
// ============================================================================

export async function deletePromemoria(id: string): Promise<void> {
  
  // 1. Verifica autenticazione
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Non autenticato');
  }

  // 2. DELETE semplice
  const { error } = await supabase
    .from('promemoria')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[Promemoria] Errore DELETE:', error);
    throw new Error(error.message);
  }
}

// ============================================================================
// UTILITY: Fetch solo i primi 3 per widget home
// ============================================================================

export async function fetchPromemoriaForWidget(): Promise<Promemoria[]> {
  
  const all = await fetchPromemoria();
  
  // Prendi prima gli urgenti (se ci sono almeno 3)
  const urgenti = all.filter(p => p.urgente);
  
  if (urgenti.length >= 3) {
    return urgenti.slice(0, 3);
  }
  
  // Altrimenti prendi i primi 3 tra urgenti + normali
  return all.slice(0, 3);
}
