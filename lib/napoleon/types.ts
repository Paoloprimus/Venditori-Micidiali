/**
 * ============================================================================
 * 💡 NAPOLEONE v2.0 - Sistema di Suggerimenti Proattivi
 * ============================================================================
 * Tipi TypeScript per il modulo Napoleone
 * ============================================================================
 */

/** Stile di comunicazione di Napoleone */
export type NapoleonStyle = 'assertivo' | 'equilibrato' | 'discreto';

/** Tipo di azione suggerita */
export type ActionType = 'chiama' | 'visita' | 'proponi' | 'recupera' | 'consolida' | 'segui';

/** Priorità dei suggerimenti */
export type SuggestionPriority = 'urgente' | 'importante' | 'utile';

/** Stato del suggerimento */
export type SuggestionStatus = 'nuovo' | 'completato' | 'rimandato' | 'ignorato';

/** Singolo suggerimento di Napoleone (DB) */
export interface NapoleonSuggestion {
  id: string;
  user_id: string;
  client_id?: string;
  client_name?: string;
  action_type: ActionType;
  action_text: string;
  reason: string;
  context_data?: Record<string, unknown>;
  priority: SuggestionPriority;
  status: SuggestionStatus;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
  trigger_key?: string;
}

/** Suggerimento da inserire (senza id e timestamp) */
export interface NewSuggestion {
  client_id?: string;
  client_name?: string;
  action_type: ActionType;
  action_text: string;
  reason: string;
  context_data?: Record<string, unknown>;
  priority: SuggestionPriority;
  trigger_key: string;
  expires_at?: string;
}

/** Risultato dell'analisi di Napoleone */
export interface NapoleonAnalysis {
  suggestions: NapoleonSuggestion[];
  newGenerated: number;
  summary: {
    urgente: number;
    importante: number;
    utile: number;
    total: number;
  };
  analyzedAt: Date;
}

/** Tipo minimo per crypto service */
export interface CryptoLike {
  decryptFields?: (
    scope: string,
    table: string,
    rowId: string,
    row: Record<string, unknown>,
    fields?: string[]
  ) => Promise<Record<string, unknown> | null>;
  getOrCreateScopeKeys?: (scope: string) => Promise<void>;
}

/** Contesto per l'analizzatore */
export interface NapoleonContext {
  userId: string;
  today: Date;
  existingTriggerKeys: Set<string>;
  crypto: CryptoLike;
}

/** Configurazione trigger */
export interface TriggerConfig {
  churnDaysThreshold: number;      // Giorni senza ordine per alert churn
  newClientDaysThreshold: number;  // Giorni per considerare cliente "nuovo"
  callbackCheckDays: number;       // Giorni indietro per cercare callback
  revenueDropThreshold: number;    // % calo per alert
  revenueGrowthThreshold: number;  // % crescita per opportunità
}

/** Default configuration */
export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
  churnDaysThreshold: 21,
  newClientDaysThreshold: 30,
  callbackCheckDays: 14,
  revenueDropThreshold: 30,
  revenueGrowthThreshold: 30,
};

/** Emoji per priorità */
export const PRIORITY_EMOJI: Record<SuggestionPriority, string> = {
  urgente: '🔴',
  importante: '🟡',
  utile: '🟢',
};

/** Emoji per tipo azione */
export const ACTION_EMOJI: Record<ActionType, string> = {
  chiama: '📞',
  visita: '🚗',
  proponi: '💡',
  recupera: '⚠️',
  consolida: '🤝',
  segui: '📋',
};

/** Labels per tipo azione */
export const ACTION_LABELS: Record<ActionType, string> = {
  chiama: 'Chiama',
  visita: 'Visita',
  proponi: 'Proponi',
  recupera: 'Recupera',
  consolida: 'Consolida',
  segui: 'Segui',
};
