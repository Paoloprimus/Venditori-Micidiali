import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type Crypto = { decryptFields: (scope: string, table: string, id: string, row: any, fields?: string[]) => Promise<any> };

export async function getMissingProducts(_scope: "products", crypto: Crypto) {
  // Adatta a tua tabella prodotti; qui assumo `products` + flag `missing=true`
  const { data, error } = await supabase.from("products").select("id,name,name_enc,name_iv,missing").eq("missing", true);
  if (error) throw error;
  if (!data || data.length === 0) return { status: "NO_DATA", payload: {} } as const;

  const out: string[] = [];
  for (const r of data) {
    if (r.name) { out.push(String(r.name)); continue; }
    try {
      const dec = await crypto.decryptFields("products", "products", r.id, r, ["name"]);
      if (dec?.name) out.push(String(dec.name));
    } catch { return { status: "LOCKED", payload: {} } as const; }
  }
  return { status: "OK", payload: { PRODOTTI: out.join(", ") } } as const;
}
