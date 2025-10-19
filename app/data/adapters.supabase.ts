// app/data/adapters.supabase.ts
//
// Adapter "reale" che legge da Supabase e decifra nel browser,
// usando l'istanza di crypto esposta da useCrypto().
//
// NOTE IMPORTANTI:
// - Legge da `accounts` (clienti) come da handoff pack.
// - Usa fallback: se alcuni record storici hanno `name` in chiaro, li usa così com'è.
// - Per le email idem: prova a decifrare `email_enc`, ma se c'è `email` plain la usa.
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
  email?: string | null;
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
 */

export async function listClientNames(crypto: CryptoLike): Promise<string[]> {
  assertCrypto(crypto);

  const { data, error } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as AccountRow[];

  const names: string[] = [];
  for (const row of rows) {
    if (row.name) {
      names.push(row.name);
      continue;
    }
    try {
      const dec = await crypto.decryptFields("table:accounts", "accounts", row.id, row, ["name"]);
      if (dec?.name) names.push(dec.name);
    } catch {
      // ignora record non decifrabili
    }
  }
  return names;
}


/**
 * lista email clienti decifrate (o plain se presente).
 * @param crypto istanza da useCrypto().crypto
 */
export async function listClientEmails(crypto: CryptoLike): Promise<string[]> {
  assertCrypto(crypto);

  const { data, error } = await supabase
    .from("accounts")
    .select("id,email,email_enc,email_iv,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as AccountRow[];

  const emails: string[] = [];
  for (const row of rows) {
    if (row.email) {
      emails.push(row.email);
      continue;
    }
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
