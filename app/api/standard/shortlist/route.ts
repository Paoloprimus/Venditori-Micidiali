// app/api/standard/shortlist/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function ensureEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const { q, topK } = await req.json().catch(() => ({}));
    const query = (q ?? "").toString().trim();
    const k = Number.isFinite(topK) ? Number(topK) : 10;

    if (!query) {
      return NextResponse.json({ error: "Campo 'q' mancante o vuoto.", items: [] }, { status: 400 });
    }

    const supabase = createClient(
      ensureEnv("SUPABASE_URL"),
      // SERVICE_ROLE consigliata per bypassare RLS lato server;
      // se preferisci ANON, assicurati che la policy di SELECT/EXECUTE lo consenta.
      ensureEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Chiama la funzione SQL standard_shortlist
    const { data, error } = await supabase.rpc("standard_shortlist", {
      q: query,
      k: k,
    });

    if (error) {
      console.error("[shortlist] rpc error:", error);
      return NextResponse.json({ error: error.message, items: [] }, { status: 500 });
    }

    // normalizza output
    const items = (data ?? []).map((row: any) => ({
      intent_key: row.intent_key,
      text: row.text,
      score: row.score,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/standard/shortlist] error:", err);
    return NextResponse.json({ error: String(err?.message || err), items: [] }, { status: 500 });
  }
}

// opzionale: neghiamo GET
export const GET = async () =>
  NextResponse.json({ error: "Use POST with JSON body { q, topK? }." }, { status: 405 });
