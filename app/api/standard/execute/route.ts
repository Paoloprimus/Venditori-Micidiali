// app/api/standard/execute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  if (!url) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  return url;
}
function getServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!key) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  return key;
}

type ExecInput = {
  intent_key: string;
  slots?: Record<string, any>;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ExecInput;
    const intent = (body.intent_key || "").trim();
    const slots = body.slots || {};

    if (!intent) {
      return NextResponse.json({ ok: false, error: "intent_key mancante." }, { status: 400 });
    }

    const supabase = createClient(getSupabaseUrl(), getServiceKey());

    // Dispatcher minimale per i 3 intent "Prodotti"
    if (intent === "prod_conteggio_catalogo") {
      const term = (slots.prodotto || "").toString().trim();
      if (!term) return NextResponse.json({ ok:false, error:"slot 'prodotto' mancante." }, { status: 400 });

      const { data, error } = await supabase.rpc("product_count_catalog", { term });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, data: { count: data ?? 0 } }, { status: 200 });
    }

    if (intent === "prod_giacenza_magazzino") {
      const term = (slots.prodotto || "").toString().trim();
      if (!term) return NextResponse.json({ ok:false, error:"slot 'prodotto' mancante." }, { status: 400 });

      const { data, error } = await supabase.rpc("product_stock_sum", { term });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, data: { stock: data ?? 0 } }, { status: 200 });
    }

    if (intent === "prod_prezzo_sconti") {
      const term = (slots.prodotto || "").toString().trim();
      if (!term) return NextResponse.json({ ok:false, error:"slot 'prodotto' mancante." }, { status: 400 });

      const { data, error } = await supabase.rpc("product_price_and_discount", { term });
      if (error) throw new Error(error.message);

      const row = Array.isArray(data) && data.length ? data[0] : { price: 0, discount: 0 };
      return NextResponse.json(
        { ok: true, data: { price: row.price ?? 0, discount: row.discount ?? 0 } },
        { status: 200 }
      );
    }

    // Per gli altri intent (clienti/report) li aggiungiamo qui in seguito.
    return NextResponse.json(
      { ok: false, error: `Intent non gestito: ${intent}` },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("[/api/standard/execute] error:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export const GET = async () =>
  NextResponse.json({ error: "Use POST with JSON body { intent_key, slots }." }, { status: 405 });
