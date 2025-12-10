/**
 * ============================================================================
 * 📊 RIEPILOGO SETTIMANALE - Calcolo Stats
 * ============================================================================
 */

import { supabase } from '@/lib/supabase/client';
import type { WeeklySummary, WeeklyStats, FeedbackScore } from './types';

/**
 * Calcola il lunedì della settimana corrente
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunedì
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calcola la domenica della settimana
 */
export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Formatta data come YYYY-MM-DD
 */
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Calcola le statistiche della settimana corrente
 */
export async function calculateWeeklyStats(userId: string): Promise<WeeklyStats> {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);
  const weekStartStr = formatDate(weekStart);
  const weekEndStr = formatDate(weekEnd);

  // Query parallele per efficienza
  const [
    messagesResult,
    visitsResult,
    suggestionsResult,
  ] = await Promise.all([
    // Messaggi inviati questa settimana
    supabase
      .from('messages')
      .select('id, created_at', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString()),

    // Visite registrate questa settimana
    supabase
      .from('visits')
      .select('id, data_visita', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('data_visita', weekStartStr)
      .lte('data_visita', weekEndStr),

    // Suggerimenti Napoleone completati questa settimana
    supabase
      .from('napoleon_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completato')
      .gte('completed_at', weekStart.toISOString())
      .lte('completed_at', weekEnd.toISOString()),
  ]);

  // Calcola giorni attivi (giorni con almeno un messaggio o visita)
  const daysActiveResult = await supabase
    .from('messages')
    .select('created_at')
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', weekStart.toISOString())
    .lte('created_at', weekEnd.toISOString());

  const activeDays = new Set<string>();
  (daysActiveResult.data ?? []).forEach(m => {
    activeDays.add(new Date(m.created_at).toDateString());
  });

  const messagesSent = messagesResult.count ?? 0;
  const clientsVisited = visitsResult.count ?? 0;
  const suggestionsCompleted = suggestionsResult.count ?? 0;
  const daysActive = activeDays.size;

  // Per ora routes_planned = 0 (da implementare se serve)
  const routesPlanned = 0;

  return {
    weekStart,
    weekEnd,
    daysActive,
    messagesSent,
    routesPlanned,
    suggestionsCompleted,
    clientsVisited,
    hasData: daysActive > 0 || messagesSent > 0 || clientsVisited > 0 || suggestionsCompleted > 0,
  };
}

/**
 * Recupera o crea il riepilogo per la settimana corrente
 */
export async function getOrCreateWeeklySummary(userId: string): Promise<WeeklySummary | null> {
  const weekStart = getWeekStart();
  const weekStartStr = formatDate(weekStart);

  // Prova a recuperare esistente
  const { data: existing } = await supabase
    .from('weekly_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStartStr)
    .single();

  if (existing) {
    return existing as WeeklySummary;
  }

  // Calcola stats e crea nuovo record
  const stats = await calculateWeeklyStats(userId);

  const { data: created, error } = await supabase
    .from('weekly_summaries')
    .insert({
      user_id: userId,
      week_start: weekStartStr,
      days_active: stats.daysActive,
      messages_sent: stats.messagesSent,
      routes_planned: stats.routesPlanned,
      suggestions_completed: stats.suggestionsCompleted,
      clients_visited: stats.clientsVisited,
    })
    .select()
    .single();

  if (error) {
    console.error('[Weekly] Error creating summary:', error);
    return null;
  }

  return created as WeeklySummary;
}

/**
 * Aggiorna le stats del riepilogo corrente
 */
export async function updateWeeklyStats(userId: string): Promise<void> {
  const weekStart = getWeekStart();
  const weekStartStr = formatDate(weekStart);
  const stats = await calculateWeeklyStats(userId);

  await supabase
    .from('weekly_summaries')
    .upsert({
      user_id: userId,
      week_start: weekStartStr,
      days_active: stats.daysActive,
      messages_sent: stats.messagesSent,
      routes_planned: stats.routesPlanned,
      suggestions_completed: stats.suggestionsCompleted,
      clients_visited: stats.clientsVisited,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' });
}

/**
 * Salva il feedback dell'utente
 */
export async function saveWeeklyFeedback(
  userId: string,
  score: FeedbackScore,
  note?: string
): Promise<boolean> {
  const weekStart = getWeekStart();
  const weekStartStr = formatDate(weekStart);

  const { error } = await supabase
    .from('weekly_summaries')
    .upsert({
      user_id: userId,
      week_start: weekStartStr,
      feedback_score: score,
      feedback_note: note || null,
      feedback_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' });

  if (error) {
    console.error('[Weekly] Error saving feedback:', error);
    return false;
  }

  return true;
}

/**
 * Controlla se è sabato (giorno del riepilogo)
 */
export function isSaturday(): boolean {
  return new Date().getDay() === 6;
}

/**
 * Controlla se l'utente ha già dato feedback questa settimana
 */
export async function hasFeedbackThisWeek(userId: string): Promise<boolean> {
  const weekStart = getWeekStart();
  const weekStartStr = formatDate(weekStart);

  const { data } = await supabase
    .from('weekly_summaries')
    .select('feedback_score, dismissed')
    .eq('user_id', userId)
    .eq('week_start', weekStartStr)
    .single();

  return data?.feedback_score !== null || data?.dismissed === true;
}

