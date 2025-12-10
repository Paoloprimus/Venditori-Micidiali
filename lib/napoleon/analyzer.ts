/**
 * ============================================================================
 * 💡 NAPOLEONE v2.0 - Analyzer (Coordinatore Principale)
 * ============================================================================
 * Genera suggerimenti, li salva nel DB, e li recupera
 * ============================================================================
 */

import { supabase } from '@/lib/supabase/client';
import type { 
  NapoleonAnalysis, 
  NapoleonContext, 
  NapoleonSuggestion,
  NewSuggestion,
  SuggestionStatus,
  TriggerConfig,
  CryptoLike
} from './types';
import { DEFAULT_TRIGGER_CONFIG } from './types';
import {
  triggerChurnRisk,
  triggerGrowthOpportunity,
  triggerNewClients,
  triggerCallbacks,
  triggerRevenueDrop,
} from './triggers';

// ═══════════════════════════════════════════════════════════════════════════
// FUNZIONI PRINCIPALI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera nuovi suggerimenti e li salva nel DB
 * @param userId ID utente
 * @param crypto Istanza crypto per decriptare i nomi
 * @param config Configurazione trigger (opzionale)
 */
export async function generateSuggestions(
  userId: string,
  crypto: CryptoLike,
  config: TriggerConfig = DEFAULT_TRIGGER_CONFIG
): Promise<NapoleonAnalysis> {
  console.log('[Napoleon] 💡 Generazione suggerimenti per:', userId);
  const startTime = Date.now();

  // Recupera trigger_keys esistenti per evitare duplicati
  const { data: existingSuggestions } = await supabase
    .from('napoleon_suggestions')
    .select('trigger_key')
    .eq('user_id', userId)
    .in('status', ['nuovo', 'rimandato']);

  const existingTriggerKeys = new Set(
    (existingSuggestions ?? []).map(s => s.trigger_key).filter(Boolean)
  );

  const ctx: NapoleonContext = {
    userId,
    today: new Date(),
    existingTriggerKeys,
    crypto,
  };

  // Esegui tutti i trigger in parallelo
  const [
    churnSuggestions,
    growthSuggestions,
    newClientSuggestions,
    callbackSuggestions,
    dropSuggestions,
  ] = await Promise.all([
    triggerChurnRisk(ctx, config).catch(e => { console.error('[Napoleon] Churn error:', e); return []; }),
    triggerGrowthOpportunity(ctx, config).catch(e => { console.error('[Napoleon] Growth error:', e); return []; }),
    triggerNewClients(ctx, config).catch(e => { console.error('[Napoleon] NewClients error:', e); return []; }),
    triggerCallbacks(ctx, config).catch(e => { console.error('[Napoleon] Callbacks error:', e); return []; }),
    triggerRevenueDrop(ctx, config).catch(e => { console.error('[Napoleon] Drop error:', e); return []; }),
  ]);

  // Combina tutti i nuovi suggerimenti
  const newSuggestions: NewSuggestion[] = [
    ...churnSuggestions,
    ...growthSuggestions,
    ...newClientSuggestions,
    ...callbackSuggestions,
    ...dropSuggestions,
  ];

  // Salva nel DB
  let newGenerated = 0;
  if (newSuggestions.length > 0) {
    const toInsert = newSuggestions.map(s => ({
      user_id: userId,
      ...s,
      status: 'nuovo',
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('napoleon_suggestions')
      .upsert(toInsert, { onConflict: 'user_id,trigger_key' });

    if (error) {
      console.error('[Napoleon] Insert error:', error);
    } else {
      newGenerated = newSuggestions.length;
    }
  }

  // Recupera tutti i suggerimenti attivi
  const allSuggestions = await getSuggestions(userId);

  const elapsed = Date.now() - startTime;
  console.log(`[Napoleon] 💡 Generazione completata in ${elapsed}ms: ${newGenerated} nuovi, ${allSuggestions.length} totali`);

  return {
    suggestions: allSuggestions,
    newGenerated,
    summary: {
      urgente: allSuggestions.filter(s => s.priority === 'urgente').length,
      importante: allSuggestions.filter(s => s.priority === 'importante').length,
      utile: allSuggestions.filter(s => s.priority === 'utile').length,
      total: allSuggestions.length,
    },
    analyzedAt: new Date(),
  };
}

/**
 * Recupera suggerimenti esistenti dal DB
 */
export async function getSuggestions(
  userId: string,
  status: SuggestionStatus[] = ['nuovo', 'rimandato']
): Promise<NapoleonSuggestion[]> {
  const { data, error } = await supabase
    .from('napoleon_suggestions')
    .select('*')
    .eq('user_id', userId)
    .in('status', status)
    .order('priority', { ascending: true }) // urgente prima
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Napoleon] Get error:', error);
    return [];
  }

  // Ordina per priorità (urgente > importante > utile)
  const priorityOrder = { urgente: 0, importante: 1, utile: 2 };
  return (data ?? []).sort((a, b) => 
    priorityOrder[a.priority as keyof typeof priorityOrder] - 
    priorityOrder[b.priority as keyof typeof priorityOrder]
  );
}

/**
 * Recupera solo suggerimenti urgenti (per dashboard)
 */
export async function getUrgentSuggestions(
  userId: string,
  limit: number = 3
): Promise<NapoleonSuggestion[]> {
  const { data, error } = await supabase
    .from('napoleon_suggestions')
    .select('*')
    .eq('user_id', userId)
    .eq('priority', 'urgente')
    .in('status', ['nuovo', 'rimandato'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Napoleon] GetUrgent error:', error);
    return [];
  }

  return data ?? [];
}

/**
 * Segna un suggerimento come completato
 */
export async function completeSuggestion(suggestionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('napoleon_suggestions')
    .update({ 
      status: 'completato', 
      completed_at: new Date().toISOString() 
    })
    .eq('id', suggestionId);

  if (error) {
    console.error('[Napoleon] Complete error:', error);
    return false;
  }
  return true;
}

/**
 * Rimanda un suggerimento
 */
export async function postponeSuggestion(suggestionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('napoleon_suggestions')
    .update({ status: 'rimandato' })
    .eq('id', suggestionId);

  if (error) {
    console.error('[Napoleon] Postpone error:', error);
    return false;
  }
  return true;
}

/**
 * Ignora un suggerimento (non mostrarlo più)
 */
export async function ignoreSuggestion(suggestionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('napoleon_suggestions')
    .update({ status: 'ignorato' })
    .eq('id', suggestionId);

  if (error) {
    console.error('[Napoleon] Ignore error:', error);
    return false;
  }
  return true;
}

/**
 * Recupera suggerimenti completati (storico)
 */
export async function getCompletedSuggestions(
  userId: string,
  days: number = 30
): Promise<NapoleonSuggestion[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { data, error } = await supabase
    .from('napoleon_suggestions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completato')
    .gte('completed_at', cutoff.toISOString())
    .order('completed_at', { ascending: false });

  if (error) {
    console.error('[Napoleon] GetCompleted error:', error);
    return [];
  }

  return data ?? [];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER PER CHAT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera un briefing testuale per la chat
 */
export function generateBriefing(suggestions: NapoleonSuggestion[]): string {
  if (suggestions.length === 0) {
    return `💡 **Tutto sotto controllo!**\n\nNon ho azioni urgenti per te oggi. Continua così!`;
  }

  const lines: string[] = [];
  
  const urgentCount = suggestions.filter(s => s.priority === 'urgente').length;
  
  if (urgentCount > 0) {
    lines.push(`💡 **Ho ${urgentCount} cosa${urgentCount > 1 ? 'e' : ''} urgente${urgentCount > 1 ? 'i' : ''} per te:**\n`);
  } else {
    lines.push(`💡 **Ecco cosa ti suggerisco:**\n`);
  }

  const priorityEmoji = { urgente: '🔴', importante: '🟡', utile: '🟢' };
  const actionEmoji = { chiama: '📞', visita: '🚗', proponi: '💡', recupera: '⚠️', consolida: '🤝', segui: '📋' };

  for (const suggestion of suggestions.slice(0, 5)) {
    const pEmoji = priorityEmoji[suggestion.priority];
    const aEmoji = actionEmoji[suggestion.action_type] || '📌';
    lines.push(`${pEmoji} ${aEmoji} **${suggestion.action_text}**`);
    lines.push(`   _${suggestion.reason}_\n`);
  }

  if (suggestions.length > 5) {
    lines.push(`\n_...e altri ${suggestions.length - 5} suggerimenti._`);
  }

  lines.push(`\nVuoi che ti aiuti con qualcuno di questi?`);

  return lines.join('\n');
}
