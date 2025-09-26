// app/api/standard/execute/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

const PRIVACY_ON = process.env.PRIVACY_BY_BI === "on";

// risposte rapide (mai 4xx per input utente: evitiamo fallback LLM)
const fail = (msg: string) => NextResponse.json({ ok: false, error: msg }, { status: 200 });
const ok = (data: any) => NextResponse.json({ ok: true, data });

/** ================== Normalizzazione leggera per estrarre l’oggetto ================== */
const STOP = new Set([
  "quanti","quante","quanto","quanta","tipi","tipo","referenze","referenza",
  "abbiamo","ho","ci","sono",
  "a","al","allo","alla","alle","ai","agli","in","nel","nella","nelle","nei",
  "di","dei","degli","delle","da","dal","dallo","dalla","dalle",
  "catalogo","magazzino","deposito","pezzi","disponibili","oltre"
]);
function norm(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
function extractObject(raw?: string): string | null {
  if (!raw) return null;
  const t = norm(raw);
  let m =
    t.match(/quanti\s+tipi\s+di\s+(.+?)(?:\s+(?:a|in)\s+catalogo|\?|$)/) ||
    t.match(/quanti\s+(.+?)\s+(?:a|in)\s+catalogo/) ||
    t.match(/quanti\s+(.+?)\?*$/) ||
    t.match(/pezzi\s+(?:disponibili\s+)?di\s+(.+?)(?:\s+in\s+(?:deposito|magazzino)|\?|$)/);
  let cand = (m?.[1] || t).replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = cand.split(" ").filter(w => w && !STOP.has(w));
  return tokens.length ? tokens.join(" ") : null;
}
/** =============================================================================== */

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}

  // ✅ Compat: recupera intent in tutti i modi storici
  const intent_key: string | undefined =
    body.intent_key || body.intent || body.key || body?.slots?.intent_key || body?.args?.intent_key;

  // ✅ Compat: recupera slots/args in modo robusto
  const slots: any = body.slots ?? body.args ?? {};

  // ✅ Compat: recupera term in tutti i modi + estrazione dall’intera frase
  let term: string | undefined =
    slots.term ?? body.term ?? body.text ?? body.q ?? body.query ?? slots.q ?? slots.text;
  if (typeof term === "string") {
    const extracted = extractObject(term);
    if (extracted) term = extracted; // es. "quanti tipi di torte..." → "torte"
  }

  // ✅ Compat: bi_list se presente
  const bi_list: string[] | undefined = Array.isArray(slots?.bi_list) ? slots.bi_list : undefined;

  if (!intent_key) {
    return fail("Intent non riconosciuto. (serve intent_key/intent)");
  }

  const supabase = createRouteHandlerClient({ cookies });

  switch (intent_key) {
    case "prod_conteggio_catalogo": {
      if (PRIVACY_ON && bi_list?.length) {
        const { data, error } = await supabase.rpc("product_count_by_bi", { bi_list });
        if (error) return fail("RPC error: product_count_by_bi");
        return ok({ count: data ?? 0 });
      } else {
        if (!term) return fail("Dimmi cosa contare (es. 'torte').");
        const { data, error } = await supabase.rpc("product_count_catalog", { term });
        if (error) return fail("RPC error: product_count_catalog");
        const count = (data as any)?.count ?? (Array.isArray(data) ? (data[0]?.count ?? 0) : 0);
        return ok({ count });
      }
    }

    case "prod_giacenza_magazzino": {
      if (PRIVACY_ON && bi_list?.length) {
        const { data, error } = await supabase.rpc("product_stock_by_bi", { bi_list });
        if (error) return fail("RPC error: product_stock_by_bi");
        return ok({ stock: data ?? 0 });
      } else {
        if (!term) return fail("Dimmi di quale prodotto vuoi la giacenza (es. 'arancino').");
        const { data, error } = await supabase.rpc("product_stock_sum", { term });
        if (error) return fail("RPC error: product_stock_sum");
        const stock = (data as any)?.stock ?? (Array.isArray(data) ? (data[0]?.stock ?? 0) : 0);
        return ok({ stock });
      }
    }

    case "prod_prezzo_sconti": {
      if (PRIVACY_ON && bi_list?.length) {
        const { data, error } = await supabase.rpc("product_list_by_bi", { bi_list, lim: 50, off: 0 });
        if (error) return fail("RPC error: product_list_by_bi");
        return ok({ items: data ?? [] }); // [{id}]
      } else {
        if (!term) return fail("Dimmi di quale prodotto vuoi il prezzo.");
        const { data, error } = await supabase.rpc("product_price_and_discount", { term });
        if (error) return fail("RPC error: product_price_and_discount");
        return ok(data ?? {});
      }
    }

    case "count_clients": {
      const { data, error } = await supabase.rpc("count_clients");
      if (error) return fail("RPC error: count_clients");
      return ok({ count: data ?? 0 });
    }

    default:
      return fail(`Intent non supportato: ${intent_key}`);
  }
}
