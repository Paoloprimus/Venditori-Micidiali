/**
 * ============================================================================
 * 💡 NAPOLEONE v2.0 - Sistema di Suggerimenti Proattivi
 * ============================================================================
 * 
 * Modulo per generare e gestire suggerimenti d'azione intelligenti.
 * 
 * USO:
 * ```typescript
 * import { generateSuggestions, getSuggestions, completeSuggestion } from '@/lib/napoleon';
 * 
 * // Genera nuovi suggerimenti (al login)
 * const analysis = await generateSuggestions(userId);
 * 
 * // Recupera suggerimenti esistenti
 * const suggestions = await getSuggestions(userId);
 * 
 * // Segna come completato
 * await completeSuggestion(suggestionId);
 * ```
 * 
 * ============================================================================
 */

// Export tipi
export type {
  NapoleonStyle,
  ActionType,
  SuggestionPriority,
  SuggestionStatus,
  NapoleonSuggestion,
  NewSuggestion,
  NapoleonAnalysis,
  NapoleonContext,
  TriggerConfig,
  CryptoLike,
} from './types';

// Export costanti
export {
  DEFAULT_TRIGGER_CONFIG,
  PRIORITY_EMOJI,
  ACTION_EMOJI,
  ACTION_LABELS,
} from './types';

// Export funzioni principali
export {
  generateSuggestions,
  getSuggestions,
  getUrgentSuggestions,
  completeSuggestion,
  postponeSuggestion,
  ignoreSuggestion,
  getCompletedSuggestions,
  generateBriefing,
} from './analyzer';

// Export trigger individuali (per uso avanzato/test)
export {
  triggerChurnRisk,
  triggerGrowthOpportunity,
  triggerNewClients,
  triggerCallbacks,
  triggerRevenueDrop,
} from './triggers';
