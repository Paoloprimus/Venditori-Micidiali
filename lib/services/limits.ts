// lib/services/limits.ts
// Servizio per gestione limiti di servizio per ruolo
// Allineato con piani reping.it (Dic 2025)

import { supabase } from '@/lib/supabase/client';

// Ruoli disponibili (allineati con sito reping.it):
// - admin: Amministratori (tutto illimitato)
// - tester: Collaboratori che testano gratis (= Business completo)
// - premium: Piano €49/mese (500 clienti, 60 query/g, 90gg storico, 9 PDF/mese)
// - business: Piano €99/mese (1000 clienti, illimitato, Guida, Analytics)
export type UserRole = 'admin' | 'tester' | 'premium' | 'business';

export type ServiceLimits = {
  max_chat_queries_day: number;
  history_days: number | null;  // null = illimitato
  max_pdf_exports_month: number | null;  // null = illimitato
  analytics_advanced: boolean;
  driving_mode_advanced: boolean;
  detailed_reports: boolean;
  max_clients: number | null;  // null = illimitato
};

export type UsageStats = {
  chatQueriesToday: number;
  pdfExportsThisMonth: number;
};

// Cache locale per evitare troppe query
let cachedLimits: ServiceLimits | null = null;
let cachedRole: UserRole | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minuti

/**
 * Ottiene il ruolo dell'utente corrente
 */
export async function getUserRole(): Promise<UserRole | null> {
  const now = Date.now();
  if (cachedRole && now - cacheTimestamp < CACHE_TTL) {
    return cachedRole;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  cachedRole = (profile?.role as UserRole) || 'premium';
  cacheTimestamp = now;
  return cachedRole;
}

/**
 * Ottiene i limiti di servizio per l'utente corrente
 */
export async function getMyLimits(): Promise<ServiceLimits | null> {
  const now = Date.now();
  if (cachedLimits && now - cacheTimestamp < CACHE_TTL) {
    return cachedLimits;
  }

  const { data, error } = await supabase.rpc('get_my_limits');
  
  if (error || !data || data.length === 0) {
    console.error('[Limits] Errore get_my_limits:', error);
    // Fallback a limiti Premium (piano base)
    return {
      max_chat_queries_day: 60,
      history_days: 90,
      max_pdf_exports_month: 9,
      analytics_advanced: false,
      driving_mode_advanced: false,
      detailed_reports: false,
      max_clients: 500,
    };
  }

  cachedLimits = data[0] as ServiceLimits;
  cacheTimestamp = now;
  return cachedLimits;
}

/**
 * Ottiene statistiche uso corrente
 */
export async function getUsageStats(): Promise<UsageStats> {
  const [chatRes, pdfRes] = await Promise.all([
    supabase.rpc('get_chat_usage_today'),
    supabase.rpc('get_pdf_exports_this_month'),
  ]);

  return {
    chatQueriesToday: chatRes.data ?? 0,
    pdfExportsThisMonth: pdfRes.data ?? 0,
  };
}

/**
 * Verifica se l'utente può usare una funzionalità
 */
export async function canUseFeature(feature: 'chat_query' | 'pdf_export' | 'add_client' | 'analytics_advanced' | 'driving_mode' | 'detailed_reports'): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_use_feature', { p_feature: feature });
  if (error) {
    console.error('[Limits] Errore can_use_feature:', error);
    return true; // In caso di errore, permetti (fail open)
  }
  return data ?? true;
}

/**
 * Incrementa contatore uso (chiamare dopo aver usato la funzionalità)
 */
export async function trackUsage(type: 'chat_query' | 'pdf_export'): Promise<void> {
  const { error } = await supabase.rpc('increment_usage', { p_type: type });
  if (error) {
    console.error('[Limits] Errore increment_usage:', error);
  }
}

/**
 * Verifica se una data è nel range storico consentito
 */
export async function isDateInAllowedHistory(date: Date): Promise<boolean> {
  const limits = await getMyLimits();
  if (!limits || limits.history_days === null) return true; // Illimitato
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - limits.history_days);
  return date >= cutoff;
}

/**
 * Ottiene la data minima visibile nello storico
 */
export async function getHistoryCutoffDate(): Promise<Date | null> {
  const limits = await getMyLimits();
  if (!limits || limits.history_days === null) return null; // Illimitato
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - limits.history_days);
  return cutoff;
}

/**
 * Verifica se l'utente è admin
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin';
}

/**
 * Verifica se l'utente ha piano Business o superiore (include tester e admin)
 */
export async function isBusiness(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin' || role === 'business' || role === 'tester';
}

/**
 * Verifica se l'utente ha almeno piano Premium
 */
export async function isPremium(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin' || role === 'business' || role === 'premium' || role === 'tester';
}

/**
 * Verifica se l'utente è un tester beta
 */
export async function isTester(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'tester';
}

/**
 * Resetta la cache (utile dopo cambio ruolo)
 */
export function clearLimitsCache(): void {
  cachedLimits = null;
  cachedRole = null;
  cacheTimestamp = 0;
}

/**
 * Messaggio di upsell per funzionalità Business
 */
export function getUpsellMessage(feature: string): string {
  const messages: Record<string, string> = {
    chat_query: '🔒 Hai raggiunto il limite giornaliero di domande (60). Passa a BUSINESS per domande illimitate!',
    pdf_export: '🔒 Hai raggiunto il limite mensile di export PDF (9). Passa a BUSINESS per export illimitati!',
    add_client: '🔒 Hai raggiunto il limite di clienti per il tuo piano. Passa a BUSINESS per 1000 clienti!',
    analytics_advanced: '🔒 Analytics avanzati disponibili con BUSINESS. Scopri fatturato/km, clienti vicini e molto altro!',
    driving_mode: '🔒 Modalità Guida disponibile con BUSINESS. Parla con REPING mentre guidi!',
    detailed_reports: '🔒 Report dettagliati disponibili con BUSINESS. Analisi per cliente, prodotto e periodo!',
    history: '🔒 Storico oltre 90 giorni disponibile con BUSINESS. Accedi a tutto il tuo storico!',
  };
  return messages[feature] || '🔒 Funzionalità disponibile con BUSINESS (€99/mese).';
}

