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
  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");
  
  const { count, error } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  
  if (error) throw error;
  return count ?? 0;
}

/**
 * Conta le città uniche dove ho clienti
 */
export async function countUniqueCities(): Promise<{ count: number; cities: string[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");
  
  const { data, error } = await supabase
    .from("accounts")
    .select("city")
    .eq("user_id", user.id)
    .not("city", "is", null)
    .not("city", "eq", "");
  
  if (error) throw error;
  
  // Estrai città uniche
  const uniqueCities = [...new Set(data?.map(a => a.city).filter(Boolean) || [])];
  
  return {
    count: uniqueCities.length,
    cities: uniqueCities.sort()
  };
}

/**
 * lista nomi clienti decifrati (o plain se presente).
 * @param crypto istanza da useCrypto().crypto
 * @returns oggetto con nomi e conteggio clienti senza nome
 */
export async function listClientNames(crypto: CryptoLike): Promise<ClientNamesResult> {
  assertCrypto(crypto);

  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const { data, error } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv,created_at")
    .eq("user_id", user.id)
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

  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const { data, error } = await supabase
    .from("accounts")
    .select("id,email_enc,email_iv,created_at")
    .eq("user_id", user.id)
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
  period?: 'today' | 'tomorrow' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month' | 'quarter' | 'year';
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

  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const filtersApplied: string[] = [];

  // 1. Query base clienti
  let query = supabase
    .from("accounts")
    .select("id, name, name_enc, name_iv, city, tipo_locale")
    .eq("user_id", user.id);

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
  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");
  
  let query = supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

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
  
  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data: visits, error: visitError } = await supabase
    .from("visits")
    .select("*")
    .eq("user_id", user.id)
    .eq("data_visita", today)
    .order("created_at", { ascending: false });

  if (visitError) throw visitError;
  if (!visits?.length) return [];

  // Carica nomi clienti
  const accountIds = [...new Set(visits.map(v => v.account_id))];
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv")
    .eq("user_id", user.id)
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

  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  // 1. Cerca il cliente per nome
  const { data: accounts, error: accError } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv")
    .eq("user_id", user.id);

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
    .eq("user_id", user.id)
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

  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  // Cerca cliente
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv")
    .eq("user_id", user.id);

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
    .eq("user_id", user.id)
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
  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");
  
  let query = supabase
    .from("visits")
    .select("importo_vendita,data_visita")
    .eq("user_id", user.id);

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

  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  // Cerca cliente
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv")
    .eq("user_id", user.id);

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
    .eq("user_id", user.id)
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

  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  // Cerca visite con esito "richiamare" o simili
  const { data: visits } = await supabase
    .from("visits")
    .select("account_id,esito,data_visita")
    .eq("user_id", user.id)
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
    .eq("user_id", user.id)
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

/**
 * Planning per domani (visite pianificate, callbacks)
 */
export async function getTomorrowPlanning(crypto: CryptoLike): Promise<{
  callbacks: PlanningItem[];
  message: string;
}> {
  assertCrypto(crypto);

  // Per ora mostra i callbacks (clienti da richiamare)
  // TODO: aggiungere supporto per visite pianificate quando avremo un campo data_pianificata
  const callbackResult = await getCallbacks(crypto);

  // Calcola data di domani
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  let message = `📅 **Planning per domani (${tomorrowStr}):**\n\n`;

  if (callbackResult.items.length > 0) {
    message += `📞 **Clienti da richiamare:** ${callbackResult.items.length}\n`;
    callbackResult.items.slice(0, 5).forEach(i => {
      message += `   • ${i.clientName}`;
      if (i.esito) message += ` - ${i.esito}`;
      message += '\n';
    });
    message += '\n💡 Suggerimento: inizia la giornata con i richiami!';
  } else {
    message += "✨ Nessun appuntamento o richiamo pianificato per domani.\n\n";
    message += "💡 Vuoi pianificare delle visite? Prova:\n";
    message += '   • "Chi non visito da più di 30 giorni?"\n';
    message += '   • "Clienti senza ordini questo mese"';
  }

  return { callbacks: callbackResult.items, message };
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

  // Recupera l'utente corrente per filtrare correttamente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv")
    .eq("user_id", user.id);

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

// ═══════════════════════════════════════════════════════════════
// 🆕 FASE 1: ELABORAZIONI NUMERICHE AVANZATE
// ═══════════════════════════════════════════════════════════════

/**
 * Calcola la media giornaliera delle vendite per un periodo
 */
export async function getDailyAverage(
  period: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<{ avgDaily: number; totalDays: number; totalAmount: number; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  let startDate: Date;
  let periodLabel: string;

  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      periodLabel = 'questa settimana';
      break;
    case 'quarter':
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      periodLabel = 'questo trimestre';
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      periodLabel = "quest'anno";
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = 'questo mese';
  }

  const { data, error } = await supabase
    .from("visits")
    .select("data_visita, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", startDate.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  if (error) throw error;

  const totalAmount = (data ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
  const daysPassed = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const avgDaily = totalAmount / daysPassed;

  return {
    avgDaily: Math.round(avgDaily),
    totalDays: daysPassed,
    totalAmount: Math.round(totalAmount),
    message: `📊 **Media giornaliera ${periodLabel}:** €${Math.round(avgDaily).toLocaleString('it-IT')}\n\n` +
             `📈 Totale: €${totalAmount.toLocaleString('it-IT')} in ${daysPassed} giorni`
  };
}

/**
 * Confronta le vendite del mese corrente con il mese precedente
 */
export async function getMonthComparison(): Promise<{
  currentMonth: number;
  previousMonth: number;
  difference: number;
  percentChange: number;
  message: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Mese corrente
  const { data: currentData } = await supabase
    .from("visits")
    .select("importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", currentMonthStart.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  // Mese precedente
  const { data: previousData } = await supabase
    .from("visits")
    .select("importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", previousMonthStart.toISOString().split('T')[0])
    .lte("data_visita", previousMonthEnd.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  const currentMonth = (currentData ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
  const previousMonth = (previousData ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
  const difference = currentMonth - previousMonth;
  const percentChange = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;

  const trend = difference >= 0 ? '📈' : '📉';
  const sign = difference >= 0 ? '+' : '';

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  return {
    currentMonth,
    previousMonth,
    difference,
    percentChange: Math.round(percentChange * 10) / 10,
    message: `${trend} **Confronto mensile**\n\n` +
             `📅 ${monthNames[now.getMonth()]}: €${currentMonth.toLocaleString('it-IT')}\n` +
             `📅 ${monthNames[now.getMonth() - 1] || 'Dicembre'}: €${previousMonth.toLocaleString('it-IT')}\n\n` +
             `**Variazione:** ${sign}€${Math.abs(difference).toLocaleString('it-IT')} (${sign}${percentChange.toFixed(1)}%)`
  };
}

/**
 * Calcola quanto manca per raggiungere un target
 */
export async function getTargetGap(
  targetAmount?: number,
  period: 'month' | 'quarter' | 'year' = 'month'
): Promise<{ current: number; target: number; gap: number; daysRemaining: number; dailyNeeded: number; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let periodLabel: string;

  switch (period) {
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStart, 1);
      endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
      periodLabel = 'del trimestre';
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      periodLabel = "dell'anno";
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      periodLabel = 'del mese';
  }

  const { data } = await supabase
    .from("visits")
    .select("importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", startDate.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  const current = (data ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
  
  // Se non specificato, usa il target stimato dal ritmo attuale proiettato
  const daysPassed = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const target = targetAmount ?? Math.round((current / daysPassed) * totalDays * 1.2); // +20% come target

  const gap = Math.max(0, target - current);
  const daysRemaining = Math.max(1, totalDays - daysPassed);
  const dailyNeeded = gap / daysRemaining;

  const progress = target > 0 ? (current / target) * 100 : 0;
  const progressBar = getProgressBar(progress);

  return {
    current,
    target,
    gap,
    daysRemaining,
    dailyNeeded: Math.round(dailyNeeded),
    message: `🎯 **Target ${periodLabel}**\n\n` +
             `${progressBar} ${progress.toFixed(0)}%\n\n` +
             `💰 Attuale: €${current.toLocaleString('it-IT')}\n` +
             `🎯 Target: €${target.toLocaleString('it-IT')}\n` +
             `📊 Mancano: €${gap.toLocaleString('it-IT')}\n\n` +
             `⏱️ Giorni rimasti: ${daysRemaining}\n` +
             `📈 Serve: €${Math.round(dailyNeeded).toLocaleString('it-IT')}/giorno`
  };
}

function getProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return '█'.repeat(Math.min(filled, 10)) + '░'.repeat(Math.max(empty, 0));
}

/**
 * Previsione del fatturato annuale basato sul ritmo attuale
 */
export async function getYearlyForecast(): Promise<{
  currentYTD: number;
  projectedYear: number;
  avgMonthly: number;
  message: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const { data } = await supabase
    .from("visits")
    .select("importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", yearStart.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  const currentYTD = (data ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
  const daysPassed = Math.max(1, Math.ceil((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)));
  const daysInYear = 365;

  const projectedYear = Math.round((currentYTD / daysPassed) * daysInYear);
  const avgMonthly = projectedYear / 12;

  return {
    currentYTD,
    projectedYear,
    avgMonthly: Math.round(avgMonthly),
    message: `🔮 **Previsione annuale ${now.getFullYear()}**\n\n` +
             `📊 YTD attuale: €${currentYTD.toLocaleString('it-IT')}\n` +
             `📈 Proiezione fine anno: **€${projectedYear.toLocaleString('it-IT')}**\n` +
             `📅 Media mensile stimata: €${Math.round(avgMonthly).toLocaleString('it-IT')}\n\n` +
             `_Basato sul ritmo degli ultimi ${daysPassed} giorni_`
  };
}

/**
 * Trova il cliente con la crescita maggiore (confronto ultimi 2 mesi)
 */
export async function getGrowthLeader(
  crypto: CryptoLike
): Promise<{ clientName: string; growth: number; currentAmount: number; previousAmount: number; message: string }> {
  assertCrypto(crypto);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Visite mese corrente
  const { data: currentVisits } = await supabase
    .from("visits")
    .select("account_id, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", currentMonthStart.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  // Visite mese precedente
  const { data: previousVisits } = await supabase
    .from("visits")
    .select("account_id, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", previousMonthStart.toISOString().split('T')[0])
    .lte("data_visita", previousMonthEnd.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  // Aggrega per cliente
  const currentByClient = new Map<string, number>();
  const previousByClient = new Map<string, number>();

  for (const v of (currentVisits ?? [])) {
    currentByClient.set(v.account_id, (currentByClient.get(v.account_id) || 0) + (v.importo_vendita || 0));
  }
  for (const v of (previousVisits ?? [])) {
    previousByClient.set(v.account_id, (previousByClient.get(v.account_id) || 0) + (v.importo_vendita || 0));
  }

  // Trova il leader di crescita (solo clienti con almeno €100 il mese scorso)
  let leader = { id: '', growth: -Infinity, current: 0, previous: 0 };

  for (const [clientId, currentAmount] of currentByClient) {
    const previousAmount = previousByClient.get(clientId) || 0;
    if (previousAmount < 100) continue; // Ignora clienti nuovi o troppo piccoli

    const growth = ((currentAmount - previousAmount) / previousAmount) * 100;
    if (growth > leader.growth) {
      leader = { id: clientId, growth, current: currentAmount, previous: previousAmount };
    }
  }

  if (!leader.id) {
    return {
      clientName: '',
      growth: 0,
      currentAmount: 0,
      previousAmount: 0,
      message: "📊 Non ho abbastanza dati per identificare il cliente con la crescita maggiore.\n\nServe almeno un mese di storico con vendite significative."
    };
  }

  // Decifra il nome del cliente
  const { data: account } = await supabase
    .from("accounts")
    .select("id, name, name_enc, name_iv")
    .eq("id", leader.id)
    .single();

  let clientName = `Cliente ${leader.id.slice(0, 8)}`;
  if (account) {
    if (account.name) {
      clientName = account.name;
    } else if (account.name_enc && account.name_iv) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", account.id, account, ["name"]);
        if (dec?.name) clientName = dec.name;
      } catch {}
    }
  }

  return {
    clientName,
    growth: Math.round(leader.growth),
    currentAmount: Math.round(leader.current),
    previousAmount: Math.round(leader.previous),
    message: `🚀 **Cliente in crescita maggiore**\n\n` +
             `👤 **${clientName}**\n` +
             `📈 Crescita: **+${Math.round(leader.growth)}%**\n\n` +
             `💰 Questo mese: €${Math.round(leader.current).toLocaleString('it-IT')}\n` +
             `💰 Mese scorso: €${Math.round(leader.previous).toLocaleString('it-IT')}`
  };
}

/**
 * Conta i nuovi clienti acquisiti in un periodo
 */
export async function getNewClientsCount(
  period: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<{ count: number; periodLabel: string; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  let startDate: Date;
  let periodLabel: string;

  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      periodLabel = 'questa settimana';
      break;
    case 'quarter':
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      periodLabel = 'questo trimestre';
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      periodLabel = "quest'anno";
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = 'questo mese';
  }

  const { count, error } = await supabase
    .from("accounts")
    .select("id", { count: 'exact', head: true })
    .eq("user_id", user.id)
    .gte("created_at", startDate.toISOString());

  if (error) throw error;

  const newCount = count ?? 0;
  
  return {
    count: newCount,
    periodLabel,
    message: `👥 **Nuovi clienti ${periodLabel}:** ${newCount}\n\n` +
             (newCount > 0 
               ? `🎉 Ottimo lavoro di acquisizione!`
               : `💡 È il momento di espandere il portfolio!`)
  };
}

/**
 * Calcola il tasso di conversione visite → vendite
 */
export async function getConversionRate(
  period: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<{ totalVisits: number; visitsWithSales: number; conversionRate: number; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  let startDate: Date;
  let periodLabel: string;

  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      periodLabel = 'questa settimana';
      break;
    case 'quarter':
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      periodLabel = 'questo trimestre';
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      periodLabel = "quest'anno";
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = 'questo mese';
  }

  const { data } = await supabase
    .from("visits")
    .select("id, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", startDate.toISOString().split('T')[0]);

  const visits = data ?? [];
  const totalVisits = visits.length;
  const visitsWithSales = visits.filter(v => v.importo_vendita && v.importo_vendita > 0).length;
  const conversionRate = totalVisits > 0 ? (visitsWithSales / totalVisits) * 100 : 0;

  let assessment = '';
  if (conversionRate >= 80) assessment = '🌟 Eccellente!';
  else if (conversionRate >= 60) assessment = '👍 Buono';
  else if (conversionRate >= 40) assessment = '📊 Nella media';
  else assessment = '💪 Da migliorare';

  return {
    totalVisits,
    visitsWithSales,
    conversionRate: Math.round(conversionRate * 10) / 10,
    message: `📊 **Tasso di conversione ${periodLabel}**\n\n` +
             `🏃 Visite totali: ${totalVisits}\n` +
             `💰 Con vendita: ${visitsWithSales}\n` +
             `📈 **Conversione: ${conversionRate.toFixed(1)}%**\n\n` +
             assessment
  };
}

/**
 * Calcola la frequenza media delle visite per cliente
 */
export async function getVisitFrequency(
  crypto: CryptoLike
): Promise<{ avgDaysBetweenVisits: number; topClientsFrequency: Array<{ name: string; avgDays: number }>; message: string }> {
  assertCrypto(crypto);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  // Ultimi 6 mesi di visite
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: visits } = await supabase
    .from("visits")
    .select("account_id, data_visita")
    .eq("user_id", user.id)
    .gte("data_visita", sixMonthsAgo.toISOString().split('T')[0])
    .order("data_visita", { ascending: true });

  if (!visits || visits.length < 2) {
    return {
      avgDaysBetweenVisits: 0,
      topClientsFrequency: [],
      message: "📊 Non ho abbastanza dati sulle visite per calcolare la frequenza.\n\nServe almeno qualche mese di storico."
    };
  }

  // Raggruppa visite per cliente
  const visitsByClient = new Map<string, Date[]>();
  for (const v of visits) {
    const dates = visitsByClient.get(v.account_id) || [];
    dates.push(new Date(v.data_visita));
    visitsByClient.set(v.account_id, dates);
  }

  // Calcola intervalli medi
  const clientFrequencies: Array<{ id: string; avgDays: number; visitCount: number }> = [];

  for (const [clientId, dates] of visitsByClient) {
    if (dates.length < 2) continue;

    dates.sort((a, b) => a.getTime() - b.getTime());
    let totalDays = 0;
    for (let i = 1; i < dates.length; i++) {
      totalDays += (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
    }
    const avgDays = totalDays / (dates.length - 1);
    clientFrequencies.push({ id: clientId, avgDays, visitCount: dates.length });
  }

  if (clientFrequencies.length === 0) {
    return {
      avgDaysBetweenVisits: 0,
      topClientsFrequency: [],
      message: "📊 I clienti hanno meno di 2 visite ciascuno, non posso calcolare la frequenza."
    };
  }

  // Media generale
  const overallAvg = clientFrequencies.reduce((sum, c) => sum + c.avgDays, 0) / clientFrequencies.length;

  // Top 5 più frequentati
  const topFrequent = clientFrequencies
    .sort((a, b) => a.avgDays - b.avgDays)
    .slice(0, 5);

  // Decifra nomi
  const accountIds = topFrequent.map(c => c.id);
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, name_enc, name_iv")
    .in("id", accountIds);

  const nameMap = new Map<string, string>();
  for (const acc of (accounts ?? [])) {
    let name = `Cliente ${acc.id.slice(0, 8)}`;
    if (acc.name) {
      name = acc.name;
    } else if (acc.name_enc && acc.name_iv) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", acc.id, acc, ["name"]);
        if (dec?.name) name = dec.name;
      } catch {}
    }
    nameMap.set(acc.id, name);
  }

  const topClientsFrequency = topFrequent.map(c => ({
    name: nameMap.get(c.id) || `Cliente ${c.id.slice(0, 8)}`,
    avgDays: Math.round(c.avgDays)
  }));

  return {
    avgDaysBetweenVisits: Math.round(overallAvg),
    topClientsFrequency,
    message: `📊 **Frequenza visite**\n\n` +
             `⏱️ In media visiti lo stesso cliente ogni **${Math.round(overallAvg)} giorni**\n\n` +
             `🏆 **Clienti più frequentati:**\n` +
             topClientsFrequency.map((c, i) => `${i + 1}. ${c.name}: ogni ${c.avgDays}gg`).join('\n')
  };
}

/**
 * Calcola il fatturato per km (usando dati esistenti)
 */
export async function getRevenuePerKmSummary(
  crypto: CryptoLike,
  homeCoords: { lat: number; lon: number },
  period: 'month' | 'quarter' | 'year' = 'month'
): Promise<{ totalRevenue: number; totalKm: number; revenuePerKm: number; message: string }> {
  assertCrypto(crypto);
  
  // Mappa quarter → month per le funzioni esistenti
  const mappedPeriod: 'today' | 'week' | 'month' | 'year' = period === 'quarter' ? 'month' : period;
  
  // Usa le funzioni esistenti
  const kmResult = await getKmTraveledInPeriod(crypto, homeCoords, mappedPeriod);
  const salesResult = await getSalesSummary(mappedPeriod);

  const totalRevenue = salesResult.totalAmount;
  const totalKm = kmResult.totalKm;
  const revenuePerKm = totalKm > 0 ? totalRevenue / totalKm : 0;

  return {
    totalRevenue,
    totalKm,
    revenuePerKm: Math.round(revenuePerKm * 100) / 100,
    message: `💰 **Rendimento per km** (${period === 'month' ? 'questo mese' : period === 'quarter' ? 'questo trimestre' : "quest'anno"})\n\n` +
             `📊 Fatturato: €${totalRevenue.toLocaleString('it-IT')}\n` +
             `🚗 Km percorsi: ~${totalKm} km\n\n` +
             `💵 **€${revenuePerKm.toFixed(2)}/km**\n\n` +
             (revenuePerKm > 10 ? '🌟 Ottima efficienza!' : revenuePerKm > 5 ? '👍 Buona efficienza' : '💡 Valuta di ottimizzare i percorsi')
  };
}

// ═══════════════════════════════════════════════════════════════
// 🆕 FASE 2: INFERENZE STRATEGICHE
// ═══════════════════════════════════════════════════════════════

/**
 * Identifica i clienti prioritari da visitare basandosi su:
 * - Tempo dall'ultima visita
 * - Fatturato generato
 * - Frequenza abituale di acquisto
 */
export async function getVisitPriorities(
  crypto: CryptoLike
): Promise<{ priorities: Array<{ name: string; reason: string; urgency: 'alta' | 'media' | 'bassa' }>; message: string }> {
  assertCrypto(crypto);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setDate(now.getDate() - 30);

  // Carica ultime visite per cliente
  const { data: visits } = await supabase
    .from("visits")
    .select("account_id, data_visita, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", oneMonthAgo.toISOString().split('T')[0])
    .order("data_visita", { ascending: false });

  // Carica clienti
  const { data: clients } = await supabase
    .from("accounts")
    .select("id, name, name_enc, name_iv")
    .eq("user_id", user.id);

  if (!clients || clients.length === 0) {
    return { priorities: [], message: "📊 Non ho abbastanza dati sui clienti." };
  }

  // Raggruppa visite per cliente
  const clientVisits = new Map<string, { lastVisit: Date; totalRevenue: number; visitCount: number }>();
  for (const v of (visits ?? [])) {
    const existing = clientVisits.get(v.account_id) || { lastVisit: new Date(0), totalRevenue: 0, visitCount: 0 };
    const visitDate = new Date(v.data_visita);
    if (visitDate > existing.lastVisit) existing.lastVisit = visitDate;
    existing.totalRevenue += v.importo_vendita || 0;
    existing.visitCount++;
    clientVisits.set(v.account_id, existing);
  }

  // Calcola priorità
  const priorities: Array<{ id: string; name: string; reason: string; urgency: 'alta' | 'media' | 'bassa'; score: number }> = [];

  for (const client of clients) {
    const stats = clientVisits.get(client.id);
    let urgency: 'alta' | 'media' | 'bassa' = 'bassa';
    let reason = '';
    let score = 0;

    if (!stats) {
      // Mai visitato
      urgency = 'media';
      reason = 'Mai visitato';
      score = 50;
    } else {
      const daysSinceVisit = Math.floor((now.getTime() - stats.lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      const avgRevenue = stats.totalRevenue / stats.visitCount;

      if (daysSinceVisit > 14 && avgRevenue > 200) {
        urgency = 'alta';
        reason = `Non visto da ${daysSinceVisit}gg, alto fatturato (€${Math.round(avgRevenue)}/visita)`;
        score = 100;
      } else if (daysSinceVisit > 21) {
        urgency = 'alta';
        reason = `Non visto da ${daysSinceVisit} giorni`;
        score = 90;
      } else if (daysSinceVisit > 14) {
        urgency = 'media';
        reason = `${daysSinceVisit} giorni dall'ultima visita`;
        score = 60;
      } else if (avgRevenue > 500) {
        urgency = 'media';
        reason = `Cliente premium (€${Math.round(avgRevenue)}/visita)`;
        score = 70;
      }
    }

    if (score > 0) {
      // Decifra nome
      let name = `Cliente ${client.id.slice(0, 8)}`;
      if (client.name) {
        name = client.name;
      } else if (client.name_enc && client.name_iv) {
        try {
          const dec = await crypto.decryptFields("table:accounts", "accounts", client.id, client, ["name"]);
          if (dec?.name) name = dec.name;
        } catch {}
      }
      priorities.push({ id: client.id, name, reason, urgency, score });
    }
  }

  // Ordina per score decrescente
  priorities.sort((a, b) => b.score - a.score);
  const top5 = priorities.slice(0, 5);

  const urgencyEmoji = { alta: '🔴', media: '🟡', bassa: '🟢' };
  const message = `🎯 **Clienti prioritari da visitare**\n\n` +
    top5.map((p, i) => `${i + 1}. ${urgencyEmoji[p.urgency]} **${p.name}**\n   _${p.reason}_`).join('\n\n') +
    (top5.length === 0 ? "✅ Tutti i clienti sono stati visitati di recente!" : "");

  return { priorities: top5, message };
}

/**
 * Identifica clienti a rischio churn
 */
export async function getChurnRiskClients(
  crypto: CryptoLike
): Promise<{ atRisk: Array<{ name: string; reason: string; riskLevel: 'alto' | 'medio' }>; message: string }> {
  assertCrypto(crypto);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(now.getMonth() - 2);

  // Visite degli ultimi 3 mesi
  const { data: visits } = await supabase
    .from("visits")
    .select("account_id, data_visita, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", threeMonthsAgo.toISOString().split('T')[0])
    .order("data_visita", { ascending: true });

  // Clienti
  const { data: clients } = await supabase
    .from("accounts")
    .select("id, name, name_enc, name_iv")
    .eq("user_id", user.id);

  if (!clients || !visits) {
    return { atRisk: [], message: "📊 Non ho abbastanza dati per l'analisi churn." };
  }

  // Analizza trend per cliente
  const clientTrends = new Map<string, { 
    month1Revenue: number; 
    month2Revenue: number; 
    month3Revenue: number; 
    lastVisit: Date;
  }>();

  for (const v of visits) {
    const existing = clientTrends.get(v.account_id) || {
      month1Revenue: 0, month2Revenue: 0, month3Revenue: 0, lastVisit: new Date(0)
    };
    const visitDate = new Date(v.data_visita);
    const monthsAgo = Math.floor((now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (monthsAgo < 1) existing.month1Revenue += v.importo_vendita || 0;
    else if (monthsAgo < 2) existing.month2Revenue += v.importo_vendita || 0;
    else existing.month3Revenue += v.importo_vendita || 0;
    
    if (visitDate > existing.lastVisit) existing.lastVisit = visitDate;
    clientTrends.set(v.account_id, existing);
  }

  // Identifica rischi
  const atRisk: Array<{ id: string; name: string; reason: string; riskLevel: 'alto' | 'medio'; score: number }> = [];

  for (const client of clients) {
    const trend = clientTrends.get(client.id);
    if (!trend) continue;

    const daysSinceVisit = Math.floor((now.getTime() - trend.lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    const revenueDecline = trend.month3Revenue > 0 ? 
      ((trend.month3Revenue - trend.month1Revenue) / trend.month3Revenue) * 100 : 0;

    let riskLevel: 'alto' | 'medio' | null = null;
    let reason = '';
    let score = 0;

    // Clienti che non comprano più
    if (trend.month1Revenue === 0 && (trend.month2Revenue > 0 || trend.month3Revenue > 0)) {
      riskLevel = 'alto';
      reason = `Nessun ordine questo mese (prima: €${Math.round(trend.month2Revenue + trend.month3Revenue)}/2mesi)`;
      score = 100;
    }
    // Calo significativo
    else if (revenueDecline > 50 && trend.month3Revenue > 200) {
      riskLevel = 'alto';
      reason = `Calo del ${Math.round(Math.abs(revenueDecline))}% rispetto a 3 mesi fa`;
      score = 90;
    }
    // Non visitato da tempo ma era attivo
    else if (daysSinceVisit > 30 && trend.month3Revenue > 100) {
      riskLevel = 'medio';
      reason = `Non visto da ${daysSinceVisit} giorni`;
      score = 60;
    }
    // Calo moderato
    else if (revenueDecline > 30) {
      riskLevel = 'medio';
      reason = `Fatturato in calo del ${Math.round(Math.abs(revenueDecline))}%`;
      score = 50;
    }

    if (riskLevel) {
      let name = `Cliente ${client.id.slice(0, 8)}`;
      if (client.name) {
        name = client.name;
      } else if (client.name_enc && client.name_iv) {
        try {
          const dec = await crypto.decryptFields("table:accounts", "accounts", client.id, client, ["name"]);
          if (dec?.name) name = dec.name;
        } catch {}
      }
      atRisk.push({ id: client.id, name, reason, riskLevel, score });
    }
  }

  atRisk.sort((a, b) => b.score - a.score);
  const top5 = atRisk.slice(0, 5);

  const riskEmoji = { alto: '🔴', medio: '🟡' };
  const message = `⚠️ **Clienti a rischio**\n\n` +
    (top5.length > 0 
      ? top5.map((r, i) => `${i + 1}. ${riskEmoji[r.riskLevel]} **${r.name}**\n   _${r.reason}_`).join('\n\n')
      : "✅ Nessun cliente a rischio identificato! Ottimo lavoro!");

  return { atRisk: top5, message };
}

/**
 * Suggerimenti per aumentare il fatturato
 */
export async function getRevenueFocusSuggestions(): Promise<{ suggestions: string[]; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Dati mese corrente
  const { data: currentVisits } = await supabase
    .from("visits")
    .select("account_id, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", monthStart.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  // Dati mese scorso
  const { data: lastVisits } = await supabase
    .from("visits")
    .select("account_id, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", lastMonthStart.toISOString().split('T')[0])
    .lte("data_visita", lastMonthEnd.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  // Analisi
  const currentTotal = (currentVisits ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
  const lastTotal = (lastVisits ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
  const currentClients = new Set((currentVisits ?? []).map(v => v.account_id)).size;
  const lastClients = new Set((lastVisits ?? []).map(v => v.account_id)).size;
  const currentAvg = currentVisits && currentVisits.length > 0 ? currentTotal / currentVisits.length : 0;

  const suggestions: string[] = [];

  // Suggerimenti basati sui dati
  if (currentClients < lastClients) {
    suggestions.push(`🎯 **Riattiva i clienti dormienti** - Questo mese hai visitato ${lastClients - currentClients} clienti in meno`);
  }

  if (currentAvg < 200) {
    suggestions.push(`💰 **Aumenta l'ordine medio** - Attualmente €${Math.round(currentAvg)}/visita. Prova upselling e bundle`);
  }

  if (currentVisits && currentVisits.length < 20) {
    suggestions.push(`📍 **Aumenta le visite** - Solo ${currentVisits.length} visite questo mese. Punta a 5+ visite/giorno`);
  }

  suggestions.push(`🏆 **Punta ai clienti top** - Concentrati sui clienti con ordine medio più alto`);
  suggestions.push(`📦 **Cross-selling** - Proponi prodotti complementari ai clienti esistenti`);

  const message = `💡 **Come aumentare il fatturato**\n\n` +
    suggestions.join('\n\n') +
    `\n\n📊 _Attuale: €${currentTotal.toLocaleString('it-IT')} questo mese_`;

  return { suggestions, message };
}

/**
 * Identifica prodotti da spingere
 */
export async function getProductFocusSuggestions(): Promise<{ products: Array<{ name: string; reason: string }>; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  // Nota: questa funzione assume che ci sia una tabella prodotti o info nei dettagli visita
  // Per ora restituiamo suggerimenti generici basati sulla struttura dati disponibile
  
  const suggestions = [
    { name: "Prodotti premium", reason: "Margine più alto, clienti top li apprezzano" },
    { name: "Novità stagionali", reason: "Creano curiosità e ordini di prova" },
    { name: "Bundle/Kit", reason: "Aumentano l'ordine medio del 20-30%" },
    { name: "Esclusivi zona", reason: "Differenziano dalla concorrenza" },
  ];

  const message = `📦 **Prodotti su cui puntare**\n\n` +
    suggestions.map((p, i) => `${i + 1}. **${p.name}**\n   _${p.reason}_`).join('\n\n') +
    `\n\n💡 _Chiedi "Chi compra [prodotto]?" per vedere i clienti target_`;

  return { products: suggestions, message };
}

/**
 * Profilo del cliente ideale basato sui top performer
 */
export async function getIdealCustomerProfile(
  crypto: CryptoLike
): Promise<{ profile: Record<string, string>; message: string }> {
  assertCrypto(crypto);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Top clienti per fatturato
  const { data: visits } = await supabase
    .from("visits")
    .select("account_id, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", sixMonthsAgo.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  if (!visits || visits.length === 0) {
    return {
      profile: {},
      message: "📊 Non ho abbastanza dati per creare il profilo cliente ideale."
    };
  }

  // Aggrega per cliente
  const clientRevenue = new Map<string, number>();
  for (const v of visits) {
    clientRevenue.set(v.account_id, (clientRevenue.get(v.account_id) || 0) + (v.importo_vendita || 0));
  }

  // Top 10 clienti
  const topClientIds = Array.from(clientRevenue.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  // Carica dettagli
  const { data: topClients } = await supabase
    .from("accounts")
    .select("id, type, city, provincia")
    .in("id", topClientIds);

  // Analizza caratteristiche comuni
  const types = new Map<string, number>();
  const cities = new Map<string, number>();

  for (const client of (topClients ?? [])) {
    if (client.type) types.set(client.type, (types.get(client.type) || 0) + 1);
    if (client.city) cities.set(client.city, (cities.get(client.city) || 0) + 1);
  }

  const topType = Array.from(types.entries()).sort((a, b) => b[1] - a[1])[0];
  const topCity = Array.from(cities.entries()).sort((a, b) => b[1] - a[1])[0];
  const avgRevenue = Array.from(clientRevenue.values())
    .filter(r => topClientIds.includes)
    .reduce((sum, r) => sum + r, 0) / topClientIds.length;

  const profile = {
    tipo: topType?.[0] ?? "Vario",
    zona: topCity?.[0] ?? "Varia",
    fatturato_medio: `€${Math.round(avgRevenue / 6).toLocaleString('it-IT')}/mese`,
    frequenza: "Ordina 2-3 volte al mese",
  };

  const message = `👤 **Il tuo cliente ideale**\n\n` +
    `🏪 **Tipo:** ${profile.tipo}\n` +
    `📍 **Zona:** ${profile.zona}\n` +
    `💰 **Fatturato:** ${profile.fatturato_medio}\n` +
    `📅 **Frequenza:** ${profile.frequenza}\n\n` +
    `💡 _Cerca clienti con queste caratteristiche per espandere il portfolio!_`;

  return { profile, message };
}

/**
 * Identifica opportunità perse
 */
export async function getLostOpportunities(
  crypto: CryptoLike
): Promise<{ opportunities: Array<{ type: string; description: string }>; message: string }> {
  assertCrypto(crypto);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Clienti totali
  const { count: totalClients } = await supabase
    .from("accounts")
    .select("id", { count: 'exact', head: true })
    .eq("user_id", user.id);

  // Clienti visitati questo mese
  const { data: monthVisits } = await supabase
    .from("visits")
    .select("account_id")
    .eq("user_id", user.id)
    .gte("data_visita", monthStart.toISOString().split('T')[0]);

  const visitedThisMonth = new Set((monthVisits ?? []).map(v => v.account_id)).size;
  const notVisited = (totalClients ?? 0) - visitedThisMonth;

  // Visite senza vendita
  const { data: visitsNoSale } = await supabase
    .from("visits")
    .select("id")
    .eq("user_id", user.id)
    .gte("data_visita", monthStart.toISOString().split('T')[0])
    .or("importo_vendita.is.null,importo_vendita.eq.0");

  const noSaleCount = visitsNoSale?.length ?? 0;
  const totalVisits = monthVisits?.length ?? 0;

  const opportunities: Array<{ type: string; description: string }> = [];

  if (notVisited > 10) {
    opportunities.push({
      type: "Clienti non visitati",
      description: `${notVisited} clienti non visitati questo mese (su ${totalClients})`
    });
  }

  if (noSaleCount > 5 && totalVisits > 0) {
    const noSalePercent = Math.round((noSaleCount / totalVisits) * 100);
    opportunities.push({
      type: "Visite senza vendita",
      description: `${noSaleCount} visite senza ordine (${noSalePercent}% del totale)`
    });
  }

  opportunities.push({
    type: "Cross-selling",
    description: "Proponi prodotti complementari ai clienti esistenti"
  });

  const message = `🎯 **Opportunità che stai perdendo**\n\n` +
    opportunities.map((o, i) => `${i + 1}. **${o.type}**\n   _${o.description}_`).join('\n\n') +
    `\n\n💡 _Focus su queste aree per aumentare il fatturato!_`;

  return { opportunities, message };
}

/**
 * Clienti con potenziale di crescita
 */
export async function getGrowthPotentialClients(
  crypto: CryptoLike
): Promise<{ clients: Array<{ name: string; currentRevenue: number; potential: string }>; message: string }> {
  assertCrypto(crypto);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // Visite ultimi 3 mesi
  const { data: visits } = await supabase
    .from("visits")
    .select("account_id, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", threeMonthsAgo.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  if (!visits) {
    return { clients: [], message: "📊 Non ho abbastanza dati." };
  }

  // Aggrega per cliente
  const clientRevenue = new Map<string, number>();
  const clientVisits = new Map<string, number>();
  for (const v of visits) {
    clientRevenue.set(v.account_id, (clientRevenue.get(v.account_id) || 0) + (v.importo_vendita || 0));
    clientVisits.set(v.account_id, (clientVisits.get(v.account_id) || 0) + 1);
  }

  // Trova clienti "piccoli" ma attivi
  const potentialClients: Array<{ id: string; revenue: number; avgOrder: number }> = [];
  
  for (const [id, revenue] of clientRevenue) {
    const visitCount = clientVisits.get(id) || 1;
    const avgOrder = revenue / visitCount;
    
    // Clienti con basso fatturato ma buona frequenza
    if (revenue < 500 && revenue > 100 && visitCount >= 2) {
      potentialClients.push({ id, revenue, avgOrder });
    }
  }

  // Ordina per frequenza (più visite = più potenziale)
  potentialClients.sort((a, b) => clientVisits.get(b.id)! - clientVisits.get(a.id)!);

  // Carica nomi
  const clientIds = potentialClients.slice(0, 5).map(c => c.id);
  const { data: clientsData } = await supabase
    .from("accounts")
    .select("id, name, name_enc, name_iv")
    .in("id", clientIds);

  const nameMap = new Map<string, string>();
  for (const client of (clientsData ?? [])) {
    let name = `Cliente ${client.id.slice(0, 8)}`;
    if (client.name) {
      name = client.name;
    } else if (client.name_enc && client.name_iv) {
      try {
        const dec = await crypto.decryptFields("table:accounts", "accounts", client.id, client, ["name"]);
        if (dec?.name) name = dec.name;
      } catch {}
    }
    nameMap.set(client.id, name);
  }

  const result = potentialClients.slice(0, 5).map(c => ({
    name: nameMap.get(c.id) || `Cliente ${c.id.slice(0, 8)}`,
    currentRevenue: Math.round(c.revenue),
    potential: `Ordina spesso (€${Math.round(c.avgOrder)}/visita) ma poco volume`
  }));

  const message = `🌱 **Clienti con potenziale di crescita**\n\n` +
    (result.length > 0
      ? result.map((c, i) => `${i + 1}. **${c.name}** - €${c.currentRevenue.toLocaleString('it-IT')}/3mesi\n   _${c.potential}_`).join('\n\n')
      : "✅ Tutti i clienti attivi stanno già performando bene!") +
    `\n\n💡 _Proponi bundle e ordini più grandi a questi clienti_`;

  return { clients: result, message };
}

/**
 * Piano d'azione per raggiungere un target
 */
export async function getActionPlan(
  targetAmount?: number
): Promise<{ actions: string[]; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Fatturato attuale
  const { data: currentVisits } = await supabase
    .from("visits")
    .select("importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", monthStart.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  const currentRevenue = (currentVisits ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
  const daysLeft = Math.max(1, monthEnd.getDate() - now.getDate());
  
  // Se non specificato, target = currentRevenue * 1.5
  const target = targetAmount ?? Math.round(currentRevenue * 1.5);
  const gap = Math.max(0, target - currentRevenue);
  const dailyTarget = gap / daysLeft;

  const avgVisits = (currentVisits ?? []).length / Math.max(1, now.getDate() - monthStart.getDate());
  const avgOrder = currentRevenue / Math.max(1, (currentVisits ?? []).length);

  const actions: string[] = [];

  if (gap > 0) {
    actions.push(`📊 **Obiettivo:** €${target.toLocaleString('it-IT')} (-€${gap.toLocaleString('it-IT')} = €${dailyTarget.toFixed(0)}/giorno)`);
    
    // Calcola cosa serve
    const extraVisits = Math.ceil(gap / avgOrder) - Math.ceil(avgVisits * daysLeft);
    if (extraVisits > 0) {
      actions.push(`📍 **Visite extra:** +${extraVisits} visite in ${daysLeft} giorni`);
    }

    const orderIncreaseNeeded = (gap / (avgVisits * daysLeft)) - avgOrder;
    if (orderIncreaseNeeded > 0) {
      actions.push(`💰 **Ordine medio:** aumenta da €${Math.round(avgOrder)} a €${Math.round(avgOrder + orderIncreaseNeeded)}`);
    }

    actions.push(`🎯 **Focus:** clienti top che non hai ancora visitato questo mese`);
    actions.push(`📦 **Upselling:** proponi prodotti complementari a ogni visita`);
  } else {
    actions.push(`🎉 **Sei già al target!** €${currentRevenue.toLocaleString('it-IT')} / €${target.toLocaleString('it-IT')}`);
    actions.push(`🚀 Punta a superare del 20%: €${Math.round(target * 1.2).toLocaleString('it-IT')}`);
  }

  const message = `📋 **Piano d'azione**\n\n` + actions.join('\n\n');

  return { actions, message };
}

/**
 * Momento migliore per visitare un tipo di locale
 */
export async function getBestTimeForLocaleType(
  localeType: string
): Promise<{ bestDays: string[]; bestHours: string; message: string }> {
  // Dati basati su best practices HoReCa
  const typeData: Record<string, { days: string[]; hours: string; tip: string }> = {
    bar: {
      days: ['Martedì', 'Mercoledì', 'Giovedì'],
      hours: '10:00-11:30 o 15:00-16:30',
      tip: 'Evita il rush della colazione e dell\'aperitivo'
    },
    ristorante: {
      days: ['Martedì', 'Mercoledì', 'Giovedì'],
      hours: '10:00-11:30 o 15:00-17:00',
      tip: 'Mai durante il servizio pranzo/cena'
    },
    ristoranti: {
      days: ['Martedì', 'Mercoledì', 'Giovedì'],
      hours: '10:00-11:30 o 15:00-17:00',
      tip: 'Mai durante il servizio pranzo/cena'
    },
    hotel: {
      days: ['Lunedì', 'Martedì', 'Mercoledì'],
      hours: '10:00-12:00',
      tip: 'Dopo il check-out, prima del check-in'
    },
    pizzeria: {
      days: ['Martedì', 'Mercoledì'],
      hours: '15:00-17:00',
      tip: 'Il pomeriggio prima dell\'apertura serale'
    },
    pub: {
      days: ['Martedì', 'Mercoledì', 'Giovedì'],
      hours: '14:00-17:00',
      tip: 'Prima dell\'apertura serale'
    },
    enoteca: {
      days: ['Martedì', 'Mercoledì', 'Giovedì'],
      hours: '10:00-12:00 o 15:00-17:00',
      tip: 'Evita il weekend quando sono più affollati'
    },
  };

  const normalizedType = localeType.toLowerCase().replace(/[ie]$/, '');
  const data = typeData[normalizedType] || typeData[localeType.toLowerCase()] || {
    days: ['Martedì', 'Mercoledì', 'Giovedì'],
    hours: '10:00-12:00 o 15:00-17:00',
    tip: 'Evita gli orari di punta'
  };

  const message = `🕐 **Miglior momento per visitare ${localeType}**\n\n` +
    `📅 **Giorni:** ${data.days.join(', ')}\n` +
    `⏰ **Orari:** ${data.hours}\n\n` +
    `💡 _${data.tip}_`;

  return { bestDays: data.days, bestHours: data.hours, message };
}

// ═══════════════════════════════════════════════════════════════
// 🆕 FASE 3: VISUALIZZAZIONI E TREND
// ═══════════════════════════════════════════════════════════════

/**
 * Helper per creare barre ASCII
 */
function createAsciiBar(value: number, maxValue: number, width: number = 10): string {
  const filled = Math.round((value / maxValue) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Trend vendite ultimi N mesi
 */
export async function getSalesTrend(
  months: number = 6
): Promise<{ trend: Array<{ month: string; amount: number }>; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const trend: Array<{ month: string; amount: number; year: number; monthNum: number }> = [];
  const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  for (let i = months - 1; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const { data } = await supabase
      .from("visits")
      .select("importo_vendita")
      .eq("user_id", user.id)
      .gte("data_visita", monthStart.toISOString().split('T')[0])
      .lte("data_visita", monthEnd.toISOString().split('T')[0])
      .not("importo_vendita", "is", null);

    const amount = (data ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
    trend.push({ 
      month: monthNames[targetDate.getMonth()], 
      amount,
      year: targetDate.getFullYear(),
      monthNum: targetDate.getMonth()
    });
  }

  const maxAmount = Math.max(...trend.map(t => t.amount), 1);
  const avgAmount = trend.reduce((sum, t) => sum + t.amount, 0) / trend.length;

  // Calcola trend (crescita/decrescita)
  const firstHalf = trend.slice(0, Math.floor(trend.length / 2)).reduce((s, t) => s + t.amount, 0);
  const secondHalf = trend.slice(Math.floor(trend.length / 2)).reduce((s, t) => s + t.amount, 0);
  const trendDirection = secondHalf > firstHalf ? '📈' : secondHalf < firstHalf ? '📉' : '➡️';

  const message = `${trendDirection} **Trend vendite (ultimi ${months} mesi)**\n\n` +
    trend.map(t => 
      `${t.month}: ${createAsciiBar(t.amount, maxAmount, 8)} €${t.amount.toLocaleString('it-IT')}`
    ).join('\n') +
    `\n\n📊 Media: €${Math.round(avgAmount).toLocaleString('it-IT')}/mese`;

  return { trend, message };
}

/**
 * Confronto Year-over-Year
 */
export async function getYoYComparison(): Promise<{ 
  currentYear: number; 
  lastYear: number; 
  change: number; 
  message: string 
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const currentYearStart = new Date(now.getFullYear(), 0, 1);
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const lastYearSameDay = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  // Quest'anno fino ad oggi
  const { data: currentData } = await supabase
    .from("visits")
    .select("importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", currentYearStart.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  // Anno scorso stesso periodo
  const { data: lastData } = await supabase
    .from("visits")
    .select("importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", lastYearStart.toISOString().split('T')[0])
    .lte("data_visita", lastYearSameDay.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  const currentYear = (currentData ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
  const lastYear = (lastData ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
  const change = lastYear > 0 ? ((currentYear - lastYear) / lastYear) * 100 : 0;

  const trend = change >= 0 ? '📈' : '📉';
  const sign = change >= 0 ? '+' : '';

  const message = `${trend} **Confronto con anno scorso**\n\n` +
    `📅 **${now.getFullYear()} (YTD):** €${currentYear.toLocaleString('it-IT')}\n` +
    `📅 **${now.getFullYear() - 1} (stesso periodo):** €${lastYear.toLocaleString('it-IT')}\n\n` +
    `**Variazione:** ${sign}${change.toFixed(1)}%\n\n` +
    (change >= 10 ? '🎉 Ottima crescita!' : change >= 0 ? '👍 In linea' : '💪 C\'è margine di miglioramento');

  return { currentYear, lastYear, change, message };
}

/**
 * Distribuzione vendite per giorno della settimana
 * Nota: getSalesByDayOfWeek già esiste, usiamo quella con output migliorato
 */
export async function getSalesByWeekdayChart(): Promise<{ 
  distribution: Array<{ day: string; amount: number; percent: number }>; 
  message: string 
}> {
  // Riusa la funzione esistente
  const result = await getSalesByDayOfWeek();
  const byDay = result.byDay;
  
  const total = byDay.reduce((sum, d) => sum + d.totalRevenue, 0);
  const maxAmount = Math.max(...byDay.map(d => d.totalRevenue), 1);

  const distribution = byDay.map(d => ({
    day: d.day,
    amount: d.totalRevenue,
    percent: total > 0 ? (d.totalRevenue / total) * 100 : 0
  }));

  const bestDay = distribution.reduce((best, d) => d.amount > best.amount ? d : best, distribution[0]);

  const message = `📊 **Vendite per giorno della settimana**\n\n` +
    distribution.map(d => 
      `${d.day.slice(0, 3)}: ${createAsciiBar(d.amount, maxAmount, 8)} €${d.amount.toLocaleString('it-IT')} (${d.percent.toFixed(0)}%)`
    ).join('\n') +
    `\n\n🏆 Giorno migliore: **${bestDay.day}**`;

  return { distribution, message };
}

/**
 * Vendite per città
 */
export async function getSalesByCityChart(
  crypto: CryptoLike
): Promise<{
  cities: Array<{ city: string; amount: number }>;
  message: string;
}> {
  assertCrypto(crypto);
  // Riusa la funzione esistente
  const result = await getSalesByCity(crypto, 'month');
  const byCity = result.byCity;
  
  const maxAmount = byCity.length > 0 ? Math.max(...byCity.map(c => c.totalRevenue)) : 1;

  const message = `🗺️ **Classifica città per fatturato**\n\n` +
    (byCity.length > 0
      ? byCity.slice(0, 10).map((c, i) => 
          `${i + 1}. ${c.city}: ${createAsciiBar(c.totalRevenue, maxAmount, 8)} €${c.totalRevenue.toLocaleString('it-IT')}`
        ).join('\n')
      : "Nessun dato sulle città") +
    (byCity.length > 10 ? `\n\n_...e altre ${byCity.length - 10} città_` : '');

  return { 
    cities: byCity.map(c => ({ city: c.city, amount: c.totalRevenue })), 
    message 
  };
}

/**
 * Visite per tipo locale
 */
export async function getVisitsByTypeChart(): Promise<{
  types: Array<{ type: string; count: number; percent: number }>;
  message: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Visite con tipo cliente
  const { data: visits } = await supabase
    .from("visits")
    .select("account_id")
    .eq("user_id", user.id)
    .gte("data_visita", sixMonthsAgo.toISOString().split('T')[0]);

  if (!visits || visits.length === 0) {
    return { types: [], message: "📊 Non hai abbastanza visite per questa analisi." };
  }

  // Carica tipi clienti
  const accountIds = [...new Set(visits.map(v => v.account_id))];
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, type")
    .in("id", accountIds);

  // Conta per tipo
  const typeCount = new Map<string, number>();
  const accountTypes = new Map((accounts ?? []).map(a => [a.id, a.type || 'Non specificato']));

  for (const visit of visits) {
    const type = accountTypes.get(visit.account_id) || 'Non specificato';
    typeCount.set(type, (typeCount.get(type) || 0) + 1);
  }

  const total = visits.length;
  const types = Array.from(typeCount.entries())
    .map(([type, count]) => ({ type, count, percent: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);

  const maxCount = types.length > 0 ? types[0].count : 1;

  const message = `🏪 **Visite per tipo locale** (ultimi 6 mesi)\n\n` +
    types.slice(0, 8).map(t => 
      `${t.type}: ${createAsciiBar(t.count, maxCount, 8)} ${t.count} (${t.percent.toFixed(0)}%)`
    ).join('\n') +
    `\n\n📊 Totale visite: ${total}`;

  return { types, message };
}

/**
 * Andamento ordine medio nel tempo
 */
export async function getAvgOrderTrend(
  months: number = 6
): Promise<{ trend: Array<{ month: string; avgOrder: number }>; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const trend: Array<{ month: string; avgOrder: number }> = [];
  const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  for (let i = months - 1; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const { data } = await supabase
      .from("visits")
      .select("importo_vendita")
      .eq("user_id", user.id)
      .gte("data_visita", monthStart.toISOString().split('T')[0])
      .lte("data_visita", monthEnd.toISOString().split('T')[0])
      .not("importo_vendita", "is", null)
      .gt("importo_vendita", 0);

    const total = (data ?? []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
    const avgOrder = data && data.length > 0 ? total / data.length : 0;
    
    trend.push({ month: monthNames[targetDate.getMonth()], avgOrder: Math.round(avgOrder) });
  }

  const maxAvg = Math.max(...trend.map(t => t.avgOrder), 1);
  const currentAvg = trend[trend.length - 1]?.avgOrder || 0;
  const firstAvg = trend[0]?.avgOrder || 0;
  const trendDirection = currentAvg > firstAvg ? '📈' : currentAvg < firstAvg ? '📉' : '➡️';

  const message = `${trendDirection} **Andamento ordine medio**\n\n` +
    trend.map(t => 
      `${t.month}: ${createAsciiBar(t.avgOrder, maxAvg, 8)} €${t.avgOrder.toLocaleString('it-IT')}`
    ).join('\n') +
    `\n\n💡 Attuale: €${currentAvg.toLocaleString('it-IT')}/ordine`;

  return { trend, message };
}

/**
 * Distribuzione clienti per fascia di fatturato
 */
export async function getClientsByRevenueBand(
  crypto: CryptoLike
): Promise<{ bands: Array<{ band: string; count: number }>; message: string }> {
  assertCrypto(crypto);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Fatturato per cliente
  const { data: visits } = await supabase
    .from("visits")
    .select("account_id, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", sixMonthsAgo.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  if (!visits) {
    return { bands: [], message: "📊 Non ho dati sufficienti." };
  }

  // Aggrega per cliente
  const clientRevenue = new Map<string, number>();
  for (const v of visits) {
    clientRevenue.set(v.account_id, (clientRevenue.get(v.account_id) || 0) + (v.importo_vendita || 0));
  }

  // Definisci fasce
  const bands = [
    { band: '€0-100', min: 0, max: 100, count: 0 },
    { band: '€100-500', min: 100, max: 500, count: 0 },
    { band: '€500-1K', min: 500, max: 1000, count: 0 },
    { band: '€1K-5K', min: 1000, max: 5000, count: 0 },
    { band: '€5K+', min: 5000, max: Infinity, count: 0 },
  ];

  for (const revenue of clientRevenue.values()) {
    for (const band of bands) {
      if (revenue >= band.min && revenue < band.max) {
        band.count++;
        break;
      }
    }
  }

  const maxCount = Math.max(...bands.map(b => b.count), 1);
  const total = bands.reduce((sum, b) => sum + b.count, 0);

  const message = `💰 **Clienti per fascia di fatturato** (6 mesi)\n\n` +
    bands.map(b => 
      `${b.band}: ${createAsciiBar(b.count, maxCount, 8)} ${b.count} clienti`
    ).join('\n') +
    `\n\n📊 Totale: ${total} clienti attivi`;

  return { bands: bands.map(b => ({ band: b.band, count: b.count })), message };
}

/**
 * Stagionalità delle vendite
 */
export async function getSeasonality(): Promise<{
  months: Array<{ month: string; avgRevenue: number }>;
  message: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const { data } = await supabase
    .from("visits")
    .select("data_visita, importo_vendita")
    .eq("user_id", user.id)
    .gte("data_visita", twoYearsAgo.toISOString().split('T')[0])
    .not("importo_vendita", "is", null);

  if (!data || data.length === 0) {
    return { months: [], message: "📊 Non ho abbastanza storico per l'analisi stagionalità." };
  }

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  
  // Aggrega per mese
  const monthData: Array<{ total: number; count: number }> = Array(12).fill(null).map(() => ({ total: 0, count: 0 }));

  for (const v of data) {
    const month = new Date(v.data_visita).getMonth();
    monthData[month].total += v.importo_vendita || 0;
    monthData[month].count++;
  }

  const months = monthData.map((d, i) => ({
    month: monthNames[i],
    avgRevenue: d.count > 0 ? Math.round(d.total / Math.ceil(d.count / 12)) : 0 // Media per anno
  }));

  const maxRevenue = Math.max(...months.map(m => m.avgRevenue), 1);
  const bestMonth = months.reduce((best, m) => m.avgRevenue > best.avgRevenue ? m : best, months[0]);
  const worstMonth = months.reduce((worst, m) => m.avgRevenue < worst.avgRevenue && m.avgRevenue > 0 ? m : worst, months[0]);

  const message = `📅 **Stagionalità vendite** (media per mese)\n\n` +
    months.map(m => 
      `${m.month.slice(0, 3)}: ${createAsciiBar(m.avgRevenue, maxRevenue, 8)} €${m.avgRevenue.toLocaleString('it-IT')}`
    ).join('\n') +
    `\n\n🏆 Miglior mese: **${bestMonth.month}**\n` +
    `📉 Mese più debole: **${worstMonth.month}**`;

  return { months, message };
}

/**
 * Crescita portfolio clienti nel tempo
 */
export async function getClientGrowth(
  months: number = 12
): Promise<{ trend: Array<{ month: string; totalClients: number; newClients: number }>; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  const now = new Date();
  const trend: Array<{ month: string; totalClients: number; newClients: number }> = [];
  const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  for (let i = months - 1; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);

    // Clienti totali fino a quel mese
    const { count: totalClients } = await supabase
      .from("accounts")
      .select("id", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .lte("created_at", monthEnd.toISOString());

    // Nuovi clienti quel mese
    const { count: newClients } = await supabase
      .from("accounts")
      .select("id", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString());

    trend.push({
      month: monthNames[targetDate.getMonth()],
      totalClients: totalClients ?? 0,
      newClients: newClients ?? 0
    });
  }

  const maxClients = Math.max(...trend.map(t => t.totalClients), 1);
  const totalNewClients = trend.reduce((sum, t) => sum + t.newClients, 0);
  const currentTotal = trend[trend.length - 1]?.totalClients || 0;
  const startTotal = trend[0]?.totalClients || 0;
  const growthPercent = startTotal > 0 ? ((currentTotal - startTotal) / startTotal) * 100 : 0;

  const message = `👥 **Crescita portfolio clienti** (ultimi ${months} mesi)\n\n` +
    trend.map(t => 
      `${t.month}: ${createAsciiBar(t.totalClients, maxClients, 8)} ${t.totalClients} (+${t.newClients})`
    ).join('\n') +
    `\n\n📈 Crescita: **+${growthPercent.toFixed(0)}%** (${totalNewClients} nuovi clienti)`;

  return { trend, message };
}
