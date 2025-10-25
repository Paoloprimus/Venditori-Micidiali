// app/api/clients/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type EncryptedRow = {
  id: string;
  name_enc: string;
  name_iv: string;
  email_enc?: string;
  email_iv?: string;
  email_bi?: string;
  phone_enc?: string;
  phone_iv?: string;
  vat_number_enc?: string;
  vat_number_iv?: string;
  notes_enc?: string;
  notes_iv?: string;
};

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();
  
  // 1. Auth
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  }

  try {
    // 2. Parse body (dati già cifrati dal client)
    const body = await req.json();
    const { encrypted, overwrite } = body;

    if (!Array.isArray(encrypted) || encrypted.length === 0) {
      return NextResponse.json({ error: "Nessun dato da importare" }, { status: 400 });
    }

    // 3. Valida formato base (ogni riga deve avere almeno name_enc/name_iv)
    const validRows: EncryptedRow[] = [];
    for (const row of encrypted) {
      if (!row.id || !row.name_enc || !row.name_iv) {
        console.warn("Riga scartata (campi obbligatori mancanti):", row);
        continue;
      }
      
      // Aggiungi user_id a ogni riga
      validRows.push({
        ...row,
        user_id: user.id,
      } as any);
    }

    if (validRows.length === 0) {
      return NextResponse.json({ error: "Nessuna riga valida trovata" }, { status: 400 });
    }

    // 4. Deduplica per email_bi (se presente)
    const map = new Map<string, EncryptedRow>();
    for (const row of validRows) {
      // Usa email_bi come chiave se presente, altrimenti id
      const key = row.email_bi || row.id;
      map.set(key, row);
    }
    const deduped = Array.from(map.values());
    const duplicatesDropped = validRows.length - deduped.length;

    // 5. Upsert in blocchi
    const CHUNK = 500;
    let imported = 0;
    let failed = 0;
    let lastError: any = null;

    for (let i = 0; i < deduped.length; i += CHUNK) {
      const slice = deduped.slice(i, i + CHUNK);
      
      // Configurazione upsert basata su overwrite
      const upsertConfig: any = overwrite && slice.some(r => r.email_bi)
        ? { onConflict: "user_id,email_bi" }
        : { onConflict: "user_id,email_bi", ignoreDuplicates: true };

      const { error } = await supabase
        .from("accounts")
        .upsert(slice, upsertConfig)
        .select("id");

      if (error) {
        // Log errore ma continua con altri chunk
        console.error(`[clients/import] Chunk ${i}-${i + slice.length} failed:`, error);
        failed += slice.length;
        lastError = error;
      } else {
        imported += slice.length;
      }
    }

    // 6. Risposta
    return NextResponse.json({
      ok: failed === 0,
      imported,
      failed,
      duplicatesDropped,
      dbError: lastError?.message || null,
    });
  } catch (e: any) {
    console.error("[clients/import] Error:", e);
    return NextResponse.json({
      error: e.message || "Import error",
    }, { status: 500 });
  }
}
