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
