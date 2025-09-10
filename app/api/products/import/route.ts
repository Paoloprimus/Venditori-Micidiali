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

async function parsePDF(buf: Buffer): Promise<Row[]> {
  // import dinamico per evitare asset di test del pacchetto
  const mod = await import("pdf-parse");
  const pdfParse: (data: Buffer | Uint8Array | ArrayBuffer, opts?: any) => Promise<{ text: string }> =
    (mod as any).default || (mod as any);

  const { text } = await pdfParse(buf);

  // normalizza: rimuove spazi “strani”/multipli → singolo spazio
  const norm = text
    .replace(/\u00A0/g, " ")         // NBSP → spazio
    .replace(/\s+\r?\n/g, "\n")      // trim fine linea
    .replace(/\r?\n\s+/g, "\n")      // trim inizio linea
    .replace(/[ \t]+/g, " ");        // multipli → singolo

  const lines = norm.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out: Row[] = [];

  for (const l of lines) {
    // salta header/footer/segnapagina
    if (/^codice\b/i.test(l)) continue;
    if (/^giacenze del magazzino/i.test(l)) continue;
    if (/^report del/i.test(l)) continue;
    if (/^mart(ed|e)dì\b/i.test(l)) continue;     // es. "martedì 9 settembre…"
    if (/^pagina\s+\d+\s+di\s+\d+/i.test(l)) continue;
    if (/^nr\.\s*referenze\b/i.test(l)) continue;

    // 1) codice = prima “sequenza di soli numeri”, anche separati da spazi (almeno 5 cifre totali)
    //    es.: "3 4 2 2 3 6 0 ..." → cattura "3 4 2 2 3 6 0" → poi togliamo gli spazi
    const mCode = l.match(/^((?:\d[ \t]*){5,})\b/);
    if (!mCode) continue;
    const codice = mCode[1].replace(/\D/g, ""); // solo cifre

    // 2) giacenza = ultimo intero in riga
    const mQty = l.match(/(\d+)\s*$/);
    if (!mQty) continue;
    const giacenza = parseInt(mQty[1], 10);
    if (!Number.isFinite(giacenza)) continue;

    // 3) UM = token/i immediatamente prima della giacenza (gestione coppie comuni)
    const beforeQty = l.slice(0, mQty.index!).trim();
    const tokens = beforeQty.split(/\s+/);
    let unita_misura: string | null = null;

    if (tokens.length >= 2) {
      const last = tokens[tokens.length - 1];
      const prev = tokens[tokens.length - 2];
      const pair = (prev + " " + last).toLowerCase();

      // coppie frequenti nel tuo PDF
      if (["nr buste", "nr busta", "mb sc", "p z", "pz 1", "p 12"].some(p => pair.startsWith(p))) {
        unita_misura = prev + " " + last;
      } else if (/^(sc|mb|pz|kg\d+(?:,\d+)?|g\d+|p\d+|rspomb|sasacchetto)$/i.test(last)) {
        // singoli tipici: SC, MB, PZ, KG2,5, G110, P30, RSPOMB, SASacchetto…
        unita_misura = last;
      } else {
        // fallback: se l'ultimo token non sembra UM, ma il penultimo sì
        if (/^(sc|mb|pz|kg\d+(?:,\d+)?|g\d+|p\d+|rspomb|sasacchetto)$/i.test(prev)) {
          unita_misura = prev;
        }
      }
    } else if (tokens.length === 1) {
      const only = tokens[0];
      if (/^(sc|mb|pz|kg\d+(?:,\d+)?|g\d+|p\d+|rspomb|sasacchetto)$/i.test(only)) {
        unita_misura = only;
      }
    }

    if (codice.length < 5) continue; // guard-rail

    out.push({
      codice,
      giacenza,
      unita_misura: unita_misura ?? null,
    });
  }

  if (!out.length) {
    throw new Error("Nessuna riga valida trovata nel PDF (usa un CSV).");
  }
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

    // applica i toggle
    rows = rows.map(r => {
      const base: Row = { codice: r.codice };
      if (r.giacenza != null) base.giacenza = r.giacenza; // giacenze sempre ammesse
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

    // upsert a blocchi
    const CHUNK = 1000;
    let touched = 0, failed = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("products")
        .upsert(slice, { onConflict: "codice" }) // richiede UNIQUE (codice)
        .select("id");
      if (error) { failed += slice.length; }
      else { touched += slice.length; }
    }

    return NextResponse.json({ ok: true, total: rows.length, touched, failed, onlyStock, allowPriceDiscount, kind });
  } catch (e: any) {
    console.error("[products/import] Error:", e);
    return NextResponse.json({ ok: false, error: e.message || "Import error" }, { status: 500 });
  }
}
