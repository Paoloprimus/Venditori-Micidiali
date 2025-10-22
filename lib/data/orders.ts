import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
type Crypto = { decryptFields: (scope: string, table: string, id: string, row: any, fields?: string[]) => Promise<any> };

export async function getRecentOrders(_scope: "orders", crypto: Crypto, limit = 10) {
  const { data, error } = await supabase
    .from("orders")
    .select("id,created_at,summary,summary_enc,summary_iv")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!data || data.length === 0) return { status: "NO_DATA", payload: {} } as const;

  const out: string[] = [];
  for (const r of data) {
    if (r.summary) { out.push(String(r.summary)); continue; }
    try {
      const dec = await crypto.decryptFields("orders", "orders", r.id, r, ["summary"]);
      out.push(String(dec?.summary ?? `Ordine ${r.id}`));
    } catch { return { status: "LOCKED", payload: {} } as const; }
  }
  return { status: "OK", payload: { ORDINI: out.join(" · ") } } as const;
}
