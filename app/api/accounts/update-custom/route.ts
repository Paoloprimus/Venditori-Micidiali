export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { openai } from "../../../../lib/openai";

const FIELDS = [
  "fascia",
  "pagamento",
  "prodotti_interesse",
  "ultimi_volumi",
  "ultimo_esito",
  "tabu",
  "interessi",
  "note"
];

export async function POST(req: Request) {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const { account_id, text } = await req.json().catch(() => ({}));
  if (!account_id || !text) {
    return NextResponse.json({ error: "MISSING", details: "account_id e text richiesti" }, { status: 400 });
  }

  // Recupera account esistente
  const { data: acc, error: accErr } = await supabase
    .from("accounts")
    .select("id, custom")
    .eq("id", account_id)
    .eq("user_id", u.user.id)
    .single();

  if (accErr || !acc) {
    return NextResponse.json({ error: "NOT_FOUND", details: "Account non trovato" }, { status: 404 });
  }

  // Prompt per LLM: estrazione strutturata
  const prompt = `
Sei un assistente vendite. Analizza la frase dell'utente e mappa eventuali informazioni nei seguenti campi:
${FIELDS.join(", ")}.

Restituisci un JSON con solo i campi rilevati.
Frase: """${text}"""
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: "Sei un estrattore di campi strutturati." }, { role: "user", content: prompt }],
    temperature: 0
  });

  let extracted: Record<string, any> = {};
  try {
    extracted = JSON.parse(completion.choices[0].message?.content || "{}");
  } catch (e) {
    return NextResponse.json({ error: "PARSE", details: "Impossibile interpretare output LLM" }, { status: 500 });
  }

  // Merge con eventuale custom già presente
  const newCustom = { ...(acc.custom || {}), ...extracted };

  const { error: updErr } = await supabase
    .from("accounts")
    .update({ custom: newCustom })
    .eq("id", account_id)
    .eq("user_id", u.user.id);

  if (updErr) {
    return NextResponse.json({ error: "DB_UPDATE", details: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, extracted, custom: newCustom });
}
