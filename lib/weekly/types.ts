/**
 * ============================================================================
 * 📊 RIEPILOGO SETTIMANALE - Tipi TypeScript
 * ============================================================================
 */

/** Punteggio feedback: 👎=-1, 😐=0, 👍=1 */
export type FeedbackScore = -1 | 0 | 1;

/** Record del riepilogo settimanale */
export interface WeeklySummary {
  id: string;
  user_id: string;
  week_start: string;  // YYYY-MM-DD (lunedì)
  
  // Metriche
  days_active: number;
  messages_sent: number;
  routes_planned: number;
  suggestions_completed: number;
  clients_visited: number;
  
  // Feedback
  feedback_score: FeedbackScore | null;
  feedback_note: string | null;
  feedback_at: string | null;
  dismissed: boolean;
  
  // Timestamp
  created_at: string;
  updated_at: string;
}

/** Stats calcolate per la settimana corrente */
export interface WeeklyStats {
  weekStart: Date;
  weekEnd: Date;
  daysActive: number;
  messagesSent: number;
  routesPlanned: number;
  suggestionsCompleted: number;
  clientsVisited: number;
  hasData: boolean;  // true se c'è almeno un dato > 0
}

/** Emoji per feedback */
export const FEEDBACK_EMOJI: Record<FeedbackScore, string> = {
  [-1]: '👎',
  [0]: '😐',
  [1]: '👍',
};

/** Label per feedback */
export const FEEDBACK_LABEL: Record<FeedbackScore, string> = {
  [-1]: 'Poteva andare meglio',
  [0]: 'Nella media',
  [1]: 'Settimana positiva',
};

