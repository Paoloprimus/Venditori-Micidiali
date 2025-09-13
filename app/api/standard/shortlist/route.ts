// app/api/standard/shortlist/route.ts
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

export async function POST(req: NextRequest) {
  try {
    const { q, topK } = await req.json().catch(() => ({}));
    const query = (q ?? "").toString().trim();
    const k = Number.isFinite(topK) ? Number(topK) : 10;

    if (!query) {
      return NextResponse.json({ error: "Campo 'q' mancante o vuoto.", items: [] }, { status: 400 });
    }

    const supabase = createClient(getSupabaseUrl(), getServiceKey());
    const { data, error } = await supabase.rpc("standard_shortlist", { q: query, k });

    if (error) {
      console.error("[shortlist] rpc error:", error);
      return NextResponse.json({ error: error.message, items: [] }, { status: 500 });
    }

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

export const GET = async () =>
  NextResponse.json({ error: "Use POST with JSON body { q, topK? }." }, { status: 405 });
