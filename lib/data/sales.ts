import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function getSalesSummary(period: "7d" | "today" | "yesterday" = "7d") {
  // Consigliato calcolare lato DB con una view o RPC; qui faccio una view "sales_summary"
  const { data, error } = await supabase
    .from("sales_summary")
    .select("total,period")
    .eq("period_key", period)
    .single();
  if (error) throw error;
  if (!data || !data.total) return { status: "NO_DATA", payload: {} } as const;
  return { status: "OK", payload: { VALORE_TOTALE: data.total, PERIODO: data.period ?? "ultimi 7 giorni" } } as const;
}
