// tests/auto-debug/seeder.ts
// Data seeder: crea dati di test se mancano

import { createClient } from '@supabase/supabase-js';

export interface SeederResult {
  entity: string;
  action: 'created' | 'exists' | 'error';
  count: number;
  message: string;
}

export interface SeederReport {
  timestamp: string;
  results: SeederResult[];
  success: boolean;
}

// Dati di test predefiniti
const TEST_CLIENTS = [
  { name: 'Bar Test Milano', city: 'Milano', tipo_locale: 'bar', notes: 'Cliente test per debug automatico' },
  { name: 'Ristorante Demo Roma', city: 'Roma', tipo_locale: 'ristorante', notes: 'Ristorante di test' },
  { name: 'Pizzeria Sample Napoli', city: 'Napoli', tipo_locale: 'pizzeria', notes: 'Pizzeria campione' },
  { name: 'Pub Example Torino', city: 'Torino', tipo_locale: 'pub', notes: 'Pub di esempio' },
  { name: 'Caffè Debug Firenze', city: 'Firenze', tipo_locale: 'caffetteria', notes: 'Caffetteria per test' },
];

/**
 * Verifica se esistono già dati di test per l'utente
 */
async function checkExistingData(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ clients: number; visits: number; reminders: number }> {
  const [clientsRes, visitsRes, remindersRes] = await Promise.all([
    supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('visits').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('reminders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  return {
    clients: clientsRes.count || 0,
    visits: visitsRes.count || 0,
    reminders: remindersRes.count || 0,
  };
}

/**
 * Crea clienti di test
 */
async function seedClients(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  existingCount: number
): Promise<SeederResult> {
  if (existingCount >= 5) {
    return {
      entity: 'Clienti',
      action: 'exists',
      count: existingCount,
      message: `Già presenti ${existingCount} clienti`,
    };
  }

  try {
    const clientsToCreate = TEST_CLIENTS.slice(0, 5 - existingCount).map(c => ({
      ...c,
      user_id: userId,
    }));

    const { data, error } = await supabase
      .from('accounts')
      .insert(clientsToCreate as any)
      .select('id');

    if (error) throw error;

    return {
      entity: 'Clienti',
      action: 'created',
      count: data?.length || 0,
      message: `Creati ${data?.length || 0} clienti di test`,
    };
  } catch (e: any) {
    return {
      entity: 'Clienti',
      action: 'error',
      count: 0,
      message: `Errore: ${e.message}`,
    };
  }
}

/**
 * Crea visite di test
 */
async function seedVisits(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  existingCount: number
): Promise<SeederResult> {
  if (existingCount >= 10) {
    return {
      entity: 'Visite',
      action: 'exists',
      count: existingCount,
      message: `Già presenti ${existingCount} visite`,
    };
  }

  try {
    // Ottieni alcuni clienti dell'utente
    const { data: clientsData } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(5);

    const clients = clientsData as { id: string }[] | null;

    if (!clients || clients.length === 0) {
      return {
        entity: 'Visite',
        action: 'error',
        count: 0,
        message: 'Nessun cliente disponibile per creare visite',
      };
    }

    // Crea visite per i clienti
    const visits = clients.flatMap((client, i) => [
      {
        user_id: userId,
        account_id: client.id,
        visited_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(), // Ultimi giorni
        notes: `Visita test ${i + 1}`,
        outcome: ['positivo', 'neutro', 'negativo'][i % 3],
      },
    ]);

    const { data, error } = await supabase
      .from('visits')
      .insert(visits.slice(0, 10 - existingCount) as any)
      .select('id');

    if (error) throw error;

    return {
      entity: 'Visite',
      action: 'created',
      count: data?.length || 0,
      message: `Create ${data?.length || 0} visite di test`,
    };
  } catch (e: any) {
    return {
      entity: 'Visite',
      action: 'error',
      count: 0,
      message: `Errore: ${e.message}`,
    };
  }
}

/**
 * Crea promemoria di test
 */
async function seedReminders(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  existingCount: number
): Promise<SeederResult> {
  if (existingCount >= 5) {
    return {
      entity: 'Promemoria',
      action: 'exists',
      count: existingCount,
      message: `Già presenti ${existingCount} promemoria`,
    };
  }

  try {
    const reminders = [
      { user_id: userId, title: 'Richiamare cliente test', due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
      { user_id: userId, title: 'Preparare offerta demo', due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
      { user_id: userId, title: 'Follow-up visita', due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    const { data, error } = await supabase
      .from('reminders')
      .insert(reminders.slice(0, 5 - existingCount) as any)
      .select('id');

    if (error) throw error;

    return {
      entity: 'Promemoria',
      action: 'created',
      count: data?.length || 0,
      message: `Creati ${data?.length || 0} promemoria di test`,
    };
  } catch (e: any) {
    return {
      entity: 'Promemoria',
      action: 'error',
      count: 0,
      message: `Errore: ${e.message}`,
    };
  }
}

/**
 * Esegue il seeding dei dati di test
 */
export async function runSeeder(userId: string): Promise<SeederReport> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      timestamp: new Date().toISOString(),
      results: [{
        entity: 'Setup',
        action: 'error',
        count: 0,
        message: 'Supabase URL/Key non configurati',
      }],
      success: false,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const existing = await checkExistingData(supabase, userId);

  const results = await Promise.all([
    seedClients(supabase, userId, existing.clients),
    seedVisits(supabase, userId, existing.visits),
    seedReminders(supabase, userId, existing.reminders),
  ]);

  const hasErrors = results.some(r => r.action === 'error');

  return {
    timestamp: new Date().toISOString(),
    results,
    success: !hasErrors,
  };
}

/**
 * Stampa report seeder
 */
export function printSeederReport(report: SeederReport): void {
  console.log('\n' + '═'.repeat(70));
  console.log('  🌱 DATA SEEDER');
  console.log('═'.repeat(70) + '\n');

  for (const result of report.results) {
    const icon = result.action === 'created' ? '✅' 
      : result.action === 'exists' ? '➡️' : '❌';
    console.log(`  ${icon} ${result.entity.padEnd(15)} ${result.message}`);
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`  ${report.success ? '✅' : '❌'} Seeding: ${report.success ? 'COMPLETATO' : 'FALLITO'}`);
  console.log('─'.repeat(70) + '\n');
}
