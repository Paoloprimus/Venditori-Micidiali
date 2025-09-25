// app/api/standard/normalize/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SynRow = {
  entity: "product_term" | "cliente_alias" | "periodo" | "metrica";
  alias: string;
  canonical: string;
};

type MappedSyn = {
  aliasNorm: string;
  canonicalNorm: string;
  rx: RegExp;
};

/** ============ utils ============ */
function unaccentLower(s: string): string {
  // normalizza + rimuove accenti + minuscolo + trim
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function makeAliasRegex(aliasNorm: string): RegExp {
  // parola intera o separata da punteggiatura/spazi
  const escaped = aliasNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = `(?<=^|[\\s,.;:!?()\\[\\]{}"'])${escaped}(?=$|[\\s,.;:!?()\\[\\]{}"'])`;
  return new RegExp(pattern, "gi");
}
function getSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  if (!url) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  return url;
}
function getServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!key) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  return key;
}

/** ============ cache (5 minuti) ============ */
const CACHE_TTL_MS = 5 * 60 * 1000;
let SYN_CACHE: { ts: number; mapped: MappedSyn[] } = { ts: 0, mapped: [] };

async function loadSynonymsMapped(): Promise<MappedSyn[]> {
  const now = Date.now();
  if (now - SYN_CACHE.ts < CACHE_TTL_MS && SYN_CACHE.mapped.length) {
    return SYN_CACHE.mapped;
  }

  const supabase = createClient(getSupabaseUrl(), getServiceKey());
  const { data: syns, error } = await supabase
    .from("synonyms")
    .select("entity,alias,canonical");
  if (error) throw new Error(`Errore lettura synonyms: ${error.message}`);

  // pre-elabora: normalizza e crea regex; ordina per lunghezza alias (match più specifici prima)
  const mapped: MappedSyn[] = ((syns ?? []) as SynRow[])
    .map((r) => {
      const aliasNorm = unaccentLower(r.alias);
      const canonicalNorm = unaccentLower(r.canonical);
      return {
        aliasNorm,
        canonicalNorm,
        rx: makeAliasRegex(aliasNorm),
      };
    })
    .filter((m) => m.aliasNorm && m.canonicalNorm)
    .sort((a, b) => b.aliasNorm.length - a.aliasNorm.length);

  SYN_CACHE = { ts: now, mapped };
  return mapped;
}

/** ============ handler ============ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = (body?.text ?? "").toString();

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Campo 'text' mancante o vuoto.", normalized: "" },
        { status: 400 }
      );
    }

    // base normalize una sola volta
    let normalized = unaccentLower(rawText);

    // micro-ottimizzazione: se la stringa è molto corta, evita query
    if (normalized.length < 2) {
      return NextResponse.json({ normalized }, { status: 200 });
    }

    // carica sinonimi (cached)
    const mapped = await loadSynonymsMapped();

    // applica replace in ordine (alias lunghi prima)
    for (const m of mapped) {
      normalized = normalized.replace(m.rx, m.canonicalNorm);
    }
    normalized = normalized.replace(/\s+/g, " ").trim();

    return NextResponse.json({ normalized }, { status: 200 });
  } catch (err: any) {
    // log minimo e non sensibile
    console.error("[/api/standard/normalize] error");
    return NextResponse.json(
      { error: String(err?.message || err), normalized: "" },
      { status: 500 }
    );
  }
}

export const GET = async () =>
  NextResponse.json({ error: "Use POST with JSON body { text }." }, { status: 405 });
