// app/data/adapters.supabase.ts
//
// Adapter "reale" che legge da Supabase e decifra nel browser,
// usando l'istanza di crypto esposta da useCrypto().
//
// NOTE IMPORTANTI:
// - Legge da `accounts` (clienti) come da handoff pack.
// - Usa fallback: se alcuni record storici hanno `name` in chiaro, li usa così com'è.
// - Per le email: solo cifrate (email_enc/email_iv), non esiste colonna email plain.
// - Le funzioni accettano `crypto` come argomento (passalo da useCrypto()).
//
// RIFERIMENTI: handoff 19/10 su cifratura e SELECT compatibile. 
// (name_enc/name_iv/email_enc/email_iv + eventuale plain name) 
// 

import { supabase } from "../../lib/supabase/client";
import { getDistancesToMany, getMultiStopRoute, haversineDistance } from "../../lib/routing";

// Tipi delle righe che selezioniamo (minimi e tolleranti)
type AccountRow = {
  id: string;
  name?: string | null;
  name_enc?: string | null;
  name_iv?: string | null;
  email_enc?: string | null;
  email_iv?: string | null;
  created_at?: string | null;
};

type ProductRow = {
  id: string;
  name?: string | null;
  name_enc?: string | null;
  name_iv?: string | null;
  available?: boolean | null;
};

// 🆕 Tipo esportato per il risultato di listClientNames
export type ClientNamesResult = {
  names: string[];
  withoutName: number;
};


// Tipizzazione "soft" per l'oggetto crypto: evitiamo di vincolarci al file reale.
// Deve esporre: decryptFields(scope, table, recordId, rowOrMap, fieldNames?)
type CryptoLike = {
  decryptFields: (
    scope: string,
    table: string,
    recordId: string,
    rowOrMap: any,
    fieldNames?: string[]
  ) => Promise<any>;
};

function assertCrypto(crypto: CryptoLike | null | undefined) {
  if (!crypto) throw new Error("Crypto non disponibile: assicurati che useCrypto().ready sia true e passa crypto all'adapter.");
}

// ───────────────────────────────────────────────────────────────
// CLIENTI (accounts)
// ───────────────────────────────────────────────────────────────

export async function countClients(): Promise<number> {
  const { count, error } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/**
 * lista nomi clienti decifrati (o plain se presente).
 * @param crypto istanza da useCrypto().crypto
 * @returns oggetto con nomi e conteggio clienti senza nome
 */
export async function listClientNames(crypto: CryptoLike): Promise<ClientNamesResult> {
  assertCrypto(crypto);

  const { data, error } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as AccountRow[];

  const names: string[] = [];
  let withoutName = 0;

  for (const row of rows) {
    if (row.name) {
      names.push(row.name);
      continue;
    }
    try {
      const dec = await crypto.decryptFields("table:accounts", "accounts", row.id, row, ["name"]);
      if (dec?.name) {
        names.push(dec.name);
      } else {
        withoutName++;
      }
    } catch {
      // record non decifrabile o senza nome
      withoutName++;
    }
  }
  return { names, withoutName };
}


/**
 * lista email clienti decifrate.
 * NOTA: la colonna email plain NON esiste, solo email_enc/email_iv.
 * @param crypto istanza da useCrypto().crypto
 */
export async function listClientEmails(crypto: CryptoLike): Promise<string[]> {
  assertCrypto(crypto);

  const { data, error } = await supabase
    .from("accounts")
    .select("id,email_enc,email_iv,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as AccountRow[];

  const emails: string[] = [];
  for (const row of rows) {
    try {
      const dec = await crypto.decryptFields("table:accounts", "accounts", row.id, row, ["email"]);
      if (dec?.email) emails.push(dec.email);
    } catch {
      // ignora record non decifrabili
    }
  }
  return emails;
}

// ───────────────────────────────────────────────────────────────
// 🆕 QUERY COMPOSITE - Filtri multipli combinati
// ───────────────────────────────────────────────────────────────

export type CompositeFilters = {
  city?: string;
  localeType?: string;
  productBought?: string;
  minAmount?: number;
  maxAmount?: number;
  notVisitedDays?: number;
  hasOrdered?: boolean;
  period?: 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month' | 'quarter' | 'year';
};

export type CompositeQueryResult = {
  clients: Array<{
    id: string;
    name: string;
    city?: string;
    localeType?: string;
    lastVisit?: string;
    totalSales?: number;
  }>;
  filtersApplied: string[];
  totalCount: number;
  message: string;
};

/**
 * Query composita con filtri multipli
 * Es: "clienti di Verona che hanno comprato vino il mese scorso"
 */
export async function queryClientsWithFilters(
  crypto: CryptoLike,
  filters: CompositeFilters
): Promise<CompositeQueryResult> {
  assertCrypto(crypto);

  const filtersApplied: string[] = [];

  // 1. Query base clienti
  let query = supabase
    .from("accounts")
    .select("id, name, name_enc, name_iv, city, tipo_locale");

  // 2. Applica filtro CITTÀ
  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
    filtersApplied.push(`📍 ${filters.city}`);
  }

  // 3. Applica filtro TIPO LOCALE
  if (filters.localeType) {
    query = query.ilike("tipo_locale", `%${filters.localeType}%`);
    filtersApplied.push(`🏪 ${filters.localeType}`);
  }

  const { data: accounts, error: accError } = await query;
  if (accError) throw accError;

  if (!accounts?.length) {
    return {
      clients: [],
      filtersApplied,
      totalCount: 0,
      message: `Nessun cliente trovato con questi filtri: ${filtersApplied.join(', ') || 'nessuno'}`
    };
  }

  // 4. Decifra nomi
  const clientsWithNames: Array<{ id: string; name: string; city?: string; localeType?: string }> = [];
  
  for (const acc of accounts) {
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    if (name) {
      clientsWithNames.push({
        id: acc.id,
        name,
        city: acc.city ?? undefined,
        localeType: acc.tipo_locale ?? undefined
      });
    }
  }

  // 5. Filtri che richiedono query aggiuntive (visite/vendite)
  let filteredClients = clientsWithNames;

  // 5a. Filtro PRODOTTO ACQUISTATO
  if (filters.productBought) {
    // Cerca nelle visite con prodotti_discussi
    const { data: visits } = await supabase
      .from("visits")
      .select("account_id, prodotti_discussi, importo_vendita")
      .ilike("prodotti_discussi", `%${filters.productBought}%`);

    const accountsWithProduct = new Set((visits ?? []).map(v => v.account_id));
    filteredClients = filteredClients.filter(c => accountsWithProduct.has(c.id));
    filtersApplied.push(`🛒 ${filters.productBought}`);
  }

  // 5b. Filtro IMPORTO MINIMO/MASSIMO
  if (filters.minAmount || filters.maxAmount) {
    let visitQuery = supabase
      .from("visits")
      .select("account_id, importo_vendita")
      .not("importo_vendita", "is", null);

    if (filters.minAmount) {
      visitQuery = visitQuery.gte("importo_vendita", filters.minAmount);
      filtersApplied.push(`💰 >${filters.minAmount}€`);
    }
    if (filters.maxAmount) {
      visitQuery = visitQuery.lte("importo_vendita", filters.maxAmount);
      filtersApplied.push(`💰 <${filters.maxAmount}€`);
    }

    const { data: visits } = await visitQuery;
    const accountsWithAmount = new Set((visits ?? []).map(v => v.account_id));
    filteredClients = filteredClients.filter(c => accountsWithAmount.has(c.id));
  }

  // 5c. Filtro NON VISITATO DA X GIORNI
  if (filters.notVisitedDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filters.notVisitedDays);

    // Trova clienti con ultima visita prima del cutoff O senza visite
    const { data: recentVisits } = await supabase
      .from("visits")
      .select("account_id, data_visita")
      .gte("data_visita", cutoffDate.toISOString().split('T')[0]);

    const recentlyVisited = new Set((recentVisits ?? []).map(v => v.account_id));
    filteredClients = filteredClients.filter(c => !recentlyVisited.has(c.id));
    
    const days = filters.notVisitedDays;
    const label = days >= 30 ? `${Math.round(days / 30)} mesi` : `${days} giorni`;
    filtersApplied.push(`📅 non visti da ${label}`);
  }

  // 5d. Filtro PERIODO
  if (filters.period) {
    const now = new Date();
    let fromDate: Date;
    let periodLabel: string;

    switch (filters.period) {
      case 'today':
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodLabel = 'oggi';
        break;
      case 'yesterday':
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        periodLabel = 'ieri';
        break;
      case 'week':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        periodLabel = 'questa settimana';
        break;
      case 'last_week':
        fromDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        periodLabel = 'settimana scorsa';
        break;
      case 'month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'questo mese';
        break;
      case 'last_month':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        periodLabel = 'mese scorso';
        break;
      default:
        fromDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = "quest'anno";
    }

    const { data: periodVisits } = await supabase
      .from("visits")
      .select("account_id")
      .gte("data_visita", fromDate.toISOString().split('T')[0]);

    const visitedInPeriod = new Set((periodVisits ?? []).map(v => v.account_id));
    filteredClients = filteredClients.filter(c => visitedInPeriod.has(c.id));
    filtersApplied.push(`📆 ${periodLabel}`);
  }

  // 5e. Filtro HA EFFETTUATO ORDINI
  if (filters.hasOrdered !== undefined) {
    const { data: orders } = await supabase
      .from("visits")
      .select("account_id")
      .gt("importo_vendita", 0);

    const withOrders = new Set((orders ?? []).map(v => v.account_id));
    
    if (filters.hasOrdered) {
      filteredClients = filteredClients.filter(c => withOrders.has(c.id));
      filtersApplied.push(`✅ con ordini`);
    } else {
      filteredClients = filteredClients.filter(c => !withOrders.has(c.id));
      filtersApplied.push(`❌ senza ordini`);
    }
  }

  // 6. Formatta risultato
  const count = filteredClients.length;
  
  if (count === 0) {
    return {
      clients: [],
      filtersApplied,
      totalCount: 0,
      message: `Nessun cliente trovato con questi filtri:\n${filtersApplied.map(f => `• ${f}`).join('\n')}`
    };
  }

  const top10 = filteredClients.slice(0, 10);
  const lines = top10.map((c, i) => {
    let line = `${i + 1}. **${c.name}**`;
    if (c.city) line += ` (${c.city})`;
    if (c.localeType) line += ` - ${c.localeType}`;
    return line;
  }).join('\n');

  const message = `📋 **${count} clienti** trovati:\n\n` +
    `**Filtri:** ${filtersApplied.join(' | ')}\n\n` +
    `${lines}` +
    (count > 10 ? `\n\n...e altri ${count - 10}` : '');

  return {
    clients: filteredClients,
    filtersApplied,
    totalCount: count,
    message
  };
}


// ───────────────────────────────────────────────────────────────
// PRODOTTI (best effort)
// ───────────────────────────────────────────────────────────────
//
// Non hai ancora un riferimento confermato per la tabella prodotti nell'handoff.
// Implemento una lettura "tollerante":
// - prova a leggere da `products` colonne: id, name (o name_enc/name_iv), available (boolean).
// - se la tabella o la colonna non esistono, restituisce [] senza rompere l'app.

export async function listMissingProducts(crypto: CryptoLike): Promise<string[]> {
  // Prova SELECT; se fallisce (tabella/colonne diverse), torna [].
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,name_enc,name_iv,available");
    if (error || !data) return [];

    const out: string[] = [];
    for (const row of data) {
      // se manca available, considera non-mancante
      if (typeof row.available !== "boolean") continue;
      if (row.available === true) continue;

      if (row.name) {
        out.push(row.name);
        continue;
      }
      if ((row as any).name_enc) {
        try {
          const dec = await crypto.decryptFields("table:products", "products", row.id, row, ["name"]);
          if (dec?.name) out.push(dec.name);
        } catch { /* ignora */ }
      }
    }
    return out;
  } catch {
    return [];
  }
}

// ───────────────────────────────────────────────────────────────
// VISITE
// ───────────────────────────────────────────────────────────────

type VisitRow = {
  id: string;
  account_id: string;
  tipo: string;
  data_visita: string;
  esito: string | null;
  importo_vendita: number | null;
  prodotti_discussi: string | null;
  created_at: string;
};

type VisitWithClient = VisitRow & {
  clientName?: string;
};

/**
 * Conta le visite in un periodo
 */
export async function countVisits(period?: 'today' | 'week' | 'month' | 'year'): Promise<number> {
  let query = supabase
    .from("visits")
    .select("id", { count: "exact", head: true });

  if (period) {
    const now = new Date();
    let fromDate: Date;
    switch (period) {
      case 'today':
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        fromDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Visite di oggi con dettagli
 */
export async function getVisitsToday(crypto: CryptoLike): Promise<VisitWithClient[]> {
  assertCrypto(crypto);
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data: visits, error: visitError } = await supabase
    .from("visits")
    .select("*")
    .eq("data_visita", today)
    .order("created_at", { ascending: false });

  if (visitError) throw visitError;
  if (!visits?.length) return [];

  // Carica nomi clienti
  const accountIds = [...new Set(visits.map(v => v.account_id))];
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv")
    .in("id", accountIds);

  const accountMap = new Map<string, string>();
  for (const acc of (accounts ?? [])) {
    if (acc.name) {
      accountMap.set(acc.id, acc.name);
    } else if (acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        if (dec?.name) accountMap.set(acc.id, dec.name);
      } catch { /* ignora */ }
    }
  }

  return visits.map(v => ({
    ...v,
    clientName: accountMap.get(v.account_id) ?? "Cliente sconosciuto"
  }));
}

/**
 * Ultima visita a un cliente (ricerca per nome)
 */
export async function getLastVisitToClient(crypto: CryptoLike, clientNameHint: string): Promise<{
  found: boolean;
  clientName?: string;
  visit?: VisitRow;
  message: string;
}> {
  assertCrypto(crypto);

  // 1. Cerca il cliente per nome
  const { data: accounts, error: accError } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv");

  if (accError) throw accError;

  const searchLower = clientNameHint.toLowerCase();
  let matchedAccount: { id: string; name: string } | null = null;

  for (const acc of (accounts ?? [])) {
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    if (name && name.toLowerCase().includes(searchLower)) {
      matchedAccount = { id: acc.id, name };
      break;
    }
  }

  if (!matchedAccount) {
    return { found: false, message: `Non ho trovato nessun cliente con "${clientNameHint}".` };
  }

  // 2. Cerca l'ultima visita
  const { data: visits, error: visitError } = await supabase
    .from("visits")
    .select("*")
    .eq("account_id", matchedAccount.id)
    .order("data_visita", { ascending: false })
    .limit(1);

  if (visitError) throw visitError;

  if (!visits?.length) {
    return { 
      found: true, 
      clientName: matchedAccount.name,
      message: `Non hai ancora visitato ${matchedAccount.name}.` 
    };
  }

  const v = visits[0];
  const dataVisita = new Date(v.data_visita).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  
  let msg = `L'ultima visita a ${matchedAccount.name} è stata ${dataVisita}`;
  if (v.esito) msg += `, esito: ${v.esito}`;
  if (v.importo_vendita) msg += `, venduto: €${v.importo_vendita}`;
  msg += '.';

  return { found: true, clientName: matchedAccount.name, visit: v, message: msg };
}

/**
 * Storico visite a un cliente
 */
export async function getVisitHistoryForClient(crypto: CryptoLike, clientNameHint: string): Promise<{
  found: boolean;
  clientName?: string;
  visits: VisitRow[];
  message: string;
}> {
  assertCrypto(crypto);

  // Cerca cliente
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv");

  const searchLower = clientNameHint.toLowerCase();
  let matchedAccount: { id: string; name: string } | null = null;

  for (const acc of (accounts ?? [])) {
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    if (name && name.toLowerCase().includes(searchLower)) {
      matchedAccount = { id: acc.id, name };
      break;
    }
  }

  if (!matchedAccount) {
    return { found: false, visits: [], message: `Non ho trovato nessun cliente con "${clientNameHint}".` };
  }

  const { data: visits } = await supabase
    .from("visits")
    .select("*")
    .eq("account_id", matchedAccount.id)
    .order("data_visita", { ascending: false })
    .limit(10);

  if (!visits?.length) {
    return { 
      found: true, 
      clientName: matchedAccount.name,
      visits: [],
      message: `Non hai ancora visitato ${matchedAccount.name}.` 
    };
  }

  const lines = visits.map(v => {
    const data = new Date(v.data_visita).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    let line = `• ${data}: ${v.tipo}`;
    if (v.esito) line += ` (${v.esito})`;
    if (v.importo_vendita) line += ` - €${v.importo_vendita}`;
    return line;
  });

  return {
    found: true,
    clientName: matchedAccount.name,
    visits,
    message: `Ultime ${visits.length} attività con ${matchedAccount.name}:\n${lines.join('\n')}`
  };
}

// ───────────────────────────────────────────────────────────────
// VENDITE
// ───────────────────────────────────────────────────────────────

export type SalesSummary = {
  totalAmount: number;
  visitCount: number;
  period: string;
  message: string;
};

/**
 * Riepilogo vendite per periodo
 */
export async function getSalesSummary(period?: 'today' | 'week' | 'month' | 'year'): Promise<SalesSummary> {
  let query = supabase
    .from("visits")
    .select("importo_vendita,data_visita");

  const now = new Date();
  let fromDate: Date;
  let periodLabel: string;

  switch (period) {
    case 'today':
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      periodLabel = 'oggi';
      break;
    case 'week':
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodLabel = 'questa settimana';
      break;
    case 'year':
      fromDate = new Date(now.getFullYear(), 0, 1);
      periodLabel = "quest'anno";
      break;
    case 'month':
    default:
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = 'questo mese';
      break;
  }

  query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);

  const { data, error } = await query;
  if (error) throw error;

  const visits = data ?? [];
  const totalAmount = visits.reduce((sum, v) => sum + (v.importo_vendita ?? 0), 0);
  const visitCount = visits.filter(v => (v.importo_vendita ?? 0) > 0).length;

  const message = totalAmount > 0
    ? `Hai venduto **€${totalAmount.toLocaleString('it-IT')}** ${periodLabel} (${visitCount} ordini).`
    : `Nessuna vendita registrata ${periodLabel}.`;

  return { totalAmount, visitCount, period: periodLabel, message };
}

/**
 * Vendite per cliente specifico
 */
export async function getSalesByClient(crypto: CryptoLike, clientNameHint: string): Promise<{
  found: boolean;
  clientName?: string;
  totalAmount: number;
  visitCount: number;
  message: string;
}> {
  assertCrypto(crypto);

  // Cerca cliente
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv");

  const searchLower = clientNameHint.toLowerCase();
  let matchedAccount: { id: string; name: string } | null = null;

  for (const acc of (accounts ?? [])) {
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    if (name && name.toLowerCase().includes(searchLower)) {
      matchedAccount = { id: acc.id, name };
      break;
    }
  }

  if (!matchedAccount) {
    return { found: false, totalAmount: 0, visitCount: 0, message: `Non ho trovato nessun cliente con "${clientNameHint}".` };
  }

  const { data: visits } = await supabase
    .from("visits")
    .select("importo_vendita")
    .eq("account_id", matchedAccount.id);

  const validVisits = (visits ?? []).filter(v => (v.importo_vendita ?? 0) > 0);
  const totalAmount = validVisits.reduce((sum, v) => sum + (v.importo_vendita ?? 0), 0);

  const message = totalAmount > 0
    ? `Hai venduto **€${totalAmount.toLocaleString('it-IT')}** a ${matchedAccount.name} (${validVisits.length} ordini).`
    : `Nessuna vendita registrata per ${matchedAccount.name}.`;

  return { found: true, clientName: matchedAccount.name, totalAmount, visitCount: validVisits.length, message };
}

// ───────────────────────────────────────────────────────────────
// PLANNING / CALLBACKS
// ───────────────────────────────────────────────────────────────

export type PlanningItem = {
  type: 'callback' | 'visit_due' | 'inactive_client';
  clientId: string;
  clientName: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
};

/**
 * Clienti da richiamare (basato su note o visite con esito "da richiamare")
 */
export async function getCallbacks(crypto: CryptoLike): Promise<{
  items: PlanningItem[];
  message: string;
}> {
  assertCrypto(crypto);

  // Cerca visite con esito "richiamare" o simili
  const { data: visits } = await supabase
    .from("visits")
    .select("account_id,esito,data_visita")
    .or("esito.ilike.%richiam%,esito.ilike.%callback%,esito.ilike.%risentire%")
    .order("data_visita", { ascending: false });

  if (!visits?.length) {
    return { items: [], message: "Non hai clienti da richiamare al momento." };
  }

  // Raggruppa per account_id (prendi solo ultimo)
  const uniqueAccounts = new Map<string, { esito: string; data: string }>();
  for (const v of visits) {
    if (!uniqueAccounts.has(v.account_id)) {
      uniqueAccounts.set(v.account_id, { esito: v.esito, data: v.data_visita });
    }
  }

  // Carica nomi clienti
  const accountIds = [...uniqueAccounts.keys()];
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv")
    .in("id", accountIds);

  const items: PlanningItem[] = [];
  for (const acc of (accounts ?? [])) {
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    if (!name) continue;

    const info = uniqueAccounts.get(acc.id);
    items.push({
      type: 'callback',
      clientId: acc.id,
      clientName: name,
      reason: info?.esito ?? 'Da richiamare',
      priority: 'high'
    });
  }

  if (items.length === 0) {
    return { items: [], message: "Non hai clienti da richiamare al momento." };
  }

  const names = items.slice(0, 5).map(i => `• ${i.clientName}`).join('\n');
  const message = items.length === 1
    ? `Devi richiamare ${items[0].clientName}.`
    : `Hai ${items.length} clienti da richiamare:\n${names}${items.length > 5 ? `\n...e altri ${items.length - 5}` : ''}`;

  return { items, message };
}

/**
 * Planning giornaliero (callbacks + clienti inattivi)
 */
export async function getTodayPlanning(crypto: CryptoLike): Promise<{
  callbacks: PlanningItem[];
  visitsToday: VisitWithClient[];
  message: string;
}> {
  assertCrypto(crypto);

  const [callbackResult, visitsToday] = await Promise.all([
    getCallbacks(crypto),
    getVisitsToday(crypto)
  ]);

  let message = "📋 **Il tuo planning per oggi:**\n\n";

  if (visitsToday.length > 0) {
    message += `✅ **Visite fatte oggi:** ${visitsToday.length}\n`;
    visitsToday.slice(0, 3).forEach(v => {
      message += `   • ${v.clientName}`;
      if (v.importo_vendita) message += ` (€${v.importo_vendita})`;
      message += '\n';
    });
  } else {
    message += "📍 Nessuna visita registrata oggi.\n";
  }

  message += '\n';

  if (callbackResult.items.length > 0) {
    message += `📞 **Da richiamare:** ${callbackResult.items.length}\n`;
    callbackResult.items.slice(0, 3).forEach(i => {
      message += `   • ${i.clientName}\n`;
    });
  } else {
    message += "📞 Nessun cliente da richiamare.\n";
  }

  return { callbacks: callbackResult.items, visitsToday, message };
}

// ───────────────────────────────────────────────────────────────
// RICERCA CLIENTI
// ───────────────────────────────────────────────────────────────

export type ClientSearchResult = {
  id: string;
  name: string;
  lastVisit?: string;
  totalSales?: number;
};

/**
 * Cerca clienti per nome
 */
export async function searchClients(crypto: CryptoLike, query: string): Promise<{
  results: ClientSearchResult[];
  message: string;
}> {
  assertCrypto(crypto);

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv");

  const searchLower = query.toLowerCase();
  const results: ClientSearchResult[] = [];

  for (const acc of (accounts ?? [])) {
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    if (name && name.toLowerCase().includes(searchLower)) {
      results.push({ id: acc.id, name });
    }
  }

  if (results.length === 0) {
    return { results: [], message: `Nessun cliente trovato per "${query}".` };
  }

  const names = results.slice(0, 5).map(r => `• ${r.name}`).join('\n');
  const message = results.length === 1
    ? `Ho trovato: **${results[0].name}**`
    : `Ho trovato ${results.length} clienti:\n${names}${results.length > 5 ? `\n...e altri ${results.length - 5}` : ''}`;

  return { results, message };
}

// ───────────────────────────────────────────────────────────────
// PRODOTTI DISCUSSI PER CLIENTE
// ───────────────────────────────────────────────────────────────

/**
 * Prodotti discussi con un cliente specifico
 */
export async function getProductsDiscussedWithClient(crypto: CryptoLike, clientNameHint: string): Promise<{
  found: boolean;
  clientName?: string;
  products: string[];
  message: string;
}> {
  assertCrypto(crypto);

  // Cerca cliente
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv");

  const searchLower = clientNameHint.toLowerCase();
  let matchedAccount: { id: string; name: string } | null = null;

  for (const acc of (accounts ?? [])) {
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    if (name && name.toLowerCase().includes(searchLower)) {
      matchedAccount = { id: acc.id, name };
      break;
    }
  }

  if (!matchedAccount) {
    return { found: false, products: [], message: `Non ho trovato nessun cliente con "${clientNameHint}".` };
  }

  const { data: visits } = await supabase
    .from("visits")
    .select("prodotti_discussi")
    .eq("account_id", matchedAccount.id)
    .not("prodotti_discussi", "is", null);

  const allProducts: string[] = [];
  for (const v of (visits ?? [])) {
    if (v.prodotti_discussi) {
      const prods = v.prodotti_discussi.split(/[,;]/).map((p: string) => p.trim()).filter(Boolean);
      allProducts.push(...prods);
    }
  }

  const uniqueProducts = [...new Set(allProducts)];

  if (uniqueProducts.length === 0) {
    return {
      found: true,
      clientName: matchedAccount.name,
      products: [],
      message: `Non ci sono prodotti registrati per ${matchedAccount.name}.`
    };
  }

  const productList = uniqueProducts.slice(0, 10).map(p => `• ${p}`).join('\n');
  const message = `Prodotti discussi/venduti a ${matchedAccount.name}:\n${productList}${uniqueProducts.length > 10 ? `\n...e altri ${uniqueProducts.length - 10}` : ''}`;

  return { found: true, clientName: matchedAccount.name, products: uniqueProducts, message };
}

// ───────────────────────────────────────────────────────────────
// 🆕 RICERCA NELLE NOTE
// ───────────────────────────────────────────────────────────────

export type NotesSearchResult = {
  clientId: string;
  clientName: string;
  snippet: string;
  matchedTerm: string;
};

/**
 * Cerca un termine nelle note di tutti i clienti o di un cliente specifico
 */
export async function searchInNotes(
  crypto: CryptoLike, 
  searchTerm: string, 
  clientNameHint?: string
): Promise<{
  found: boolean;
  results: NotesSearchResult[];
  message: string;
}> {
  assertCrypto(crypto);

  // Se c'è un hint sul cliente, cerca solo quello
  if (clientNameHint) {
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id,name,name_enc,name_iv,notes");

    const searchLower = clientNameHint.toLowerCase();
    let matchedAccount: { id: string; name: string; notes: string } | null = null;

    for (const acc of (accounts ?? [])) {
      let name = acc.name;
      if (!name && acc.name_enc) {
        try {
          const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
          name = dec?.name;
        } catch { continue; }
      }
      if (name && name.toLowerCase().includes(searchLower)) {
        matchedAccount = { id: acc.id, name, notes: acc.notes ?? '' };
        break;
      }
    }

    if (!matchedAccount) {
      return { found: false, results: [], message: `Non ho trovato nessun cliente con "${clientNameHint}".` };
    }

    const notes = matchedAccount.notes.toLowerCase();
    const termLower = searchTerm.toLowerCase();
    
    if (notes.includes(termLower)) {
      // Estrai snippet intorno al termine
      const idx = notes.indexOf(termLower);
      const start = Math.max(0, idx - 30);
      const end = Math.min(notes.length, idx + termLower.length + 50);
      const snippet = (start > 0 ? '...' : '') + 
                      matchedAccount.notes.substring(start, end) + 
                      (end < notes.length ? '...' : '');

      return {
        found: true,
        results: [{
          clientId: matchedAccount.id,
          clientName: matchedAccount.name,
          snippet,
          matchedTerm: searchTerm
        }],
        message: `📝 **${matchedAccount.name}** - trovato "${searchTerm}":\n\n"${snippet}"`
      };
    }

    return {
      found: false,
      results: [],
      message: `Non ho trovato "${searchTerm}" nelle note di ${matchedAccount.name}.`
    };
  }

  // Ricerca globale nelle note di tutti i clienti
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv,notes")
    .ilike("notes", `%${searchTerm}%`);

  if (!accounts?.length) {
    return { found: false, results: [], message: `Nessun cliente con "${searchTerm}" nelle note.` };
  }

  const results: NotesSearchResult[] = [];

  for (const acc of accounts) {
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    if (!name) continue;

    const notes = acc.notes ?? '';
    const idx = notes.toLowerCase().indexOf(searchTerm.toLowerCase());
    const start = Math.max(0, idx - 20);
    const end = Math.min(notes.length, idx + searchTerm.length + 40);
    const snippet = (start > 0 ? '...' : '') + notes.substring(start, end) + (end < notes.length ? '...' : '');

    results.push({
      clientId: acc.id,
      clientName: name,
      snippet,
      matchedTerm: searchTerm
    });
  }

  if (results.length === 0) {
    return { found: false, results: [], message: `Nessun cliente con "${searchTerm}" nelle note.` };
  }

  const lines = results.slice(0, 5).map(r => `• **${r.clientName}**: "${r.snippet}"`).join('\n');
  const message = results.length === 1
    ? `📝 Trovato "${searchTerm}" in **${results[0].clientName}**:\n\n"${results[0].snippet}"`
    : `📝 Trovato "${searchTerm}" in ${results.length} clienti:\n\n${lines}${results.length > 5 ? `\n\n...e altri ${results.length - 5}` : ''}`;

  return { found: true, results, message };
}

// ───────────────────────────────────────────────────────────────
// 🆕 CLIENTI INATTIVI
// ───────────────────────────────────────────────────────────────

/**
 * Trova clienti che non sono stati visitati da X giorni
 */
export async function getInactiveClients(
  crypto: CryptoLike, 
  inactiveDays: number = 30
): Promise<{
  items: PlanningItem[];
  message: string;
}> {
  assertCrypto(crypto);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  // Prendi tutti i clienti
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv,created_at");

  if (!accounts?.length) {
    return { items: [], message: "Non hai clienti in archivio." };
  }

  // Per ogni cliente, trova l'ultima visita
  const { data: allVisits } = await supabase
    .from("visits")
    .select("account_id,data_visita")
    .order("data_visita", { ascending: false });

  // Mappa account_id -> ultima visita
  const lastVisitMap = new Map<string, string>();
  for (const v of (allVisits ?? [])) {
    if (!lastVisitMap.has(v.account_id)) {
      lastVisitMap.set(v.account_id, v.data_visita);
    }
  }

  const inactiveItems: PlanningItem[] = [];

  for (const acc of accounts) {
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    if (!name) continue;

    const lastVisit = lastVisitMap.get(acc.id);
    
    // Se non ha mai avuto visite o l'ultima è prima del cutoff
    if (!lastVisit || lastVisit < cutoffStr) {
      const daysSince = lastVisit 
        ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      inactiveItems.push({
        type: 'inactive_client',
        clientId: acc.id,
        clientName: name,
        reason: daysSince 
          ? `Ultima visita: ${daysSince} giorni fa`
          : 'Mai visitato',
        priority: daysSince && daysSince > 60 ? 'high' : 'medium'
      });
    }
  }

  // Ordina: mai visitati prima, poi per giorni di inattività
  inactiveItems.sort((a, b) => {
    if (a.reason === 'Mai visitato' && b.reason !== 'Mai visitato') return -1;
    if (b.reason === 'Mai visitato' && a.reason !== 'Mai visitato') return 1;
    return 0;
  });

  if (inactiveItems.length === 0) {
    return { 
      items: [], 
      message: `🎉 Ottimo! Tutti i tuoi clienti sono stati visitati negli ultimi ${inactiveDays} giorni.` 
    };
  }

  const lines = inactiveItems.slice(0, 5).map(i => `• **${i.clientName}** - ${i.reason}`).join('\n');
  const message = `⚠️ **${inactiveItems.length} clienti inattivi** (>${inactiveDays} giorni):\n\n${lines}${inactiveItems.length > 5 ? `\n\n...e altri ${inactiveItems.length - 5}` : ''}\n\n📞 Vuoi partire dal primo?`;

  return { items: inactiveItems, message };
}

// ───────────────────────────────────────────────────────────────
// 🆕 VISITE PER PRODOTTO
// ───────────────────────────────────────────────────────────────

export type VisitByProductResult = {
  clientId: string;
  clientName: string;
  date: string;
  importo?: number;
  allProducts: string;
};

/**
 * Trova clienti a cui è stato venduto/discusso un prodotto
 */
export async function getVisitsByProduct(
  crypto: CryptoLike,
  productName: string,
  period?: 'today' | 'week' | 'month' | 'year'
): Promise<{
  found: boolean;
  product: string;
  results: VisitByProductResult[];
  message: string;
}> {
  assertCrypto(crypto);

  let query = supabase
    .from("visits")
    .select("id,account_id,data_visita,importo_vendita,prodotti_discussi")
    .ilike("prodotti_discussi", `%${productName}%`)
    .order("data_visita", { ascending: false });

  // Filtro periodo
  if (period) {
    const now = new Date();
    let fromDate: Date;
    switch (period) {
      case 'today':
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        fromDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
  }

  const { data: visits, error } = await query.limit(20);
  
  if (error) throw error;
  if (!visits?.length) {
    return { 
      found: false, 
      product: productName,
      results: [], 
      message: `Nessuna visita trovata con "${productName}" nei prodotti discussi.` 
    };
  }

  // Carica nomi clienti
  const accountIds = [...new Set(visits.map(v => v.account_id))];
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv")
    .in("id", accountIds);

  const accountMap = new Map<string, string>();
  for (const acc of (accounts ?? [])) {
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    if (name) accountMap.set(acc.id, name);
  }

  const results: VisitByProductResult[] = visits.map(v => ({
    clientId: v.account_id,
    clientName: accountMap.get(v.account_id) ?? 'Cliente sconosciuto',
    date: v.data_visita,
    importo: v.importo_vendita ?? undefined,
    allProducts: v.prodotti_discussi ?? ''
  }));

  // Raggruppa per cliente (mostra solo l'ultima visita per cliente)
  const uniqueClients = new Map<string, VisitByProductResult>();
  for (const r of results) {
    if (!uniqueClients.has(r.clientId)) {
      uniqueClients.set(r.clientId, r);
    }
  }
  const uniqueResults = [...uniqueClients.values()];

  const periodLabel = period === 'today' ? ' oggi' :
                      period === 'week' ? ' questa settimana' :
                      period === 'month' ? ' questo mese' :
                      period === 'year' ? " quest'anno" : '';

  const lines = uniqueResults.slice(0, 8).map(r => {
    const date = new Date(r.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    let line = `• **${r.clientName}** (${date})`;
    if (r.importo) line += ` - €${r.importo.toLocaleString('it-IT')}`;
    return line;
  }).join('\n');

  const message = `🛒 **"${productName}"** - ${uniqueResults.length} clienti${periodLabel}:\n\n${lines}${uniqueResults.length > 8 ? `\n\n...e altri ${uniqueResults.length - 8}` : ''}`;

  return { found: true, product: productName, results: uniqueResults, message };
}

// ───────────────────────────────────────────────────────────────
// 🆕 VISITE PER GIORNO SPECIFICO
// ───────────────────────────────────────────────────────────────

/**
 * Ottieni visite di un giorno specifico (per visit_by_position)
 */
export async function getVisitsByDay(
  crypto: CryptoLike,
  day: 'today' | 'yesterday'
): Promise<VisitWithClient[]> {
  assertCrypto(crypto);

  const now = new Date();
  let targetDate: Date;
  
  if (day === 'yesterday') {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - 1);
  } else {
    targetDate = now;
  }

  const dateStr = targetDate.toISOString().split('T')[0];

  const { data: visits, error } = await supabase
    .from("visits")
    .select("*")
    .eq("data_visita", dateStr)
    .order("created_at", { ascending: true }); // Ordine cronologico per posizione

  if (error) throw error;
  if (!visits?.length) return [];

  // Carica nomi clienti
  const accountIds = [...new Set(visits.map(v => v.account_id))];
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv")
    .in("id", accountIds);

  const accountMap = new Map<string, string>();
  for (const acc of (accounts ?? [])) {
    if (acc.name) {
      accountMap.set(acc.id, acc.name);
    } else if (acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        if (dec?.name) accountMap.set(acc.id, dec.name);
      } catch { /* ignora */ }
    }
  }

  return visits.map(v => ({
    ...v,
    clientName: accountMap.get(v.account_id) ?? "Cliente sconosciuto"
  }));
}

// ───────────────────────────────────────────────────────────────
// 🆕 ANALISI GEOGRAFICHE - CON ROUTING STRADALE REALE (OSRM)
// ───────────────────────────────────────────────────────────────

/**
 * Tipo per risultato analisi prodotto/km
 */
type ProductKmAnalysis = {
  product: string;
  totalRevenue: number;
  totalKm: number;
  revenuePerKm: number;
  visitCount: number;
  avgMinutes?: number;
};

/**
 * Analisi fatturato per km per prodotto
 * USA DISTANZE STRADALI REALI via OSRM!
 * Risponde a: "quale prodotto mi assicura il maggior fatturato a parità di km percorsi?"
 */
export async function analyzeRevenuePerKmByProduct(
  crypto: CryptoLike,
  homeCoords: { lat: number; lon: number },
  period?: 'week' | 'month' | 'year'
): Promise<{
  success: boolean;
  analysis: ProductKmAnalysis[];
  bestProduct?: ProductKmAnalysis;
  message: string;
}> {
  assertCrypto(crypto);

  // 1. Carica visite con vendite nel periodo
  let query = supabase
    .from("visits")
    .select("id, account_id, importo_vendita, prodotti_discussi, data_visita")
    .not("importo_vendita", "is", null)
    .gt("importo_vendita", 0);

  const now = new Date();
  let fromDate: Date;
  let periodLabel: string;

  switch (period) {
    case 'week':
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodLabel = 'questa settimana';
      break;
    case 'year':
      fromDate = new Date(now.getFullYear(), 0, 1);
      periodLabel = "quest'anno";
      break;
    case 'month':
    default:
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = 'questo mese';
      break;
  }

  query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);

  const { data: visits, error: visitError } = await query;
  if (visitError) throw visitError;

  if (!visits?.length) {
    return {
      success: false,
      analysis: [],
      message: `Nessuna vendita registrata ${periodLabel}.`
    };
  }

  // 2. Carica clienti con coordinate
  const accountIds = [...new Set(visits.map(v => v.account_id))];
  const { data: accounts, error: accError } = await supabase
    .from("accounts")
    .select("id, name, name_enc, name_iv, latitude, longitude")
    .in("id", accountIds);

  if (accError) throw accError;

  // Mappa clienti con coordinate
  const clientsWithCoords: Array<{ id: string; name: string; lat: number; lon: number }> = [];
  
  for (const acc of (accounts ?? [])) {
    if (acc.latitude == null || acc.longitude == null) continue;
    
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    
    if (name) {
      clientsWithCoords.push({ 
        id: acc.id,
        name, 
        lat: acc.latitude, 
        lon: acc.longitude 
      });
    }
  }

  if (clientsWithCoords.length === 0) {
    return {
      success: false,
      analysis: [],
      message: `Non ho clienti con coordinate GPS. Usa 🗺️ Geocode Clienti per aggiungerle.`
    };
  }

  // 3. Calcola DISTANZE STRADALI REALI con OSRM
  console.log(`[Routing] Calcolo distanze stradali per ${clientsWithCoords.length} clienti...`);
  
  const distanceMap = await getDistancesToMany(
    { lat: homeCoords.lat, lon: homeCoords.lon },
    clientsWithCoords
  );

  // Fallback a Haversine per clienti senza risposta OSRM
  const getDistance = (clientId: string, clientLat: number, clientLon: number): number => {
    const osrmResult = distanceMap.get(clientId);
    if (osrmResult?.distanceKm) return osrmResult.distanceKm;
    // Fallback Haversine * 1.3 (stima strada vs linea d'aria)
    return haversineDistance(homeCoords.lat, homeCoords.lon, clientLat, clientLon) * 1.3;
  };

  // 4. Aggrega per prodotto
  const productStats = new Map<string, { revenue: number; km: number; visits: number; minutes: number }>();
  const clientMap = new Map(clientsWithCoords.map(c => [c.id, c]));

  for (const visit of visits) {
    const client = clientMap.get(visit.account_id);
    if (!client) continue;

    const distance = getDistance(client.id, client.lat, client.lon);
    const osrmResult = distanceMap.get(client.id);
    const minutes = osrmResult?.durationMinutes ?? 0;
    
    // Estrai prodotti discussi
    const products = (visit.prodotti_discussi ?? 'Generale')
      .split(/[,;]/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    const revenuePerProduct = (visit.importo_vendita ?? 0) / Math.max(products.length, 1);

    for (const product of products) {
      const key = product.toLowerCase();
      const existing = productStats.get(key) ?? { revenue: 0, km: 0, visits: 0, minutes: 0 };
      productStats.set(key, {
        revenue: existing.revenue + revenuePerProduct,
        km: existing.km + distance,
        visits: existing.visits + 1,
        minutes: existing.minutes + minutes
      });
    }
  }

  // 5. Calcola metriche e ordina
  const analysis: ProductKmAnalysis[] = [];
  
  for (const [product, stats] of productStats.entries()) {
    if (stats.km > 0) {
      analysis.push({
        product: product.charAt(0).toUpperCase() + product.slice(1),
        totalRevenue: Math.round(stats.revenue),
        totalKm: Math.round(stats.km * 10) / 10,
        revenuePerKm: Math.round((stats.revenue / stats.km) * 100) / 100,
        visitCount: stats.visits,
        avgMinutes: stats.visits > 0 ? Math.round(stats.minutes / stats.visits) : undefined
      });
    }
  }

  analysis.sort((a, b) => b.revenuePerKm - a.revenuePerKm);

  if (analysis.length === 0) {
    return {
      success: false,
      analysis: [],
      message: `Non ho abbastanza dati ${periodLabel}.`
    };
  }

  const bestProduct = analysis[0];
  const top3 = analysis.slice(0, 3);

  const lines = top3.map((p, i) => {
    let line = `${i + 1}. **${p.product}**: €${p.revenuePerKm.toFixed(2)}/km`;
    line += ` (€${p.totalRevenue} in ${p.totalKm}km, ${p.visitCount} visite)`;
    return line;
  }).join('\n');

  const message = `🛣️ **Fatturato per km** ${periodLabel} (distanze stradali):\n\n${lines}${analysis.length > 3 ? `\n\n...e altri ${analysis.length - 3} prodotti.` : ''}\n\n🏆 **${bestProduct.product}** è il più redditizio: €${bestProduct.revenuePerKm.toFixed(2)}/km!`;

  return { success: true, analysis, bestProduct, message };
}

/**
 * Clienti più vicini al punto di partenza
 * USA DISTANZE STRADALI REALI via OSRM!
 */
export async function getNearestClients(
  crypto: CryptoLike,
  homeCoords: { lat: number; lon: number },
  limit: number = 10
): Promise<{
  clients: Array<{ id: string; name: string; distance: number; duration?: number; city?: string }>;
  message: string;
}> {
  assertCrypto(crypto);

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, name, name_enc, name_iv, latitude, longitude, city")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) throw error;

  // Prepara lista clienti con coordinate
  const clientsToRoute: Array<{ id: string; name: string; lat: number; lon: number; city?: string }> = [];

  for (const acc of (accounts ?? [])) {
    if (acc.latitude == null || acc.longitude == null) continue;

    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }

    if (name) {
      clientsToRoute.push({
        id: acc.id,
        name,
        lat: acc.latitude,
        lon: acc.longitude,
        city: acc.city ?? undefined
      });
    }
  }

  if (clientsToRoute.length === 0) {
    return { 
      clients: [], 
      message: "Nessun cliente con coordinate GPS trovato. Usa 🗺️ Geocode Clienti per aggiungerle."
    };
  }

  // Calcola DISTANZE STRADALI REALI
  console.log(`[Routing] Calcolo distanze stradali per ${clientsToRoute.length} clienti...`);
  
  const distanceMap = await getDistancesToMany(
    { lat: homeCoords.lat, lon: homeCoords.lon },
    clientsToRoute
  );

  // Costruisci risultato con distanze reali (fallback Haversine se OSRM fallisce)
  const clientsWithDistance = clientsToRoute.map(c => {
    const osrmResult = distanceMap.get(c.id);
    const distance = osrmResult?.distanceKm ?? 
                     (haversineDistance(homeCoords.lat, homeCoords.lon, c.lat, c.lon) * 1.3);
    return {
      id: c.id,
      name: c.name,
      distance: Math.round(distance * 10) / 10,
      duration: osrmResult?.durationMinutes,
      city: c.city
    };
  });

  // Ordina per distanza stradale crescente
  clientsWithDistance.sort((a, b) => a.distance - b.distance);
  const nearest = clientsWithDistance.slice(0, limit);

  const lines = nearest.map((c, i) => {
    let line = `${i + 1}. **${c.name}**`;
    if (c.city) line += ` (${c.city})`;
    line += ` - ${c.distance} km`;
    if (c.duration) line += ` (~${c.duration} min)`;
    return line;
  }).join('\n');

  return {
    clients: nearest,
    message: `📍 **Clienti più vicini** (distanze stradali):\n\n${lines}`
  };
}

/**
 * Stima km percorsi per un giro di visite
 * USA ROUTING STRADALE REALE via OSRM!
 */
export async function estimateRouteKm(
  crypto: CryptoLike,
  homeCoords: { lat: number; lon: number },
  clientIds: string[]
): Promise<{
  totalKm: number;
  totalMinutes: number;
  route: Array<{ name: string; kmFromPrevious: number; minutes?: number }>;
  message: string;
}> {
  assertCrypto(crypto);

  if (clientIds.length === 0) {
    return { totalKm: 0, totalMinutes: 0, route: [], message: "Nessun cliente nel percorso." };
  }

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, name, name_enc, name_iv, latitude, longitude")
    .in("id", clientIds);

  if (error) throw error;

  // Costruisci waypoints
  const waypoints: Array<{ lat: number; lon: number; name?: string }> = [
    { lat: homeCoords.lat, lon: homeCoords.lon, name: '🏠 Partenza' }
  ];
  
  const clientMap = new Map<string, { name: string; lat: number; lon: number }>();
  
  for (const acc of (accounts ?? [])) {
    if (acc.latitude == null || acc.longitude == null) continue;

    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }

    if (name) {
      clientMap.set(acc.id, { name, lat: acc.latitude, lon: acc.longitude });
    }
  }

  // Aggiungi clienti nell'ordine richiesto
  for (const id of clientIds) {
    const client = clientMap.get(id);
    if (client) {
      waypoints.push({ lat: client.lat, lon: client.lon, name: client.name });
    }
  }

  // Ritorno a casa
  waypoints.push({ lat: homeCoords.lat, lon: homeCoords.lon, name: '🏠 Ritorno' });

  // Calcola percorso con OSRM
  console.log(`[Routing] Calcolo percorso con ${waypoints.length} tappe...`);
  const routeResult = await getMultiStopRoute(waypoints);

  // Costruisci messaggio
  const route = routeResult.legs.slice(0, -1).map(leg => ({
    name: leg.to,
    kmFromPrevious: leg.distanceKm,
    minutes: leg.durationMinutes
  }));

  const returnLeg = routeResult.legs[routeResult.legs.length - 1];

  const lines = route.map((r, i) => {
    let line = `${i + 1}. ${r.name} (+${r.kmFromPrevious} km`;
    if (r.minutes) line += `, ~${r.minutes} min`;
    line += ')';
    return line;
  }).join('\n');
  
  return {
    totalKm: routeResult.totalKm,
    totalMinutes: routeResult.totalMinutes,
    route,
    message: `🚗 **Percorso stimato**: ${routeResult.totalKm} km (~${Math.round(routeResult.totalMinutes / 60)}h ${routeResult.totalMinutes % 60}min)\n\n${lines}\n\n🏠 Ritorno: +${returnLeg?.distanceKm ?? 0} km`
  };
}

/**
 * Calcola km percorsi in un periodo basandosi sulle visite effettuate
 * USA DISTANZE STRADALI REALI via OSRM!
 */
// ───────────────────────────────────────────────────────────────
// 🆕 ANALYTICS - TOP CLIENTI E PRODOTTI
// ───────────────────────────────────────────────────────────────

export type TopClientResult = {
  id: string;
  name: string;
  totalRevenue: number;
  orderCount: number;
  avgOrder: number;
  lastVisit?: string;
};

/**
 * Top N clienti per fatturato
 */
export async function getTopClients(
  crypto: CryptoLike,
  limit: number = 10,
  period?: 'month' | 'quarter' | 'year'
): Promise<{
  clients: TopClientResult[];
  totalRevenue: number;
  message: string;
}> {
  assertCrypto(crypto);

  // Calcola fromDate se specificato un periodo
  let fromDate: Date | null = null;
  let periodLabel = 'da sempre';
  
  if (period) {
    const now = new Date();
    switch (period) {
      case 'month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'questo mese';
        break;
      case 'quarter':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        periodLabel = 'ultimi 3 mesi';
        break;
      case 'year':
        fromDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = "quest'anno";
        break;
    }
  }

  // Query visite con vendite
  let query = supabase
    .from("visits")
    .select("account_id, importo_vendita, data_visita")
    .not("importo_vendita", "is", null)
    .gt("importo_vendita", 0);

  if (fromDate) {
    query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
  }

  const { data: visits, error: visitError } = await query;
  if (visitError) throw visitError;

  if (!visits?.length) {
    return {
      clients: [],
      totalRevenue: 0,
      message: `Nessuna vendita registrata ${periodLabel}.`
    };
  }

  // Aggrega per cliente
  const clientStats = new Map<string, { revenue: number; orders: number; lastVisit: string }>();
  
  for (const v of visits) {
    const existing = clientStats.get(v.account_id) ?? { revenue: 0, orders: 0, lastVisit: '' };
    clientStats.set(v.account_id, {
      revenue: existing.revenue + (v.importo_vendita ?? 0),
      orders: existing.orders + 1,
      lastVisit: v.data_visita > existing.lastVisit ? v.data_visita : existing.lastVisit
    });
  }

  // Carica nomi clienti
  const accountIds = [...clientStats.keys()];
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, name_enc, name_iv")
    .in("id", accountIds);

  const nameMap = new Map<string, string>();
  for (const acc of (accounts ?? [])) {
    let name = acc.name;
    if (!name && acc.name_enc) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        name = dec?.name;
      } catch { continue; }
    }
    if (name) nameMap.set(acc.id, name);
  }

  // Costruisci risultato ordinato
  const results: TopClientResult[] = [];
  let totalRevenue = 0;

  for (const [id, stats] of clientStats.entries()) {
    const name = nameMap.get(id);
    if (!name) continue;

    totalRevenue += stats.revenue;
    results.push({
      id,
      name,
      totalRevenue: Math.round(stats.revenue),
      orderCount: stats.orders,
      avgOrder: Math.round(stats.revenue / stats.orders),
      lastVisit: stats.lastVisit
    });
  }

  // Ordina per fatturato decrescente
  results.sort((a, b) => b.totalRevenue - a.totalRevenue);
  const topN = results.slice(0, limit);

  // Formatta messaggio
  const lines = topN.map((c, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} **${c.name}**: €${c.totalRevenue.toLocaleString('it-IT')} (${c.orderCount} ordini, media €${c.avgOrder})`;
  }).join('\n');

  const message = `🏆 **Top ${topN.length} Clienti** ${periodLabel}:\n\n${lines}\n\n💰 Totale: €${Math.round(totalRevenue).toLocaleString('it-IT')}`;

  return { clients: topN, totalRevenue: Math.round(totalRevenue), message };
}

export type TopProductResult = {
  name: string;
  totalRevenue: number;
  clientCount: number;
  visitCount: number;
  avgPerVisit: number;
};

/**
 * Top N prodotti per fatturato
 */
export async function getTopProducts(
  crypto: CryptoLike,
  limit: number = 10,
  period?: 'month' | 'quarter' | 'year'
): Promise<{
  products: TopProductResult[];
  totalRevenue: number;
  message: string;
}> {
  assertCrypto(crypto);

  // Calcola fromDate
  let fromDate: Date | null = null;
  let periodLabel = 'da sempre';
  
  if (period) {
    const now = new Date();
    switch (period) {
      case 'month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'questo mese';
        break;
      case 'quarter':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        periodLabel = 'ultimi 3 mesi';
        break;
      case 'year':
        fromDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = "quest'anno";
        break;
    }
  }

  // Query visite con prodotti
  let query = supabase
    .from("visits")
    .select("account_id, importo_vendita, prodotti_discussi, data_visita")
    .not("prodotti_discussi", "is", null)
    .not("importo_vendita", "is", null)
    .gt("importo_vendita", 0);

  if (fromDate) {
    query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
  }

  const { data: visits, error } = await query;
  if (error) throw error;

  if (!visits?.length) {
    return {
      products: [],
      totalRevenue: 0,
      message: `Nessuna vendita con prodotti registrata ${periodLabel}.`
    };
  }

  // Aggrega per prodotto
  const productStats = new Map<string, { revenue: number; clients: Set<string>; visits: number }>();

  for (const v of visits) {
    const products = (v.prodotti_discussi ?? '')
      .split(/[,;]/)
      .map((p: string) => p.trim().toLowerCase())
      .filter((p: string) => p.length > 0);

    const revenuePerProduct = (v.importo_vendita ?? 0) / Math.max(products.length, 1);

    for (const product of products) {
      const existing = productStats.get(product) ?? { revenue: 0, clients: new Set(), visits: 0 };
      existing.revenue += revenuePerProduct;
      existing.clients.add(v.account_id);
      existing.visits += 1;
      productStats.set(product, existing);
    }
  }

  // Costruisci risultato
  const results: TopProductResult[] = [];
  let totalRevenue = 0;

  for (const [name, stats] of productStats.entries()) {
    totalRevenue += stats.revenue;
    results.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      totalRevenue: Math.round(stats.revenue),
      clientCount: stats.clients.size,
      visitCount: stats.visits,
      avgPerVisit: Math.round(stats.revenue / stats.visits)
    });
  }

  // Ordina per fatturato
  results.sort((a, b) => b.totalRevenue - a.totalRevenue);
  const topN = results.slice(0, limit);

  const lines = topN.map((p, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} **${p.name}**: €${p.totalRevenue.toLocaleString('it-IT')} (${p.clientCount} clienti, ${p.visitCount} vendite)`;
  }).join('\n');

  const message = `📦 **Top ${topN.length} Prodotti** ${periodLabel}:\n\n${lines}\n\n💰 Totale: €${Math.round(totalRevenue).toLocaleString('it-IT')}`;

  return { products: topN, totalRevenue: Math.round(totalRevenue), message };
}

/**
 * Analisi vendite per giorno della settimana
 */
export async function getSalesByDayOfWeek(
  period?: 'month' | 'quarter' | 'year'
): Promise<{
  byDay: Array<{ day: string; dayIndex: number; totalRevenue: number; visitCount: number; avgRevenue: number }>;
  bestDay: { day: string; totalRevenue: number };
  message: string;
}> {
  // Calcola fromDate
  let fromDate: Date | null = null;
  let periodLabel = 'da sempre';
  
  if (period) {
    const now = new Date();
    switch (period) {
      case 'month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'questo mese';
        break;
      case 'quarter':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        periodLabel = 'ultimi 3 mesi';
        break;
      case 'year':
        fromDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = "quest'anno";
        break;
    }
  }

  let query = supabase
    .from("visits")
    .select("importo_vendita, data_visita")
    .not("importo_vendita", "is", null)
    .gt("importo_vendita", 0);

  if (fromDate) {
    query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
  }

  const { data: visits, error } = await query;
  if (error) throw error;

  if (!visits?.length) {
    return {
      byDay: [],
      bestDay: { day: '', totalRevenue: 0 },
      message: `Nessuna vendita ${periodLabel}.`
    };
  }

  // Aggrega per giorno settimana
  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const dayStats = new Map<number, { revenue: number; count: number }>();

  for (const v of visits) {
    const date = new Date(v.data_visita);
    const dayIndex = date.getDay();
    const existing = dayStats.get(dayIndex) ?? { revenue: 0, count: 0 };
    dayStats.set(dayIndex, {
      revenue: existing.revenue + (v.importo_vendita ?? 0),
      count: existing.count + 1
    });
  }

  // Costruisci risultato
  const byDay = [];
  for (let i = 1; i <= 6; i++) { // Lunedì a Sabato
    const stats = dayStats.get(i) ?? { revenue: 0, count: 0 };
    byDay.push({
      day: dayNames[i],
      dayIndex: i,
      totalRevenue: Math.round(stats.revenue),
      visitCount: stats.count,
      avgRevenue: stats.count > 0 ? Math.round(stats.revenue / stats.count) : 0
    });
  }
  // Aggiungi domenica alla fine
  const domenica = dayStats.get(0) ?? { revenue: 0, count: 0 };
  byDay.push({
    day: 'Domenica',
    dayIndex: 0,
    totalRevenue: Math.round(domenica.revenue),
    visitCount: domenica.count,
    avgRevenue: domenica.count > 0 ? Math.round(domenica.revenue / domenica.count) : 0
  });

  // Trova giorno migliore
  const bestDay = byDay.reduce((best, d) => 
    d.totalRevenue > best.totalRevenue ? { day: d.day, totalRevenue: d.totalRevenue } : best,
    { day: '', totalRevenue: 0 }
  );

  const lines = byDay
    .filter(d => d.visitCount > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .map((d, i) => {
      const bar = '█'.repeat(Math.min(10, Math.round(d.totalRevenue / (bestDay.totalRevenue / 10))));
      return `${d.day}: ${bar} €${d.totalRevenue.toLocaleString('it-IT')} (${d.visitCount} visite)`;
    })
    .join('\n');

  const message = `📅 **Vendite per giorno** ${periodLabel}:\n\n${lines}\n\n🏆 **${bestDay.day}** è il giorno più produttivo!`;

  return { byDay, bestDay, message };
}

/**
 * Performance per zona/città
 */
export async function getSalesByCity(
  crypto: CryptoLike,
  period?: 'month' | 'quarter' | 'year'
): Promise<{
  byCity: Array<{ city: string; totalRevenue: number; clientCount: number; visitCount: number }>;
  bestCity: { city: string; totalRevenue: number };
  message: string;
}> {
  assertCrypto(crypto);

  // Calcola fromDate
  let fromDate: Date | null = null;
  let periodLabel = 'da sempre';
  
  if (period) {
    const now = new Date();
    switch (period) {
      case 'month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'questo mese';
        break;
      case 'quarter':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        periodLabel = 'ultimi 3 mesi';
        break;
      case 'year':
        fromDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = "quest'anno";
        break;
    }
  }

  // Carica visite con vendite
  let query = supabase
    .from("visits")
    .select("account_id, importo_vendita, data_visita")
    .not("importo_vendita", "is", null)
    .gt("importo_vendita", 0);

  if (fromDate) {
    query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
  }

  const { data: visits, error: visitError } = await query;
  if (visitError) throw visitError;

  if (!visits?.length) {
    return {
      byCity: [],
      bestCity: { city: '', totalRevenue: 0 },
      message: `Nessuna vendita ${periodLabel}.`
    };
  }

  // Carica città clienti
  const accountIds = [...new Set(visits.map(v => v.account_id))];
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, city")
    .in("id", accountIds);

  const cityMap = new Map<string, string>();
  for (const acc of (accounts ?? [])) {
    if (acc.city) cityMap.set(acc.id, acc.city);
  }

  // Aggrega per città
  const cityStats = new Map<string, { revenue: number; clients: Set<string>; visits: number }>();

  for (const v of visits) {
    const city = cityMap.get(v.account_id) ?? 'Non specificata';
    const existing = cityStats.get(city) ?? { revenue: 0, clients: new Set(), visits: 0 };
    existing.revenue += v.importo_vendita ?? 0;
    existing.clients.add(v.account_id);
    existing.visits += 1;
    cityStats.set(city, existing);
  }

  // Costruisci risultato
  const byCity = [];
  for (const [city, stats] of cityStats.entries()) {
    byCity.push({
      city,
      totalRevenue: Math.round(stats.revenue),
      clientCount: stats.clients.size,
      visitCount: stats.visits
    });
  }

  // Ordina per fatturato
  byCity.sort((a, b) => b.totalRevenue - a.totalRevenue);
  const top10 = byCity.slice(0, 10);

  const bestCity = byCity[0] ?? { city: '', totalRevenue: 0 };

  const lines = top10.map((c, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} **${c.city}**: €${c.totalRevenue.toLocaleString('it-IT')} (${c.clientCount} clienti, ${c.visitCount} visite)`;
  }).join('\n');

  const message = `🗺️ **Vendite per zona** ${periodLabel}:\n\n${lines}\n\n🏆 **${bestCity.city}** è la zona più produttiva!`;

  return { byCity: top10, bestCity, message };
}

export async function getKmTraveledInPeriod(
  crypto: CryptoLike,
  homeCoords: { lat: number; lon: number },
  period: 'today' | 'week' | 'month' | 'year'
): Promise<{
  totalKm: number;
  totalMinutes: number;
  visitCount: number;
  avgKmPerVisit: number;
  message: string;
}> {
  assertCrypto(crypto);

  const now = new Date();
  let fromDate: Date;
  let periodLabel: string;

  switch (period) {
    case 'today':
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      periodLabel = 'oggi';
      break;
    case 'week':
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodLabel = 'questa settimana';
      break;
    case 'year':
      fromDate = new Date(now.getFullYear(), 0, 1);
      periodLabel = "quest'anno";
      break;
    case 'month':
    default:
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = 'questo mese';
      break;
  }

  const { data: visits, error: visitError } = await supabase
    .from("visits")
    .select("account_id, data_visita")
    .gte("data_visita", fromDate.toISOString().split('T')[0])
    .order("data_visita", { ascending: true });

  if (visitError) throw visitError;

  if (!visits?.length) {
    return {
      totalKm: 0,
      totalMinutes: 0,
      visitCount: 0,
      avgKmPerVisit: 0,
      message: `Nessuna visita ${periodLabel}.`
    };
  }

  // Carica clienti con coordinate
  const accountIds = [...new Set(visits.map(v => v.account_id))];
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, latitude, longitude")
    .in("id", accountIds);

  const clientsForRouting: Array<{ id: string; lat: number; lon: number }> = [];
  for (const acc of (accounts ?? [])) {
    if (acc.latitude != null && acc.longitude != null) {
      clientsForRouting.push({ id: acc.id, lat: acc.latitude, lon: acc.longitude });
    }
  }

  if (clientsForRouting.length === 0) {
    return {
      totalKm: 0,
      totalMinutes: 0,
      visitCount: 0,
      avgKmPerVisit: 0,
      message: `Nessun cliente con coordinate GPS ${periodLabel}.`
    };
  }

  // Calcola distanze stradali reali
  console.log(`[Routing] Calcolo distanze per ${clientsForRouting.length} clienti...`);
  const distanceMap = await getDistancesToMany(
    { lat: homeCoords.lat, lon: homeCoords.lon },
    clientsForRouting
  );

  // Somma km (andata e ritorno per ogni visita)
  let totalKm = 0;
  let totalMinutes = 0;
  let validVisits = 0;

  const coordMap = new Map(clientsForRouting.map(c => [c.id, c]));

  for (const visit of visits) {
    const client = coordMap.get(visit.account_id);
    if (!client) continue;

    const osrmResult = distanceMap.get(client.id);
    const km = osrmResult?.distanceKm ?? 
               (haversineDistance(homeCoords.lat, homeCoords.lon, client.lat, client.lon) * 1.3);
    const minutes = osrmResult?.durationMinutes ?? 0;

    totalKm += km * 2; // Andata e ritorno
    totalMinutes += minutes * 2;
    validVisits++;
  }

  const avgKmPerVisit = validVisits > 0 ? totalKm / validVisits : 0;

  return {
    totalKm: Math.round(totalKm),
    totalMinutes: Math.round(totalMinutes),
    visitCount: validVisits,
    avgKmPerVisit: Math.round(avgKmPerVisit * 10) / 10,
    message: `🚗 **Km ${periodLabel}** (stradali): ~${Math.round(totalKm)} km (~${Math.round(totalMinutes / 60)}h) per ${validVisits} visite\n\n📊 Media: ${Math.round(avgKmPerVisit)} km/visita`
  };
}
