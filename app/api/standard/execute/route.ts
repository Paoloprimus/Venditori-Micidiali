// app/api/standard/execute/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const PRIVACY_ON = process.env.PRIVACY_BY_BI === "on";

// Utilità per risposte pulite
const bad = (msg: string, code = 400) => NextResponse.json({ ok: false, error: msg }, { status: code });
const ok = (data: any) => NextResponse.json({ ok: true, data });

// NB: Questa rotta NON deve loggare body/payload utenti.

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const { intent_key, slots } = body || {};
  if (!intent_key) return bad("Missing intent_key");

  // Input possibili:
  // - slots.term      (vecchio mondo, testo)
  // - slots.bi_list   (nuovo mondo, array di BI in hex string: ["\\x...."])
  const term: string | undefined = slots?.prodotto || slots?.term; // compat
  const bi_list: string[] | undefined = Array.isArray(slots?.bi_list) ? slots.bi_list : undefined;

  const supabase = createRouteHandlerClient({ cookies });

  // --- SWITCH sugli intent supportati ---
  switch (intent_key) {
    case "prod_conteggio_catalogo": {
      if (PRIVACY_ON && bi_list?.length) {
        // Nuovo flusso privacy-safe
        const { data, error } = await supabase.rpc("product_count_by_bi", { bi_list });
        if (error) return bad("RPC error: product_count_by_bi", 500);
        return ok({ count: data ?? 0 });
      } else {
        // Compat testuale (fallback)
        if (!term) return bad("Missing term or bi_list");
        const { data, error } = await supabase.rpc("product_count_catalog", { term });
        if (error) return bad("RPC error: product_count_catalog", 500);
        return ok({ count: data?.count ?? 0 });
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
        return ok({ stock: data?.stock ?? 0 });
      }
    }

    case "prod_prezzo_sconti": {
      if (PRIVACY_ON && bi_list?.length) {
        // Privacy-safe: ottengo solo gli ID via RPC e faccio decrypt/calcolo prezzo lato client (in una fase successiva)
        const { data, error } = await supabase.rpc("product_list_by_bi", { bi_list, lim: 50, off: 0 });
        if (error) return bad("RPC error: product_list_by_bi", 500);
        return ok({ items: data ?? [] }); // [{ id }] — il client poi decritta e calcola prezzo/sconto
      } else {
        if (!term) return bad("Missing term or bi_list");
        const { data, error } = await supabase.rpc("product_price_and_discount", { term });
        if (error) return bad("RPC error: product_price_and_discount", 500);
        return ok(data ?? {});
      }
    }

    case "count_clients": {
      // Totalmente privacy-safe (nessun testo)
      const { data, error } = await supabase.rpc("count_clients");
      if (error) return bad("RPC error: count_clients", 500);
      return ok({ count: data ?? 0 });
    }

    default:
      return bad(`Intent not supported: ${intent_key}`, 400);
  }
}
