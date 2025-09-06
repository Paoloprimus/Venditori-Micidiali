import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// --- Tipi utili (documentativi)
type CustomFields = {
  fascia?: "A" | "B" | "C";
  pagamento?: string;
  prodotti_interesse?: string[] | string;
  ultimi_volumi?: string;
  ultimo_esito?: string;
  tabu?: string[] | string;
  interessi?: string[] | string;
  note?: string;
};

type UpsertClientBody = {
  name: string;
  custom?: CustomFields;
  contacts?: Array<{ full_name: string; email?: string; phone?: string }>;
};

// --- Helpers
function asArray(v: unknown): string[] | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  const s = String(v).trim();
  return s ? [s] : undefined;
}

function normalizeCustom(input?: CustomFields) {
  if (!input) return undefined;
  const out: any = {};
  if (input.fascia) out.fascia = input.fascia;
  if (input.pagamento) out.pagamento = String(input.pagamento);
  const pi = asArray(input.prodotti_interesse);
  if (pi) out.prodotti_interesse = pi;
  if (input.ultimi_volumi) out.ultimi_volumi = String(input.ultimi_volumi);
  if (input.ultimo_esito) out.ultimo_esito = String(input.ultimo_esito);
  const tabu = asArray(input.tabu);
  if (tabu) out.tabu = tabu;
  const interessi = asArray(input.interessi);
  if (interessi) out.interessi = interessi;
  if (input.note) out.note = String(input.note);
  return out;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();

    // 1) Auth sicura
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }
    const userId = user.id;

    // 2) Input + validazioni minime
    const body = (await req.json()) as UpsertClientBody;
    const name = (body?.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    const incomingCustom = normalizeCustom(body.custom);

    // 3) Cerca account esistente per (user_id + name) — case-insensitive
    const { data: existingList, error: findErr } = await supabase
      .from("accounts")
      .select("id, custom")
      .eq("user_id", userId)
      .ilike("name", name)
      .limit(1);

    if (findErr) {
      return NextResponse.json({ error: "find_failed", details: findErr.message }, { status: 500 });
    }

    let accountId: string | null = null;

    if (existingList && existingList.length > 0) {
      // 4A) UPDATE (merge dei campi custom)
      const existing = existingList[0];
      const mergedCustom = { ...(existing.custom ?? {}), ...(incomingCustom ?? {}) };

      const { data: updated, error: upErr } = await supabase
        .from("accounts")
        .update({ custom: mergedCustom })           // niente updated_at forzato
        .eq("id", existing.id)
        .eq("user_id", userId)                     // filtro coerente con RLS
        .select("id")
        .single();

      if (upErr) {
        return NextResponse.json({ error: "update_failed", details: upErr.message }, { status: 500 });
      }

      accountId = updated!.id;
