import { createClient } from "@supabase/supabase-js";

// Usa il tuo factory già presente, se ne hai uno centralizzato
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

type Crypto = {
  decryptFields: (scope: string, table: string, id: string, row: any, fields?: string[]) => Promise<any>;
};

export async function getClientsCount(_scope: "clients", crypto: Crypto) {
  // selezione in stile /clients (vedi handoff): id basta per contare
  const { data, error } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: false });
  if (error) throw error;
  // quick check sblocco: prova a decifrare 1 riga se c'è
  if (data && data[0]) {
    try { await crypto.decryptFields("clients", "accounts", data[0].id, data[0]); }
    catch { return { status: "LOCKED", payload: {} } as const; }
  }
  return (data?.length ?? 0) === 0
    ? ({ status: "NO_DATA", payload: {} } as const)
    : ({ status: "OK", payload: { N: String(data!.length) } } as const);
}

export async function getClientNames(_scope: "clients", crypto: Crypto) {
  const { data, error } = await supabase
    .from("accounts")
    .select("id,name,name_enc,name_iv") // compat: se name plain esiste, usalo
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return { status: "NO_DATA", payload: {} } as const;

  const names: string[] = [];
  for (const r of data) {
    if (r.name) { names.push(String(r.name)); continue; } // fallback plain (handoff)
    try {
      const dec = await crypto.decryptFields("clients", "accounts", r.id, r, ["name"]);
      const n = dec?.name;
      if (n) names.push(String(n));
    } catch { return { status: "LOCKED", payload: {} } as const; }
  }
  return names.length === 0
    ? ({ status: "NO_DATA", payload: {} } as const)
    : ({ status: "OK", payload: { NOMI: names.join(", ") } } as const);
}

export async function getClientEmails(_scope: "clients", crypto: Crypto) {
  const { data, error } = await supabase
    .from("accounts")
    .select("id,email_enc,email_iv")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return { status: "NO_DATA", payload: {} } as const;

  const emails: string[] = [];
  for (const r of data) {
    try {
      const dec = await crypto.decryptFields("clients", "accounts", r.id, r, ["email"]);
      const e = dec?.email;
      if (e) emails.push(String(e));
    } catch { return { status: "LOCKED", payload: {} } as const; }
  }
  return emails.length === 0
    ? ({ status: "NO_DATA", payload: {} } as const)
    : ({ status: "OK", payload: { EMAILS: emails.join(", ") } } as const);
}
