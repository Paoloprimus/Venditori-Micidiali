// app/api/standard/normalize/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Normalizza un testo utente per l’MVP “frasi standard”:
 * - minuscole
 * - rimozione accenti/diacritici
 * - sostituzione alias → canonical (da tabella `synonyms`)
 *
 * Input (POST JSON): { text: string }
 * Output (200 JSON): { normalized: string }
 */

type SynRow = {
  entity: "product_term" | "cliente_alias" | "periodo" | "metrica";
  alias: string;
  canonical: string;
};

function unaccentLower(s: string): string {
  // NFD + rimozione diacritici + toLowerCase + trim
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Crea una regex globale, case-insensitive, con “quasi-boundaries”
 * per evitare sostituzioni parziali dentro parole più lunghe.
 * Esempio: alias="s.p.a." o "ultimo mese".
 */
function makeAliasRegex(aliasNorm: string): RegExp {
  // Escape caratteri regex
  const escaped = aliasNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Boundaries “morbidi”: inizio/fine stringa oppure separatori (spazio, punteggiatura)
  // \b non gestisce bene stringhe con simboli, quindi usiamo lookaround custom.
  const pattern = `(?<=^|[\\s,.;:!?()\\[\\]{}"'])${escaped}(?=$|[\\s,.;:!?()\\[\\]{}"'])`;
  return new RegExp(pattern, "gi");
}

function ensureEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = (body?.text ?? "").toString();

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: "Campo 'text' mancante o vuoto.", normalized: "" },
        { status: 400 }
      );
    }

    // 1) Normalizzazione base (minuscole + unaccent)
    let normalized = unaccentLower(rawText);

    // 2) Carica sinonimi da Supabase
    //    Usa la SERVICE_ROLE per bypassare RLS in un route server-side.
    //    In alternativa puoi usare la ANON ma devi essere autenticato e avere policy di SELECT abilitate.
    const supabase = createClient(
      ensureEnv("SUPABASE_URL"),
      ensureEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { data: syns, error } = await supabase
      .from("synonyms")
      .select("entity,alias,canonical");

    if (error) {
      throw new Error(`Errore lettura synonyms: ${error.message}`);
    }

    const rows: SynRow[] = (syns ?? []) as SynRow[];

    if (rows.length) {
      // 3) Applica sostituzioni alias→canonical
      //    Strategie:
      //    - tutto lavora su stringhe già “unaccent lower”
      //    - ordina per alias più lungo prima (evita sovrascritture parziali)
      const mapped = rows
        .map((r) => ({
          entity: r.entity,
          aliasNorm: unaccentLower(r.alias),
          canonicalNorm: unaccentLower(r.canonical),
        }))
        .filter((r) => r.aliasNorm && r.canonicalNorm)
        .sort((a, b) => b.aliasNorm.length - a.aliasNorm.length);

      for (const { aliasNorm, canonicalNorm } of mapped) {
        const rx = makeAliasRegex(aliasNorm);
        normalized = normalized.replace(rx, canonicalNorm);
      }

      // Normalizza spazi multipli
      normalized = normalized.replace(/\s+/g, " ").trim();
    }

    return NextResponse.json({ normalized }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/standard/normalize] error:", err);
    return NextResponse.json(
      { error: String(err?.message || err), normalized: "" },
      { status: 500 }
    );
  }
}

// Opzionale: limita ai soli POST
export const GET = async () =>
  NextResponse.json({ error: "Use POST with JSON body { text }." }, { status: 405 });
