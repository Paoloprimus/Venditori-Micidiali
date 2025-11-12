import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

type UpsertProductBody = {
  codice: string;
  descrizione_articolo: string;
  title?: string;
  unita_misura?: string | null;
  giacenza?: number;
  base_price?: number | null;
  sconto_merce?: string | null;
  sconto_fattura?: number | null;
  is_active?: boolean;
  custom?: Record<string, unknown>;
};

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();

    // 1) Auth sicura
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    // 2) Input + validazioni minime
    const body = (await req.json()) as UpsertProductBody;
    
    // Verifica campi obbligatori
    if (!body.codice || !body.codice.trim()) {
      return NextResponse.json({ error: "codice_required" }, { status: 400 });
    }
    if (!body.descrizione_articolo || !body.descrizione_articolo.trim()) {
      return NextResponse.json({ error: "descrizione_required" }, { status: 400 });
    }

    const codice = body.codice.trim();
    const descrizione = body.descrizione_articolo.trim();

    // 3) Cerca prodotto esistente per codice (solo tra i prodotti dell'utente)
    const { data: existingList, error: findErr } = await supabase
      .from("products")
      .select("id, giacenza")
      .eq("codice", codice)
      .eq("owner_id", user.id)
      .limit(1);

    if (findErr) {
      return NextResponse.json({ error: "find_failed", details: findErr.message }, { status: 500 });
    }

    let productId: string | null = null;

    if (existingList && existingList.length > 0) {
      // 4A) UPDATE - Prodotto esistente
      const existing = existingList[0];

      const updateData: any = {
        descrizione_articolo: descrizione,
        title: body.title || descrizione,
      };

      // Campi opzionali
      if (body.unita_misura !== undefined) {
        updateData.unita_misura = body.unita_misura;
      }
      if (body.giacenza !== undefined) {
        updateData.giacenza = Math.max(0, Math.floor(body.giacenza));
      }
      if (body.base_price !== undefined) {
        updateData.base_price = body.base_price;
      }
      if (body.sconto_merce !== undefined) {
        updateData.sconto_merce = body.sconto_merce;
      }
      if (body.sconto_fattura !== undefined) {
        const sconto = body.sconto_fattura;
        if (sconto !== null) {
          updateData.sconto_fattura = Math.min(100, Math.max(0, sconto));
        } else {
          updateData.sconto_fattura = null;
        }
      }
      if (body.is_active !== undefined) {
        updateData.is_active = body.is_active;
      }
      if (body.custom !== undefined) {
        updateData.custom = body.custom;
      }

      updateData.updated_at = new Date().toISOString();

      const { data: updated, error: upErr } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", existing.id)
        .select("id")
        .single();

      if (upErr) {
        return NextResponse.json({ error: "update_failed", details: upErr.message }, { status: 500 });
      }

      productId = (updated && (updated as { id: string }).id) || existing.id;
    } else {
      // 4B) INSERT - Nuovo prodotto
      const insertData: any = {
        codice: codice,
        descrizione_articolo: descrizione,
        title: body.title || descrizione,
        giacenza: body.giacenza !== undefined ? Math.max(0, Math.floor(body.giacenza)) : 0,
        is_active: body.is_active !== undefined ? body.is_active : true,
        owner_id: user.id, // AGGIUNTO: Ogni prodotto appartiene all'utente
      };

      // Campi opzionali
      if (body.unita_misura !== undefined) {
        insertData.unita_misura = body.unita_misura;
      }
      if (body.base_price !== undefined) {
        insertData.base_price = body.base_price;
      }
      if (body.sconto_merce !== undefined) {
        insertData.sconto_merce = body.sconto_merce;
      }
      if (body.sconto_fattura !== undefined) {
        const sconto = body.sconto_fattura;
        if (sconto !== null) {
          insertData.sconto_fattura = Math.min(100, Math.max(0, sconto));
        }
      }
      if (body.custom !== undefined) {
        insertData.custom = body.custom;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("products")
        .insert(insertData)
        .select("id")
        .single();

      if (insErr) {
        return NextResponse.json({ error: "insert_failed", details: insErr.message }, { status: 500 });
      }

      productId = (inserted as { id: string }).id;
    }

    // 5) Risposta OK
    return NextResponse.json({ productId });
  } catch (e: any) {
    return NextResponse.json({ error: "unexpected", details: e?.message ?? String(e) }, { status: 500 });
  }
}
