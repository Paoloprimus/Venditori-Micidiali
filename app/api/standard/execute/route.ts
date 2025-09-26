// app/api/standard/execute/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

const PRIVACY_ON = process.env.PRIVACY_BY_BI === "on";

// Risposte: ok:true sempre (evita fallback LLM)
const reply = (data: any) => NextResponse.json({ ok: true, data }, { status: 200 });

/** ========== Normalizzazione leggera / estrazione oggetto ========== */
const STOP = new Set([
  "quanti","quante","quanto","quanta","tipi","tipo","referenze","referenza",
  "abbiamo","ho","ci","sono",
  "a","al","allo","alla","alle","ai","agli","in","nel","nella","nelle","nei",
  "di","dei","degli","delle","da","dal","dallo","dalla","dalle",
  "catalogo","magazzino","deposito","pezzi","disponibili","oltre"
]);
function norm(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
           .toLowerCase().replace(/\s+/g, " ").trim();
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
function isStopwordTerm(t?: string) {
  if (!t) return false;
  const n = norm(t);
  return !n || STOP.has(n);
}
/** ================================================================ */

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}

  // Compat: intent
  const intent_key: string | undefined =
    body.intent_key || body.intent || body.key || body?.slots?.intent_key || body?.args?.intent_key;

  // Compat: slots/args
  const slots: any = body.slots ?? body.args ?? {};

  // 1) prendiamo TUTTE le varianti note del "termine"
  let term: string | undefined =
    // preferisci ciò che la pipeline potrebbe aver già normalizzato
    slots.normalized ??
    // storico: prodotto
    slots.prodotto ??
    // altre varianti
    slots.term ?? body.term ?? body.text ?? body.q ?? body.query ?? slots.q ?? slots.text;

  // 2) se è una frase, prova a estrarre l’oggetto
  if (typeof term === "string") {
    const extracted = extractObject(term);
    if (extracted) term = extracted;
  }

  // 3) se il "term" è ANCORA una stopword (es. "abbiamo"), prova a usare body.text
  if (isStopwordTerm(term) && typeof body?.text === "string") {
    const tryFromText = extractObject(body.text);
    if (tryFromText) term = tryFromText;
  }

  // 4) se è ancora stopword, NON interrogare il DB: rispondi guida
  if (isStopwordTerm(term)) {
    // Nota: NON mettiamo il termine nelle virgolette per evitare “«abbiamo»”
    return reply({ message: "Dimmi cosa contare (es. «torte», «cornetti», «cheesecake»)." });
  }

  // Privacy: BI (se presenti)
  const bi_list: string[] | undefined = Array.isArray(slots?.bi_list) ? slots.bi_list : undefined;

  if (!intent_key) {
    return reply({ message: "Dimmi cosa vuoi sapere (es. «quanti tipi di torte a catalogo?»)." });
  }

  const supabase = createRouteHandlerClient({ cookies });

  const sayCount = (count: number, label?: string) =>
    label ? `A catalogo ho trovato ${count} referenze di «${label}».`
          : `A catalogo ho trovato ${count} referenze.`;

  const sayStock = (stock: number, label?: string) =>
    label ? `In deposito ci sono ${stock} pezzi di «${label}».`
          : `In deposito ci sono ${stock} pezzi.`;

  switch (intent_key) {
    case "prod_conteggio_catalogo": {
      if (PRIVACY_ON && bi_list?.length) {
        const { data, error } = await supabase.rpc("product_count_by_bi", { bi_list });
        if (error) return reply({ message: "Errore conteggio by_bi." });
        const count = Number(data ?? 0);
        return reply({ count, message: sayCount(count) });
      } else {
        if (!term) return reply({ message: "Dimmi cosa contare (es. «torte»)." });
        const { data, error } = await supabase.rpc("product_count_catalog", { term });
        if (error) return reply({ message: "Errore conteggio testuale." });
        const count = typeof data === "number"
          ? data
          : (data as any)?.count ?? (Array.isArray(data) ? (data[0]?.count ?? 0) : 0);
        return reply({ count, term, message: sayCount(count, term) });
      }
    }

    case "prod_giacenza_magazzino": {
      if (PRIVACY_ON && bi_list?.length) {
        const { data, error } = await supabase.rpc("product_stock_by_bi", { bi_list });
        if (error) return reply({ message: "Errore stock by_bi." });
        const stock = Number(data ?? 0);
        return reply({ stock, message: sayStock(stock) });
      } else {
        if (!term) return reply({ message: "Dimmi il prodotto (es. «arancino»)." });
        const { data, error } = await supabase.rpc("product_stock_sum", { term });
        if (error) return reply({ message: "Errore giacenza testuale." });
        const stock = typeof data === "number"
          ? data
          : (data as any)?.stock ?? (Array.isArray(data) ? (data[0]?.stock ?? 0) : 0);
        return reply({ stock, term, message: sayStock(stock, term) });
      }
    }

    case "prod_prezzo_sconti": {
      if (PRIVACY_ON && bi_list?.length) {
        const { data, error } = await supabase.rpc("product_list_by_bi", { bi_list, lim: 50, off: 0 });
        if (error) return reply({ message: "Errore lista by_bi." });
        return reply({ items: data ?? [], message: "Ho recuperato le referenze richieste." });
      } else {
        if (!term) return reply({ message: "Dimmi il prodotto di cui vuoi il prezzo." });
        const { data, error } = await supabase.rpc("product_price_and_discount", { term });
        if (error) return reply({ message: "Errore prezzo testuale." });
        return reply({ ...(data ?? {}), term });
      }
    }

    case "count_clients": {
      const { data, error } = await supabase.rpc("count_clients");
      if (error) return reply({ message: "Errore count clients." });
      const count = Number(data ?? 0);
      return reply({ count, message: `Hai ${count} clienti.` });
    }

    default:
      return reply({ message: `Intent non supportato: ${intent_key}` });
  }
}
