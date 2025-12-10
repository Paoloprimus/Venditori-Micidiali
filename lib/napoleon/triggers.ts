/**
 * ============================================================================
 * 💡 NAPOLEONE v2.0 - Triggers (Generatori di Azioni)
 * ============================================================================
 * Ogni trigger analizza i dati e genera AZIONI CONCRETE con cliente target
 * ============================================================================
 */

import { supabase } from '@/lib/supabase/client';
import type { 
  NewSuggestion, 
  NapoleonContext, 
  TriggerConfig,
  CryptoLike
} from './types';
import { DEFAULT_TRIGGER_CONFIG } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Genera testo azione (stile assertivo)
// ═══════════════════════════════════════════════════════════════════════════

type ActionVerb = 'chiama' | 'proponi' | 'consolida' | 'richiama' | 'recupera';

const ACTION_TEMPLATES: Record<ActionVerb, (name: string) => string> = {
  chiama: (name) => `Chiama ${name}`,
  proponi: (name) => `Proponi un upgrade a ${name}`,
  consolida: (name) => `Consolida ${name}`,
  richiama: (name) => `Richiama ${name}`,
  recupera: (name) => `Recupera ${name}`,
};

function formatActionText(verb: ActionVerb, clientName: string): string {
  return ACTION_TEMPLATES[verb](clientName);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Converte hex-string in base64 (come nella pagina clienti)
// ═══════════════════════════════════════════════════════════════════════════

function hexToBase64(hexStr: unknown): string {
  if (!hexStr || typeof hexStr !== 'string') return '';
  if (!hexStr.startsWith('\\x')) return hexStr;
  const hex = hexStr.slice(2);
  const bytes = hex.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
  return bytes;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Decripta nome cliente (stesso approccio della scheda cliente)
// ═══════════════════════════════════════════════════════════════════════════

async function decryptClientName(
  clientId: string,
  crypto: CryptoLike
): Promise<string> {
  try {
    // Carica tutti i campi del cliente
    const { data: acc } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', clientId)
      .single();

    if (!acc) return `Cliente #${clientId.slice(0, 6)}`;

    // Prepara record per decriptazione (converti hex in base64)
    const recordForDecrypt = {
      name_enc: hexToBase64(acc.name_enc),
      name_iv: hexToBase64(acc.name_iv),
    };

    // Assicurati che le chiavi dello scope siano disponibili
    if (typeof (crypto as any).getOrCreateScopeKeys === 'function') {
      await (crypto as any).getOrCreateScopeKeys('table:accounts');
    }

    // Decripta (se disponibile)
    if (crypto.decryptFields) {
      const dec = await crypto.decryptFields(
        "table:accounts", 
        "accounts", 
        acc.id, 
        recordForDecrypt as Record<string, unknown>, 
        ["name"]
      );
      
      if (dec?.name && typeof dec.name === 'string') return dec.name;
    }

    // Fallback su city se disponibile
    if (acc.city) return acc.city;

    return `Cliente #${clientId.slice(0, 6)}`;
  } catch (e) {
    console.error('[Napoleon] Errore decriptazione nome:', e);
    return `Cliente #${clientId.slice(0, 6)}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER 1: Clienti a rischio churn → "Chiama [Nome]"
// ═══════════════════════════════════════════════════════════════════════════

export async function triggerChurnRisk(
  ctx: NapoleonContext,
  config: TriggerConfig = DEFAULT_TRIGGER_CONFIG
): Promise<NewSuggestion[]> {
  const suggestions: NewSuggestion[] = [];
  
  try {
    const cutoffDate = new Date(ctx.today);
    cutoffDate.setDate(cutoffDate.getDate() - config.churnDaysThreshold);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Trova clienti che hanno comprato in passato
    const { data: pastBuyers } = await supabase
      .from('visits')
      .select('account_id, data_visita, importo_vendita')
      .eq('user_id', ctx.userId)
      .gt('importo_vendita', 0)
      .order('data_visita', { ascending: false });

    if (!pastBuyers || pastBuyers.length === 0) return suggestions;

    // Raggruppa per cliente: ultima visita e totale speso
    const clientStats = new Map<string, { lastVisit: string; totalSpent: number; visitCount: number }>();
    
    for (const v of pastBuyers) {
      const existing = clientStats.get(v.account_id);
      if (!existing) {
        clientStats.set(v.account_id, {
          lastVisit: v.data_visita,
          totalSpent: v.importo_vendita || 0,
          visitCount: 1
        });
      } else {
        existing.totalSpent += v.importo_vendita || 0;
        existing.visitCount++;
      }
    }

    // Trova clienti con ultima visita prima del cutoff E che compravano regolarmente
    const atRiskClients: Array<{ id: string; lastVisit: string; avgOrder: number; daysSince: number }> = [];
    
    for (const [clientId, stats] of clientStats) {
      if (stats.lastVisit < cutoffStr && stats.visitCount >= 2) {
        const daysSince = Math.floor(
          (ctx.today.getTime() - new Date(stats.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
        );
        const avgOrder = Math.round(stats.totalSpent / stats.visitCount);
        
        if (avgOrder >= 50) { // Solo clienti con ordine medio significativo
          atRiskClients.push({ id: clientId, lastVisit: stats.lastVisit, avgOrder, daysSince });
        }
      }
    }

    // Ordina per giorni di inattività (più grave prima)
    atRiskClients.sort((a, b) => b.daysSince - a.daysSince);

    // Genera suggerimenti per i top 5
    for (const client of atRiskClients.slice(0, 5)) {
      const triggerKey = `churn:${client.id}:${ctx.today.toISOString().split('T')[0]}`;
      
      if (ctx.existingTriggerKeys.has(triggerKey)) continue;

      // Decripta nome cliente
      const clientName = await decryptClientName(client.id, ctx.crypto);

      suggestions.push({
        client_id: client.id,
        client_name: clientName,
        action_type: 'chiama',
        action_text: formatActionText('chiama', clientName),
        reason: `Non ordina da ${client.daysSince} giorni. Media ordini: €${client.avgOrder}.`,
        context_data: { daysSince: client.daysSince, avgOrder: client.avgOrder },
        priority: client.daysSince > 30 ? 'urgente' : 'importante',
        trigger_key: triggerKey,
      });
    }
  } catch (e) {
    console.error('[Napoleon:churn]', e);
  }

  return suggestions;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER 2: Clienti in crescita → "Proponi upgrade a [Nome]"
// ═══════════════════════════════════════════════════════════════════════════

export async function triggerGrowthOpportunity(
  ctx: NapoleonContext,
  config: TriggerConfig = DEFAULT_TRIGGER_CONFIG
): Promise<NewSuggestion[]> {
  const suggestions: NewSuggestion[] = [];
  
  try {
    const oneMonthAgo = new Date(ctx.today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const twoMonthsAgo = new Date(ctx.today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const { data: recentVisits } = await supabase
      .from('visits')
      .select('account_id, data_visita, importo_vendita')
      .eq('user_id', ctx.userId)
      .gte('data_visita', twoMonthsAgo.toISOString().split('T')[0])
      .gt('importo_vendita', 0);

    if (!recentVisits || recentVisits.length === 0) return suggestions;

    // Calcola vendite per cliente: ultimo mese vs mese precedente
    const clientGrowth = new Map<string, { thisMonth: number; lastMonth: number }>();
    
    for (const v of recentVisits) {
      const visitDate = new Date(v.data_visita);
      const isThisMonth = visitDate >= oneMonthAgo;
      
      const existing = clientGrowth.get(v.account_id) || { thisMonth: 0, lastMonth: 0 };
      if (isThisMonth) {
        existing.thisMonth += v.importo_vendita || 0;
      } else {
        existing.lastMonth += v.importo_vendita || 0;
      }
      clientGrowth.set(v.account_id, existing);
    }

    // Trova clienti con crescita significativa
    const growingClients: Array<{ id: string; growth: number; thisMonth: number }> = [];
    
    for (const [clientId, data] of clientGrowth) {
      if (data.lastMonth > 100) { // Aveva già un minimo di attività
        const growth = ((data.thisMonth - data.lastMonth) / data.lastMonth) * 100;
        if (growth >= config.revenueGrowthThreshold) {
          growingClients.push({ id: clientId, growth, thisMonth: data.thisMonth });
        }
      }
    }

    growingClients.sort((a, b) => b.growth - a.growth);

    for (const client of growingClients.slice(0, 3)) {
      const triggerKey = `growth:${client.id}:${ctx.today.toISOString().split('T')[0]}`;
      
      if (ctx.existingTriggerKeys.has(triggerKey)) continue;

      // Decripta nome cliente
      const clientName = await decryptClientName(client.id, ctx.crypto);

      suggestions.push({
        client_id: client.id,
        client_name: clientName,
        action_type: 'proponi',
        action_text: formatActionText('proponi', clientName),
        reason: `+${Math.round(client.growth)}% questo mese (€${client.thisMonth}). Pronto per prodotti premium!`,
        context_data: { growth: client.growth, thisMonth: client.thisMonth },
        priority: 'importante',
        trigger_key: triggerKey,
      });
    }
  } catch (e) {
    console.error('[Napoleon:growth]', e);
  }

  return suggestions;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER 3: Nuovi clienti da consolidare → "Consolida [Nome]"
// ═══════════════════════════════════════════════════════════════════════════

export async function triggerNewClients(
  ctx: NapoleonContext,
  config: TriggerConfig = DEFAULT_TRIGGER_CONFIG
): Promise<NewSuggestion[]> {
  const suggestions: NewSuggestion[] = [];
  
  try {
    const newClientCutoff = new Date(ctx.today);
    newClientCutoff.setDate(newClientCutoff.getDate() - config.newClientDaysThreshold);

    // Clienti creati di recente
    const { data: newClients } = await supabase
      .from('accounts')
      .select('id, city, created_at')
      .eq('user_id', ctx.userId)
      .gte('created_at', newClientCutoff.toISOString());

    if (!newClients || newClients.length === 0) return suggestions;

    // Per ogni nuovo cliente, verifica se ha già ordinato
    for (const client of newClients.slice(0, 3)) {
      const triggerKey = `newclient:${client.id}:${ctx.today.toISOString().split('T')[0]}`;
      
      if (ctx.existingTriggerKeys.has(triggerKey)) continue;

      const { count: visitCount } = await supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', client.id);

      const daysSinceCreated = Math.floor(
        (ctx.today.getTime() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Decripta nome cliente
      const clientName = await decryptClientName(client.id, ctx.crypto);

      if ((visitCount ?? 0) <= 1) {
        suggestions.push({
          client_id: client.id,
          client_name: clientName,
          action_type: 'consolida',
          action_text: formatActionText('consolida', clientName),
          reason: `Nuovo da ${daysSinceCreated} giorni, solo ${visitCount ?? 0} visite. Fissa l'abitudine!`,
          context_data: { daysSinceCreated, visitCount },
          priority: daysSinceCreated > 14 ? 'importante' : 'utile',
          trigger_key: triggerKey,
        });
      }
    }
  } catch (e) {
    console.error('[Napoleon:newClients]', e);
  }

  return suggestions;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER 4: Callback da note → "Richiama [Nome]"
// ═══════════════════════════════════════════════════════════════════════════

export async function triggerCallbacks(
  ctx: NapoleonContext,
  config: TriggerConfig = DEFAULT_TRIGGER_CONFIG
): Promise<NewSuggestion[]> {
  const suggestions: NewSuggestion[] = [];
  
  try {
    const checkDate = new Date(ctx.today);
    checkDate.setDate(checkDate.getDate() - config.callbackCheckDays);

    // Cerca nelle note parole chiave di richiamo
    const { data: notes } = await supabase
      .from('notes')
      .select('id, account_id, body, created_at')
      .gte('created_at', checkDate.toISOString());

    if (!notes || notes.length === 0) return suggestions;

    const callbackKeywords = ['richiama', 'callback', 'richiamare', 'risentire', 'ricontatta', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'prossima settimana'];

    for (const note of notes) {
      const bodyLower = (note.body || '').toLowerCase();
      const hasCallback = callbackKeywords.some(kw => bodyLower.includes(kw));
      
      if (hasCallback && note.account_id) {
        const triggerKey = `callback:${note.account_id}:${note.id}`;
        
        if (ctx.existingTriggerKeys.has(triggerKey)) continue;

        const daysSinceNote = Math.floor(
          (ctx.today.getTime() - new Date(note.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Solo se la nota è vecchia abbastanza (callback probabilmente scaduto)
        if (daysSinceNote >= 3) {
          // Decripta nome cliente
          const clientName = await decryptClientName(note.account_id, ctx.crypto);

          suggestions.push({
            client_id: note.account_id,
            client_name: clientName,
            action_type: 'chiama',
            action_text: formatActionText('richiama', clientName),
            reason: `Nota di ${daysSinceNote} giorni fa menziona un richiamo.`,
            context_data: { noteExcerpt: note.body?.slice(0, 50), daysSinceNote },
            priority: daysSinceNote > 7 ? 'urgente' : 'importante',
            trigger_key: triggerKey,
          });
        }
      }
    }
  } catch (e) {
    console.error('[Napoleon:callbacks]', e);
  }

  return suggestions.slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER 5: Clienti con calo vendite → "Recupera [Nome]"
// ═══════════════════════════════════════════════════════════════════════════

export async function triggerRevenueDrop(
  ctx: NapoleonContext,
  config: TriggerConfig = DEFAULT_TRIGGER_CONFIG
): Promise<NewSuggestion[]> {
  const suggestions: NewSuggestion[] = [];
  
  try {
    const oneMonthAgo = new Date(ctx.today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const twoMonthsAgo = new Date(ctx.today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const threeMonthsAgo = new Date(ctx.today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: visits } = await supabase
      .from('visits')
      .select('account_id, data_visita, importo_vendita')
      .eq('user_id', ctx.userId)
      .gte('data_visita', threeMonthsAgo.toISOString().split('T')[0])
      .gt('importo_vendita', 0);

    if (!visits || visits.length === 0) return suggestions;

    // Calcola vendite per cliente: ultimo mese vs media precedente
    const clientRevenue = new Map<string, { thisMonth: number; previousAvg: number }>();
    
    for (const v of visits) {
      const visitDate = new Date(v.data_visita);
      const isThisMonth = visitDate >= oneMonthAgo;
      
      const existing = clientRevenue.get(v.account_id) || { thisMonth: 0, previousAvg: 0 };
      if (isThisMonth) {
        existing.thisMonth += v.importo_vendita || 0;
      } else {
        existing.previousAvg += (v.importo_vendita || 0) / 2; // Media su 2 mesi
      }
      clientRevenue.set(v.account_id, existing);
    }

    // Trova clienti con calo significativo
    const droppingClients: Array<{ id: string; drop: number; previousAvg: number }> = [];
    
    for (const [clientId, data] of clientRevenue) {
      if (data.previousAvg > 100) { // Aveva attività significativa
        const drop = ((data.previousAvg - data.thisMonth) / data.previousAvg) * 100;
        if (drop >= config.revenueDropThreshold) {
          droppingClients.push({ id: clientId, drop, previousAvg: data.previousAvg });
        }
      }
    }

    droppingClients.sort((a, b) => b.drop - a.drop);

    for (const client of droppingClients.slice(0, 3)) {
      const triggerKey = `drop:${client.id}:${ctx.today.toISOString().split('T')[0]}`;
      
      if (ctx.existingTriggerKeys.has(triggerKey)) continue;

      // Decripta nome cliente
      const clientName = await decryptClientName(client.id, ctx.crypto);

      suggestions.push({
        client_id: client.id,
        client_name: clientName,
        action_type: 'recupera',
        action_text: formatActionText('recupera', clientName),
        reason: `Vendite in calo del ${Math.round(client.drop)}%. Prima media: €${Math.round(client.previousAvg)}/mese.`,
        context_data: { drop: client.drop, previousAvg: client.previousAvg },
        priority: client.drop > 50 ? 'urgente' : 'importante',
        trigger_key: triggerKey,
      });
    }
  } catch (e) {
    console.error('[Napoleon:drop]', e);
  }

  return suggestions;
}
