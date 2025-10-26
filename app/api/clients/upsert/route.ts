import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// --- Tipi utili (documentativi)
type CustomFields = {
  vat_number?: string;        // P.IVA
  city?: string;              // Città
  address?: string;           // Via e numero civico
  tipo_locale?: string;       // Tipo locale HoReCa
  notes?: string;             // Note generali
  // Campi legacy/futuri (stand-by)
  fascia?: "A" | "B" | "C";
  pagamento?: string;
  prodotti_interesse?: string[] | string;
  ultimi_volumi?: string;
  ultimo_esito?: string;
  tabu?: string[] | string;
  interessi?: string[] | string;
};

type UpsertClientBody = {
  // Nome cliente crittografato
  name_enc?: string;
  name_iv?: string;
  name_bi?: string;
  // Campi custom
  custom?: CustomFields;
  // Contatti con campi crittografati
  contacts?: Array<{
    full_name_enc: string;
    full_name_iv: string;
    email?: string;
    phone?: string;
  }>;
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
  const out: Record<string, unknown> = {};
  
  // Nuovi campi HoReCa
  if (input.vat_number) out.vat_number = String(input.vat_number);
  if (input.city) out.city = String(input.city);
  if (input.address) out.address = String(input.address);
  if (input.tipo_locale) out.tipo_locale = String(input.tipo_locale);
  if (input.notes) out.notes = String(input.notes);
  
  // Campi legacy (stand-by)
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
    
    // Verifica che abbiamo i campi crittografati
    if (!body.name_enc || !body.name_iv || !body.name_bi) {
      return NextResponse.json({ error: "encrypted_name_required" }, { status: 400 });
    }

    const incomingCustom = normalizeCustom(body.custom);

    // 3) Cerca account esistente usando il blind index
    const { data: existingList, error: findErr } = await supabase
      .from("accounts")
      .select("id, custom")
      .eq("user_id", userId)
      .eq("name_bi", body.name_bi)
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
        .update({ custom: mergedCustom })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select("id")
        .single();

      if (upErr) {
        return NextResponse.json({ error: "update_failed", details: upErr.message }, { status: 500 });
      }

      accountId = (updated && (updated as { id: string }).id) || existing.id;
    } else {
      // 4B) INSERT con campi crittografati
      const { data: inserted, error: insErr } = await supabase
        .from("accounts")
        .insert({
          user_id: userId,
          name_enc: body.name_enc,
          name_iv: body.name_iv,
          name_bi: body.name_bi,
          custom: incomingCustom ?? {},
        })
        .select("id")
        .single();

      if (insErr) {
        return NextResponse.json({ error: "insert_failed", details: insErr.message }, { status: 500 });
      }

      accountId = (inserted as { id: string }).id;
    }

    // 5) Inserisci contatti collegati (con crittografia)
    if (accountId && Array.isArray(body.contacts) && body.contacts.length > 0) {
      const toInsert = body.contacts
        .map(c => ({
          account_id: accountId,
          full_name_enc: c.full_name_enc,
          full_name_iv: c.full_name_iv,
          email: (c.email || "").trim() || null,
          phone: (c.phone || "").trim() || null,
          custom: {},
        }))
        .filter(c => c.full_name_enc && c.full_name_iv);

      if (toInsert.length > 0) {
        const { error: cErr } = await supabase.from("contacts").insert(toInsert);
        if (cErr) {
          return NextResponse.json({ accountId, warning: "contacts_insert_failed", details: cErr.message });
        }
      }
    }

    // 6) Risposta OK
    return NextResponse.json({ accountId });
  } catch (e: any) {
    return NextResponse.json({ error: "unexpected", details: e?.message ?? String(e) }, { status: 500 });
  }
}
