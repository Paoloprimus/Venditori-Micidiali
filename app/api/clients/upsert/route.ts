import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// --- Tipi utili (documentativi)
type CustomFields = {
  notes?: string;             
  fascia?: "A" | "B" | "C";
  pagamento?: string;
  prodotti_interesse?: string[] | string;
  ultimi_volumi?: string;
  ultimo_esito?: string;
  tabu?: string[] | string;
  interessi?: string[] | string;
};

type UpsertClientBody = {
  // ✅ AGGIUNTO: L'ID pre-generato dal client è fondamentale per la crittografia!
  id?: string; 

  // 🔐 Ditta (cifrati)
  name_enc?: string;
  name_iv?: string;
  name_bi?: string;
  city?: string;              
  tipo_locale?: string;       
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
  
  // 📍 Coordinate GPS 
  latitude?: string | number;
  longitude?: string | number;
  
  // 📝 Note in chiaro
  notes?: string;
  
  // 📝 Campi custom
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
  if (input.notes) out.notes = String(input.notes);
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

    // 2) Input 
    const body = (await req.json()) as UpsertClientBody;
    
    if (!body.name_enc || !body.name_iv || !body.name_bi) {
      return NextResponse.json({ error: "encrypted_name_required" }, { status: 400 });
    }

    const incomingCustom = normalizeCustom(body.custom);

    // 3) Cerca account esistente
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
      // 4A) UPDATE 
      const existing = existingList[0];
      const mergedCustom = { ...(existing.custom ?? {}), ...(incomingCustom ?? {}) };

      const updateData: any = { custom: mergedCustom };
      
      // Aggiorna campi (codice identico a prima...)
      if (body.city) updateData.city = body.city;
      if (body.tipo_locale) updateData.tipo_locale = body.tipo_locale;
      if (body.address_enc && body.address_iv) {
        updateData.address_enc = body.address_enc;
        updateData.address_iv = body.address_iv;
      }
      if (body.vat_number_enc && body.vat_number_iv) {
        updateData.vat_number_enc = body.vat_number_enc;
        updateData.vat_number_iv = body.vat_number_iv;
      }
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
      if (body.latitude !== undefined && body.latitude !== null) {
        updateData.latitude = body.latitude;
      }
      if (body.longitude !== undefined && body.longitude !== null) {
        updateData.longitude = body.longitude;
      }
      if (body.notes !== undefined) {
        updateData.notes = body.notes || null;
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
      // 4B) INSERT - Qui sta la modifica CRUCIALE
      const insertData: any = {
        user_id: userId,
        name_enc: body.name_enc,
        name_iv: body.name_iv,
        name_bi: body.name_bi,
        custom: incomingCustom ?? {},
      };

      // ✅ FIX: Se il client ha mandato un ID (per la cifratura), USALO!
      if (body.id) {
        insertData.id = body.id;
      }
      
      // Resto dei campi insert identico a prima...
      if (body.city) insertData.city = body.city;
      if (body.tipo_locale) insertData.tipo_locale = body.tipo_locale;
      if (body.address_enc && body.address_iv) {
        insertData.address_enc = body.address_enc;
        insertData.address_iv = body.address_iv;
      }
      if (body.vat_number_enc && body.vat_number_iv) {
        insertData.vat_number_enc = body.vat_number_enc;
        insertData.vat_number_iv = body.vat_number_iv;
      }
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
      if (body.latitude !== undefined && body.latitude !== null) {
        insertData.latitude = body.latitude;
      }
      if (body.longitude !== undefined && body.longitude !== null) {
        insertData.longitude = body.longitude;
      }
      if (body.notes !== undefined) {
        insertData.notes = body.notes || null;
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
