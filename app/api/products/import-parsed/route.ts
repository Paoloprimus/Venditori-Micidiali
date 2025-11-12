// app/api/products/import-parsed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ProductRow = {
  codice: string;           // OBBLIGATORIO
  descrizione_articolo: string;  // OBBLIGATORIO
  title: string;            // OBBLIGATORIO
  giacenza: number;         // OBBLIGATORIO (default 0)
  is_active: boolean;       // OBBLIGATORIO (default true)
  sku?: string;
  unita_misura?: string;
  base_price?: number;
  sconto_merce?: string;
  sconto_fattura?: number;
};

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();
  
  // 1. Auth
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  }

  try {
    // 2. Parse body (dati già parsati dal client)
    const body = await req.json();
    const { products, overwrite } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Nessun dato da importare" }, { status: 400 });
    }

    // 3. Valida formato base (ogni riga deve avere codice e descrizione_articolo)
    const validRows: ProductRow[] = [];
    for (const row of products) {
      if (!row.codice || !row.descrizione_articolo) {
        console.warn("Riga scartata (campi obbligatori mancanti):", row);
        continue;
      }

      // Normalizza i dati - TITLE è obbligatorio!
      const product: ProductRow = {
        codice: String(row.codice).trim(),
        descrizione_articolo: String(row.descrizione_articolo).trim(),
        title: row.title ? String(row.title).trim() : String(row.descrizione_articolo).trim(), // Usa descrizione se title manca
        sku: row.sku ? String(row.sku).trim() : undefined,
        unita_misura: row.unita_misura ? String(row.unita_misura).trim() : undefined,
        giacenza: row.giacenza !== undefined && row.giacenza !== null && row.giacenza !== "" ? parseInt(String(row.giacenza)) : 0, // Default 0
        base_price: row.base_price !== undefined && row.base_price !== null && row.base_price !== "" ? parseFloat(String(row.base_price)) : undefined,
        sconto_merce: row.sconto_merce ? String(row.sconto_merce).trim() : undefined,
        sconto_fattura: row.sconto_fattura !== undefined && row.sconto_fattura !== null && row.sconto_fattura !== "" ? parseFloat(String(row.sconto_fattura)) : undefined,
        is_active: row.is_active !== undefined ? Boolean(row.is_active) : true, // Default true
      };

      // Valida sconto_fattura (0-100)
      if (product.sconto_fattura !== undefined) {
        if (isNaN(product.sconto_fattura) || product.sconto_fattura < 0 || product.sconto_fattura > 100) {
          console.warn(`Riga scartata (sconto_fattura non valido: ${product.sconto_fattura}):`, row);
          continue;
        }
      }

      validRows.push(product);
    }

    if (validRows.length === 0) {
      return NextResponse.json({ error: "Nessuna riga valida trovata" }, { status: 400 });
    }

    // 4. Deduplica per codice
    const map = new Map<string, ProductRow>();
    for (const row of validRows) {
      const key = row.codice.toLowerCase(); // Case-insensitive
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
      const upsertConfig: any = overwrite
        ? { onConflict: "codice" }
        : { onConflict: "codice", ignoreDuplicates: true };

      const { error } = await supabase
        .from("products")
        .upsert(slice, upsertConfig)
        .select("id");

      if (error) {
        // Log errore ma continua con altri chunk
        console.error(`[products/import-parsed] Chunk ${i}-${i + slice.length} failed:`, error);
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
    console.error("[products/import-parsed] Error:", e);
    return NextResponse.json({
      error: e.message || "Import error",
    }, { status: 500 });
  }
}
