// app/api/standard/normalize/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SynRow = {
  entity: "product_term" | "cliente_alias" | "periodo" | "metrica";
  alias: string;
  canonical: string;
};

function unaccentLower(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function makeAliasRegex(aliasNorm: string): RegExp {
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

    // 1) base normalize
    let normalized = unaccentLower(rawText);

    // 2) synonyms from Supabase (server-side, service key)
    const supabase = createClient(getSupabaseUrl(), getServiceKey());
    const { data: syns, error } = await supabase
      .from("synonyms")
      .select("entity,alias,canonical");

    if (error) throw new Error(`Errore lettura synonyms: ${error.message}`);

    const rows: SynRow[] = (syns ?? []) as SynRow[];

    if (rows.length) {
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

export const GET = async () =>
  NextResponse.json({ error: "Use POST with JSON body { text }." }, { status: 405 });
