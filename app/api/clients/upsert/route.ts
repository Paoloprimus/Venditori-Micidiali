import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// --- Tipi utili (documentativi)
type CustomFields = {
  tipo_locale?: string;       // Tipo locale HoReCa (in chiaro per LLM)
  notes?: string;             // Note generali (in chiaro per LLM)
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
  // 🔐 Ditta (cifrati)
  name_enc?: string;
  name_iv?: string;
  name_bi?: string;
  city_enc?: string;          // ✅ NUOVO: Città cifrata
  city_iv?: string;           // ✅ NUOVO: IV per città
  address_enc?: string;
  address_iv?: string;
  vat_number_enc?: string;
  vat_number_iv?: string;
  
  // 🔐 Contatto principale (cifrati)
  contact_name_enc?: string;
  contact_name_iv?: string;
  email_enc?: string;
  email_iv?: string;
  phone_enc?: string;
  phone_iv?: string;
  
  // 📝 Campi in chiaro per LLM
  custom?: CustomFields;
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
  
  // Solo campi in chiaro per LLM (NO PII)
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
    
    // Verifica che abbiamo i campi crittografati della ditta
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
      // 4A) UPDATE - Merge custom + aggiorna tutti i campi cifrati
      const existing = existingList[0];
      const mergedCustom = { ...(existing.custom ?? {}), ...(incomingCustom ?? {}) };

      const updateData: any = { custom: mergedCustom };
      
      // 🔐 Aggiorna campi cifrati ditta se presenti
      if (body.city_enc && body.city_iv) {
        updateData.city_enc = body.city_enc;
        updateData.city_iv = body.city_iv;
      }
      if (body.address_enc && body.address_iv) {
        updateData.address_enc = body.address_enc;
        updateData.address_iv = body.address_iv;
      }
      if (body.vat_number_enc && body.vat_number_iv) {
        updateData.vat_number_enc = body.vat_number_enc;
        updateData.vat_number_iv = body.vat_number_iv;
      }
      
      // 🔐 Aggiorna campi cifrati contatto se presenti
      if (body.contact_name_enc && body.contact_name_iv) {
        updateData.contact_name_enc = body.contact_name_enc;
        updateData.contact_name_iv = body.contact_name_iv;
      }
      if (body.email_enc && body.email_iv) {
        updateData.email_enc = body.email_enc;
        updateData.email_iv = body.email_iv;
      }
      if (body.phone_enc && body.phone_iv) {
        updateData.phone_enc = body.phone_enc;
        updateData.phone_iv = body.phone_iv;
      }

      const { data: updated, error: upErr } = await supabase
        .from("accounts")
        .update(updateData)
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select("id")
        .single();

      if (upErr) {
        return NextResponse.json({ error: "update_failed", details: upErr.message }, { status: 500 });
      }

      accountId = (updated && (updated as { id: string }).id) || existing.id;
    } else {
      // 4B) INSERT - Tutti i campi cifrati in accounts
      const insertData: any = {
        user_id: userId,
        // 🔐 Ditta cifrata
        name_enc: body.name_enc,
        name_iv: body.name_iv,
        name_bi: body.name_bi,
        // 📝 Custom in chiaro
        custom: incomingCustom ?? {},
      };
      
      // 🔐 Aggiungi campi cifrati ditta se presenti
      if (body.city_enc && body.city_iv) {
        insertData.city_enc = body.city_enc;
        insertData.city_iv = body.city_iv;
      }
      if (body.address_enc && body.address_iv) {
        insertData.address_enc = body.address_enc;
        insertData.address_iv = body.address_iv;
      }
      if (body.vat_number_enc && body.vat_number_iv) {
        insertData.vat_number_enc = body.vat_number_enc;
        insertData.vat_number_iv = body.vat_number_iv;
      }
      
      // 🔐 Aggiungi campi cifrati contatto se presenti
      if (body.contact_name_enc && body.contact_name_iv) {
        insertData.contact_name_enc = body.contact_name_enc;
        insertData.contact_name_iv = body.contact_name_iv;
      }
      if (body.email_enc && body.email_iv) {
        insertData.email_enc = body.email_enc;
        insertData.email_iv = body.email_iv;
      }
      if (body.phone_enc && body.phone_iv) {
        insertData.phone_enc = body.phone_enc;
        insertData.phone_iv = body.phone_iv;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("accounts")
        .insert(insertData)
        .select("id")
        .single();

      if (insErr) {
        return NextResponse.json({ error: "insert_failed", details: insErr.message }, { status: 500 });
      }

      accountId = (inserted as { id: string }).id;
    }

    // 5) Risposta OK
    return NextResponse.json({ accountId });
  } catch (e: any) {
    return NextResponse.json({ error: "unexpected", details: e?.message ?? String(e) }, { status: 500 });
  }
}
