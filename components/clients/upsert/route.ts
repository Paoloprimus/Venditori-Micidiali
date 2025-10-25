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

// ✅ MODIFICATO: ora riceviamo campi cifrati
type UpsertClientBody = {
  // Campi cifrati per l'account
  name_enc?: string;
  name_iv?: string;
  name_bi?: string;  // blind index per ricerca
  
  // Campi NON cifrati
  custom?: CustomFields;
  
  // Contatti (con campi opzionalmente cifrati)
  contacts?: Array<{
    full_name: string;
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

    // 2) Input + validazioni
    const body = (await req.json()) as UpsertClientBody;
    
    // ✅ MODIFICATO: ora validiamo i campi cifrati
    if (!body.name_enc || !body.name_iv) {
      return NextResponse.json({ 
        error: "encrypted_name_required",
        details: "I dati devono essere cifrati lato client prima dell'invio"
      }, { status: 400 });
    }

    const incomingCustom = normalizeCustom(body.custom);

    let accountId: string | null = null;

    // ✅ MODIFICATO: Cerca duplicati usando il blind index invece di name
    if (body.name_bi) {
      const { data: existingList, error: findErr } = await supabase
        .from("accounts")
        .select("id, custom")
        .eq("user_id", userId)
        .eq("name_bi", body.name_bi)  // ← Usa blind index per trovare duplicati
        .limit(1);

      if (findErr) {
        return NextResponse.json({ error: "find_failed", details: findErr.message }, { status: 500 });
      }

      if (existingList && existingList.length > 0) {
        // 4A) UPDATE (merge dei campi custom, non tocchiamo i campi cifrati)
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
      }
    }

    // 4B) INSERT (se non trovato duplicato)
    if (!accountId) {
      // ✅ MODIFICATO: Salviamo i campi CIFRATI
      const insertData: any = {
        user_id: userId,
        name_enc: body.name_enc,
        name_iv: body.name_iv,
        custom: incomingCustom ?? {},
      };

      // Aggiungi blind index se presente
      if (body.name_bi) {
        insertData.name_bi = body.name_bi;
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

    // 5) ✅ MODIFICATO: Inserisci contatti con campi cifrati
    if (accountId && Array.isArray(body.contacts) && body.contacts.length > 0) {
      const toInsert = body.contacts
        .map(c => {
          const contactData: any = {
            account_id: accountId,
            full_name: (c.full_name || "").trim(),
            custom: {},
          };

          // ✅ Aggiungi email cifrata se presente
          if (c.email_enc && c.email_iv) {
            contactData.email_enc = c.email_enc;
            contactData.email_iv = c.email_iv;
          }

          // ✅ Aggiungi phone cifrato se presente
          if (c.phone_enc && c.phone_iv) {
            contactData.phone_enc = c.phone_enc;
            contactData.phone_iv = c.phone_iv;
          }

          return contactData;
        })
        .filter(c => c.full_name);

      if (toInsert.length > 0) {
        const { error: cErr } = await supabase.from("contacts").insert(toInsert);
        if (cErr) {
          // Non blocco l'operazione principale: segnalo comunque
          return NextResponse.json({ 
            accountId, 
            warning: "contacts_insert_failed", 
            details: cErr.message 
          });
        }
      }
    }

    // 6) Risposta OK
    return NextResponse.json({ accountId });
  } catch (e: any) {
    console.error("[clients/upsert] Error:", e);
    return NextResponse.json({ 
      error: "unexpected", 
      details: e?.message ?? String(e) 
    }, { status: 500 });
  }
}
