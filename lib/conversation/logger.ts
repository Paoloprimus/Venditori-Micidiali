/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONVERSATION LOGGER - Fase 2: Logging di tutte le conversazioni
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Salva ogni interazione in conversation_history per:
 * - RAG futuro (Fase 3)
 * - Analytics (Fase 4)
 * - Apprendimento personalizzato
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase/client';

export type ConversationSource = 'local' | 'rag' | 'llm' | 'unknown';

export interface LogEntry {
  query: string;
  response: string;
  intent?: string | null;
  confidence?: number | null;
  source: ConversationSource;
  account_ids?: string[];
  entities?: Record<string, any>;
}

/**
 * Logga una conversazione nel database
 * Funziona in modo asincrono e non blocca l'UI
 */
export async function logConversation(entry: LogEntry): Promise<void> {
  try {
    // Ottieni l'utente corrente
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.debug('[ConversationLogger] Utente non autenticato, skip logging');
      return;
    }

    // Prepara il record
    const record = {
      user_id: user.id,
      query: entry.query,
      response: entry.response,
      intent: entry.intent ?? null,
      confidence: entry.confidence ?? null,
      source: entry.source,
      account_ids: entry.account_ids?.length ? entry.account_ids : null,
      entities: entry.entities && Object.keys(entry.entities).length > 0 
        ? entry.entities 
        : null,
    };

    // Inserisci (fire and forget, non blocchiamo l'UI)
    const { error } = await supabase
      .from('conversation_history')
      .insert(record);

    if (error) {
      // Log silenzioso, non vogliamo interrompere l'esperienza utente
      console.warn('[ConversationLogger] Errore salvataggio:', error.message);
    } else {
      console.debug('[ConversationLogger] ✅ Conversazione salvata', {
        intent: entry.intent,
        source: entry.source,
      });
    }
  } catch (err) {
    // Errori silenti, il logging non deve mai interrompere l'app
    console.warn('[ConversationLogger] Errore:', err);
  }
}

/**
 * Estrae gli account_ids da una risposta (se contiene riferimenti a clienti)
 * Usa pattern matching per trovare UUID nel contesto
 */
export function extractAccountIds(entities: Record<string, any>): string[] {
  const ids: string[] = [];
  
  // Se c'è un clientId esplicito
  if (entities.clientId && typeof entities.clientId === 'string') {
    ids.push(entities.clientId);
  }
  
  // Se c'è un array di clientIds
  if (Array.isArray(entities.clientIds)) {
    ids.push(...entities.clientIds.filter((id: any) => typeof id === 'string'));
  }
  
  return [...new Set(ids)]; // Rimuovi duplicati
}

/**
 * Determina la source in base all'intent
 */
export function determineSource(intent: string | null, confidence: number): ConversationSource {
  if (!intent || intent === 'unknown') {
    return 'unknown';
  }
  
  // Intent gestiti localmente hanno alta confidence
  if (confidence >= 0.7) {
    return 'local';
  }
  
  // Bassa confidence = probabilmente passerà al LLM (futuro)
  return 'llm';
}
