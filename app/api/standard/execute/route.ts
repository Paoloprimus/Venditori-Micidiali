// app/api/standard/execute/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const PRIVACY_ON = process.env.PRIVACY_BY_BI === "on";

// risposte rapide
const bad = (msg: string, code = 400) => NextResponse.json({ ok: false, error: msg }, { status: code });
const ok = (data: any) => NextResponse.json({ ok: true, data });

/** ================== HOTFIX: estrai l'oggetto dalla frase ================== */
// stopword basilari (italiano + dominio)
const STOP = new Set([
  "quanti","quante","quanto","quanta","tipi","tipo","referenze","referenza",
  "abbiamo","ho","ci","sono",
  "a","al","allo","alla","alle","ai","agli","in","nel","nella","nelle","nei",
  "di","dei","degli","delle","da","dal","dallo","dalla","dalle",
  "catalogo","magazzino","deposito","pezzi","disponibili","oltre"
]);
function norm(s: string) {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}
function extractObject(raw: string): string | null {
  if (!raw) return null;
  const t = norm(raw);

  // pattern più comuni
  let m =
    t.match(/quanti\s+tipi\s+di\s+(.+?)(?:\s+(?:a|in)\s+catalogo|\?|$)/) ||
    t.match(/quanti\s+(.+?)\s+(?:a|in)\s+catalogo/) ||
    t.match(/quanti\s+(.+?)\?*$/) ||
    t.match(/pezzi\s+(?:disponibili\s+)?di\s+(.+?)(?:\s+in\s+(?:deposito|magazzino)|\?|$)/);

  let cand = (m?.[1] || t).replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = cand.split(" ").filter(w => w && !STOP.has(w));
  if (!tokens.length) return null;
  return tokens.join(" ");
}
/** ======================================================================== */

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const { intent_key, slots } = body || {};
  if (!intent_key) return bad("Missing intent_key");

  // INPUT possibili:
  // - slots.bi_list  (nuovo mondo, privacy-safe)
  // - slots.term     (vecchio mondo, testo)
  // - body.text      (frase intera, se qualcuno la passa)
  const bi_list: string[] | undefined = Array.isArray(slots?.bi_list) ? slots.bi_list : undefined;

  // HOTFIX: se arriva del testo, estraiamo l'oggetto vero (es. "torte" invece di "abbiamo")
  let term: string | undefined = slots?.term ?? body?.text;
  if (term && typeof term === "string") {
    const extracted = extractObject(term);
    if (extracted) term = extracted; // es. "quanti tipi di torte..." -> "torte"
  }

  const supabase = createRouteHandlerClient({ cookies });

  switch (intent_key) {
    case "prod_conteggio_catalogo": {
      if (PRIVACY_ON && bi_list?.length) {
        const { data, error } = await supabase.rpc("product_count_by_bi", { bi_list });
        if (error) return bad("RPC error: product_count_by_bi", 500);
        return ok({ count: data ?? 0 });
      } else {
        if (!term) return bad("Missing term or bi_list");
        const { data, error } = await supabase.rpc("product_count_catalog", { term });
        if (error) return bad("RPC error: product_count_catalog", 500);
        // alcune RPC vecchie ritornano {count:...}, normalizziamo
        const count = (data as any)?.count ?? (Array.isArray(data) ? (data[0]?.count ?? 0) : 0);
        return ok({ count });
      }
    }

    case "prod_giacenza_magazzino": {
      if (PRIVACY_ON && bi_list?.length) {
        const { data, error } = await supabase.rpc("product_stock_by_bi", { bi_list });
        if (error) return bad("RPC error: product_stock_by_bi", 500);
        return ok({ stock: data ?? 0 });
      } else {
        if (!term) return bad("Missing term or bi_list");
        const { data, error } = await supabase.rpc("product_stock_sum", { term });
        if (error) return bad("RPC error: product_stock_sum", 500);
        const stock = (data as any)?.stock ?? (Array.isArray(data) ? (data[0]?.stock ?? 0) : 0);
        return ok({ stock });
      }
    }

    case "prod_prezzo_sconti": {
      if (PRIVACY_ON && bi_list?.length) {
        const { data, error } = await supabase.rpc("product_list_by_bi", { bi_list, lim: 50, off: 0 });
        if (error) return bad("RPC error: product_list_by_bi", 500);
        return ok({ items: data ?? [] }); // [{ id }] — il client poi decritta e calcola
      } else {
        if (!term) return bad("Missing term or bi_list");
        const { data, error } = await supabase.rpc("product_price_and_discount", { term });
        if (error) return bad("RPC error: product_price_and_discount", 500);
        return ok(data ?? {});
      }
    }

    case "count_clients": {
      const { data, error } = await supabase.rpc("count_clients");
      if (error) return bad("RPC error: count_clients", 500);
      return ok({ count: data ?? 0 });
    }

    default:
      return bad(`Intent not supported: ${intent_key}`, 400);
  }
}
