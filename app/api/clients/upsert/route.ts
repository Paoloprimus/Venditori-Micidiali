import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// --- Tipi utili (documentativi)
type CustomFields = {
  city?: string;              // Città (in chiaro per LLM)
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
  // Nome cliente crittografato
  name_enc?: string;
  name_iv?: string;
  name_bi?: string;
  // 🔐 NUOVI: Indirizzo e P.IVA cifrati
  address_enc?: string;
  address_iv?: string;
  vat_number_enc?: string;
  vat_number_iv?: string;
  // Campi custom (solo dati in chiaro per LLM)
  custom?: CustomFields;
  // Contatti con campi crittografati
  contacts?: Array<{
    full_name_enc: string;
    full_name_iv: string;
    // 🔐 Email e telefono cifrati
    email_enc?: string;
    email_iv?: string;
    phone_enc?: string;
    phone_iv?: string;
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
  
  // Solo campi in chiaro per LLM (NO PII)
  if (input.city) out.city = String(input.city);
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
      // 4A) UPDATE (merge dei campi custom + aggiorna campi cifrati se presenti)
      const existing = existingList[0];
      const mergedCustom = { ...(existing.custom ?? {}), ...(incomingCustom ?? {}) };

      const updateData: any = { custom: mergedCustom };
      
      // 🔐 Aggiorna campi cifrati se presenti
      if (body.address_enc && body.address_iv) {
        updateData.address_enc = body.address_enc;
        updateData.address_iv = body.address_iv;
      }
      if (body.vat_number_enc && body.vat_number_iv) {
        updateData.vat_number_enc = body.vat_number_enc;
        updateData.vat_number_iv = body.vat_number_iv;
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
      // 4B) INSERT con campi crittografati
      const insertData: any = {
        user_id: userId,
        name_enc: body.name_enc,
        name_iv: body.name_iv,
        name_bi: body.name_bi,
        custom: incomingCustom ?? {},
      };
      
      // 🔐 Aggiungi campi cifrati se presenti
      if (body.address_enc && body.address_iv) {
        insertData.address_enc = body.address_enc;
        insertData.address_iv = body.address_iv;
      }
      if (body.vat_number_enc && body.vat_number_iv) {
        insertData.vat_number_enc = body.vat_number_enc;
        insertData.vat_number_iv = body.vat_number_iv;
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

    // 5) Inserisci contatti collegati (con crittografia)
    if (accountId && Array.isArray(body.contacts) && body.contacts.length > 0) {
      const toInsert = body.contacts
        .map(c => {
          const contact: any = {
            account_id: accountId,
            full_name_enc: c.full_name_enc,
            full_name_iv: c.full_name_iv,
            custom: {},
          };
          
          // 🔐 Email e telefono cifrati
          if (c.email_enc && c.email_iv) {
            contact.email_enc = c.email_enc;
            contact.email_iv = c.email_iv;
          }
          if (c.phone_enc && c.phone_iv) {
            contact.phone_enc = c.phone_enc;
            contact.phone_iv = c.phone_iv;
          }
          
          return contact;
        })
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
