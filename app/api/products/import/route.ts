// app/api/products/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { parse as csvParse } from "csv-parse/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type Row = {
  codice: string;
  descrizione_articolo?: string | null;
  unita_misura?: string | null;
  giacenza?: number | null;
  base_price?: number | null;
  sconto_merce?: string | null;
  sconto_fattura?: number | null;
  is_active?: boolean | null;
};

const HEADER_MAP: Record<string, keyof Row> = {
  "codice": "codice",
  "descrizione articolo": "descrizione_articolo",
  "descrizione": "descrizione_articolo",
  "unita_misura": "unita_misura",
  "unità_misura": "unita_misura",
  "um": "unita_misura",
  "giacenza": "giacenza",
  "quantita": "giacenza",
  "quantità": "giacenza",
  "qta": "giacenza",
  "base_price": "base_price",
  "prezzo": "base_price",
  "prezzo listino": "base_price",
  "sconto_merce": "sconto_merce",
  "sconto merce": "sconto_merce",
  "promo": "sconto_merce",
  "sconto_fattura": "sconto_fattura",
  "sconto fattura": "sconto_fattura",
  "sconto %": "sconto_fattura",
  "is_active": "is_active",
  "attivo": "is_active",
};

const normHeader = (h: string) =>
  h.toLowerCase().trim().replace(/\s+/g, " ").replace(/[._-]/g, " ");

const toNumberOrNull = (v: any): number | null => {
  if (v == null) return null;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  if (!s || s.toLowerCase() === "null") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const toIntOrNull = (v: any) => {
  const n = toNumberOrNull(v);
  return n == null ? null : Math.max(0, Math.floor(n));
};
const toBoolOrNull = (v: any): boolean | null => {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (["true","1","yes","si","sì","attivo"].includes(s)) return true;
  if (["false","0","no","non attivo","disattivo"].includes(s)) return false;
  return null;
};

function mapHeaders(record: Record<string, any>): Row {
  const out: Row = { codice: "" };
  for (const [k, v] of Object.entries(record)) {
    const key = HEADER_MAP[normHeader(k)];
    if (!key) continue;
    switch (key) {
      case "codice": out.codice = String(v ?? "").trim(); break;
      case "descrizione_articolo": out.descrizione_articolo = v == null ? null : String(v).trim(); break;
      case "unita_misura": out.unita_misura = v == null ? null : String(v).trim(); break;
      case "giacenza": out.giacenza = toIntOrNull(v); break;
      case "base_price": out.base_price = toNumberOrNull(v); break;
      case "sconto_merce": out.sconto_merce = v == null ? null : String(v).trim(); break;
      case "sconto_fattura": out.sconto_fattura = toNumberOrNull(v); break;
      case "is_active": out.is_active = toBoolOrNull(v); break;
    }
  }
  return out;
}
function cleanRow(r: Row): Row | null {
  const codice = (r.codice || "").trim();
  if (!codice) return null;
  if (r.sconto_fattura != null) r.sconto_fattura = Math.min(100, Math.max(0, r.sconto_fattura));
  if (r.giacenza != null) r.giacenza = Math.max(0, Math.floor(r.giacenza));
  return { ...r, codice };
}

async function parseCSV(buf: Buffer): Promise<Row[]> {
  const rows = csvParse(buf, { columns: true, skip_empty_lines: true, bom: true, trim: true }) as Record<string, any>[];
  return rows.map(mapHeaders).map(cleanRow).filter((x): x is Row => !!x);
}

/** Parser PDF robusto */
async function parsePDF(buf: Buffer): Promise<Row[]> {
  const mod = await import("pdf-parse");
  const pdfParse: (data: Buffer | Uint8Array | ArrayBuffer, opts?: any) => Promise<{ text: string }> =
    (mod as any).default || (mod as any);

  const { text } = await pdfParse(buf);

  // normalizza spazi/righe
  const norm = text
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+/g, " ");

  const lines = norm.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const out: Row[] = [];

  const isHeaderOrFooter = (l: string) =>
    /^codice\b/i.test(l) ||
    /^giacenze del/i.test(l) ||
    /^report del/i.test(l) ||
    /^pagina\s+\d+\s+di\s+\d+/i.test(l) ||
    /^nr\.\s*referenze\b/i.test(l);

  const isUM = (s: string) => /^(sc|mb|pz|kg\d+(?:,\d+)?|g\d+|p\d+|sasacchetto|rspomb)$/i.test(s);

  for (const raw of lines) {
    if (isHeaderOrFooter(raw)) continue;

    // codice = primo gruppo di 5+ cifre
    const mCode = raw.match(/(\d{5,})/);
    // giacenza = ultimo intero in riga
    const mQty  = raw.match(/(\d+)\s*$/);
    if (!mCode || !mQty) continue;

    const codice = mCode[1].replace(/[^\d]/g, "");
    const giacenza = parseInt(mQty[1], 10);
    if (!codice || !Number.isFinite(giacenza)) continue;

    // slot centrale: dopo il codice fino a prima della giacenza
    const startAfterCode = raw.indexOf(mCode[0]) + mCode[0].length;
    const beforeQty = raw.slice(0, mQty.index!).trim();
    const mid = beforeQty.slice(startAfterCode).trim();

    // prova UM sugli ultimi token
    const tokens = mid.split(/\s+/).filter(Boolean);
    let unita_misura: string | null = null;
    let descrTokens = tokens;

    if (tokens.length >= 2) {
      const last = tokens[tokens.length - 1];
      const prev = tokens[tokens.length - 2];
      const pair = `${prev} ${last}`.toLowerCase();

      if (pair === "nr buste" || pair === "nr busta") {
        unita_misura = prev + " " + last;
        descrTokens = tokens.slice(0, -2);
      } else if (isUM(last)) {
        unita_misura = last;
        descrTokens = tokens.slice(0, -1);
      } else if (isUM(prev)) {
        unita_misura = prev;
        // manteniamo last nella descrizione
        descrTokens = tokens.slice(0, -1);
      }
    } else if (tokens.length === 1) {
      if (isUM(tokens[0])) {
        unita_misura = tokens[0];
        descrTokens = [];
      }
    }

    const descrizione_articolo = (descrTokens.join(" ").trim() || null);

    out.push({
      codice,
      giacenza,
      unita_misura: unita_misura ?? null,
      descrizione_articolo,
    });
  }

  // fallback grezzo
  if (!out.length) {
    for (const raw of lines) {
      if (isHeaderOrFooter(raw)) continue;
      const qtyMatch = raw.match(/(\d+)\s*$/);
      const codeMatch = raw.match(/(\d{5,})/);
      if (!qtyMatch || !codeMatch) continue;
      const codice = codeMatch[1].replace(/[^\d]/g, "");
      const giacenza = parseInt(qtyMatch[1], 10);
      if (!codice || !Number.isFinite(giacenza)) continue;
      out.push({ codice, giacenza, unita_misura: null, descrizione_articolo: null });
    }
  }

  if (!out.length) throw new Error("Nessuna riga valida trovata nel PDF (usa un CSV).");
  return out;
}

const detectKind = (name: string, mime?: string | null): "csv" | "pdf" => {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".csv")) return "csv";
  if (n.endsWith(".pdf")) return "pdf";
  if (mime?.includes("pdf")) return "pdf";
  if (mime?.includes("csv") || mime?.includes("excel")) return "csv";
  return "csv";
};

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

  // opzionale: messaggio più chiaro se non admin
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (!prof || prof.role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const onlyStock = String(form.get("onlyStock") ?? "true").toLowerCase() === "true";
    const allowPriceDiscount = String(form.get("allowPriceDiscount") ?? "false").toLowerCase() === "true";
    if (!file) return NextResponse.json({ ok: false, error: "Nessun file" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const kind = detectKind(file.name || "", file.type || "");
    let rows: Row[] = kind === "csv" ? await parseCSV(buf) : await parsePDF(buf);
    if (!rows.length) return NextResponse.json({ ok: false, error: "File vuoto o non valido" }, { status: 400 });

    // Applica toggle e fallback 'title' (title è NOT NULL nella tua tabella)
    rows = rows.map(r => {
      const base: any = { codice: r.codice };

      // Fallback per title: descrizione se disponibile, altrimenti il codice
      const fallbackTitle = (r.descrizione_articolo && r.descrizione_articolo.trim()) || r.codice;
      base.title = fallbackTitle;

      // giacenze sempre ammesse se presenti
      if (r.giacenza != null) base.giacenza = r.giacenza;

      if (!onlyStock) {
        if (r.descrizione_articolo != null) base.descrizione_articolo = r.descrizione_articolo;
        if (r.unita_misura != null) base.unita_misura = r.unita_misura;
        if (r.is_active != null) base.is_active = r.is_active;
        if (allowPriceDiscount) {
          if (r.base_price != null) base.base_price = r.base_price;
          if (r.sconto_merce != null) base.sconto_merce = r.sconto_merce;
          if (r.sconto_fattura != null) base.sconto_fattura = r.sconto_fattura;
        }
      }
      return base;
    });

    // **DE-DUPE** per codice: vince l'ultima occorrenza nel file
    const map = new Map<string, any>();
    for (const r of rows) map.set(r.codice, r);
    const deduped = Array.from(map.values());
    const duplicatesDropped = rows.length - deduped.length;

    // upsert a blocchi, con messaggio errore DB
    const CHUNK = 1000;
    let touched = 0, failed = 0;
    let lastError: any = null;

    for (let i = 0; i < deduped.length; i += CHUNK) {
      const slice = deduped.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("products")
        .upsert(slice, { onConflict: "codice" }) // richiede UNIQUE (codice)
        .select("id");
      if (error) { failed += slice.length; lastError = error; }
      else { touched += slice.length; }
    }

    return NextResponse.json({
      ok: failed === 0,
      total: deduped.length,
      touched,
      failed,
      duplicatesDropped,
      onlyStock,
      allowPriceDiscount,
      kind,
      errorMessage: lastError?.message || null
    });
  } catch (e: any) {
    console.error("[products/import] Error:", e);
    return NextResponse.json({ ok: false, error: e.message || "Import error" }, { status: 500 });
  }
}
