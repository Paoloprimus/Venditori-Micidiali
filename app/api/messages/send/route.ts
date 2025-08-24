// app/api/messages/send/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { openai, LLM_MODEL } from "../../../../lib/openai";

// Prezzi solo per riepilogo (non salvati su DB: lo schema non li prevede)
const PRICE_IN = Number(process.env.PRICING_INPUT_PER_1M ?? "1.25");
const PRICE_OUT = Number(process.env.PRICING_OUTPUT_PER_1M ?? "10.0");

// I nostri 8 campi "scheda minima" — chiavi usate nel JSON custom di accounts
const FIELD_KEYS = [
  "fascia",             // A/B/C
  "pagamento",          // es. "60 giorni"
  "prodotti_interesse", // array di stringhe
  "ultimi_volumi",      // es. "50 unità linea base"
  "ultimo_esito",       // breve testo
  "tabu",               // array di stringhe
  "interessi",          // array di stringhe
  "note"                // testo libero breve
] as const;

const SYSTEM_PROMPT =
  "Sei AIxPMI Assistant. Dai risposte pratiche. Se 'terse' è true, rispondi breve e proponi passi successivi.";

/** Prompt per l'estrazione strutturata:
 * - capisce se il messaggio contiene aggiornamenti cliente
 * - prova a individuare il cliente per NOME (testuale)
 * - estrae SOLO i campi ammessi (FIELD_KEYS)
 */
const EXTRACTOR_SYS = `Sei un estrattore di dati per un CRM vendite.
Dato un messaggio dell'utente, se contiene informazioni strutturate su un cliente, restituisci SOLO un JSON con:
{
  "account_name": string | null,       // nome cliente se presente nel testo (es. "Rossi Srl" o "Rossi")
  "fields": {                          // solo campi tra: ${FIELD_KEYS.join(", ")}
    // chiavi presenti solo se dedotte dal testo. Per array usa ["..."].
  }
}
Se il testo NON contiene aggiornamenti strutturati, restituisci {"account_name": null, "fields": {}}.
Non aggiungere altro testo.`;

function safeJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "CONFIG", details: "OPENAI_API_KEY mancante" }, { status: 500 });
  }
  if (!LLM_MODEL) {
    return NextResponse.json({ error: "CONFIG", details: "LLM_MODEL_NAME mancante" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as {
    content?: string;
    terse?: boolean;
    conversationId?: string;
  } | null;

  const content = (body?.content ?? "").trim();
  const terse = !!body?.terse;
  const conversationIdInput = body?.conversationId?.trim() || null;
  if (!content) return NextResponse.json({ error: "EMPTY", details: "contenuto mancante" }, { status: 400 });

  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  const userId = u.user.id;

  // 1) Conversazione: valida o crea/riusa l’ultima
  let convId: string | null = null;
  if (conversationIdInput) {
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationIdInput)
      .eq("user_id", userId)
      .single();
    if (convErr || !conv) {
      return NextResponse.json({ error: "INVALID_CONVERSATION", details: "not found or not owned" }, { status: 404 });
    }
    convId = conv.id;
  } else {
    const { data: lastConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastConv?.id) {
      convId = lastConv.id;
    } else {
      const defaultTitle =
        "Nuova sessione " +
        new Date().toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      const { data: created, error: createErr } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: defaultTitle })
        .select("id")
        .single();
      if (createErr || !created?.id) {
        return NextResponse.json({ error: "DB_INSERT_CONV", details: createErr?.message || "Impossibile creare conversazione" }, { status: 500 });
      }
      convId = created.id;
    }
  }

  // 2) (NOVITÀ) Tentiamo l'estrazione strutturata per aggiornare accounts.custom
  type Extracted = { account_name: string | null; fields: Record<string, any> };
  let extracted: Extracted = { account_name: null, fields: {} };
  try {
    const ext = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EXTRACTOR_SYS },
        { role: "user", content }
      ],
      temperature: 0
    });
    extracted = safeJson<Extracted>(ext.choices?.[0]?.message?.content || "", { account_name: null, fields: {} });

    // Filtra SOLO chiavi consentite
    const filtered: Record<string, any> = {};
    for (const k of Object.keys(extracted.fields || {})) {
      if ((FIELD_KEYS as readonly string[]).includes(k)) filtered[k] = extracted.fields[k];
    }
    extracted.fields = filtered;
  } catch {
    // se fallisce l'estrazione non blocchiamo la chat
    extracted = { account_name: null, fields: {} };
  }

  // 3) Se abbiamo sia account_name che almeno 1 campo → prova a trovare l'account e aggiorna custom
  let updateConfirmation = ""; // messaggio da aggiungere alla risposta assistant
  if (extracted.account_name && Object.keys(extracted.fields).length > 0) {
    // Cerca account dell’utente per nome simile
    const { data: accounts, error: accErr } = await supabase
      .from("accounts")
      .select("id, name, custom")
      .eq("user_id", userId)
      .ilike("name", `%${extracted.account_name}%`)
      .limit(5);
    if (!accErr && accounts && accounts.length > 0) {
      // se più di uno, prendiamo il più simile (qui semplice: il primo)
      const target = accounts[0];
      const newCustom = { ...(target.custom || {}), ...extracted.fields };
      const { error: updErr } = await supabase
        .from("accounts")
        .update({ custom: newCustom })
        .eq("id", target.id)
        .eq("user_id", userId);
      if (!updErr) {
        updateConfirmation = `\n\n✅ Ho aggiornato la scheda di **${target.name}**: ${Object.keys(extracted.fields).join(", ")}.`;
      } else {
        updateConfirmation = `\n\n⚠️ Non sono riuscito ad aggiornare la scheda cliente (${updErr.message}).`;
      }
      // (facoltativo) salviamo anche una nota “audit”
      await supabase.from("notes").insert({
        account_id: target.id,
        contact_id: null,
        body: `Auto-update da chat: ${JSON.stringify(extracted.fields)}`
      });
    } else {
      updateConfirmation = `\n\n⚠️ Non ho trovato un cliente che somigli a "${extracted.account_name}". Dimmi il nome esatto.`;
    }
  }

  // 4) Chiamiamo l’LLM per la risposta conversazionale
  try {
    const completion = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content }
      ],
      temperature: terse ? 0.2 : 0.7,
      max_tokens: terse ? 300 : 800
    });

    const replyRaw = completion.choices?.[0]?.message?.content ?? "";
    // Aggiungiamo (se presente) la conferma d’aggiornamento
    const reply = (replyRaw.trim() || "⚠️ Nessun contenuto generato.").concat(updateConfirmation);

    const usage = completion.usage;
    const tokensIn = usage?.prompt_tokens ?? 0;
    const tokensOut = usage?.completion_tokens ?? 0;
    const costIn = (tokensIn / 1_000_000) * PRICE_IN;
    const costOut = (tokensOut / 1_000_000) * PRICE_OUT;
    const costTotal = costIn + costOut;

    const now = new Date().toISOString();

    // 5) Salvataggio messaggi (schema attuale: niente tokens/costi su DB)
    const userRow = { conversation_id: convId!, user_id: userId, role: "user" as const, content, created_at: now };
    const assistantRow = { conversation_id: convId!, user_id: userId, role: "assistant" as const, content: reply, created_at: now };
    const { error: insErr } = await supabase.from("messages").insert([userRow, assistantRow]);
    if (insErr) return NextResponse.json({ error: "DB_INSERT_MSG", details: insErr.message }, { status: 500 });

    // Aggiorna updated_at
    await supabase.from("conversations").update({ updated_at: now }).eq("id", convId).eq("user_id", userId);

    return NextResponse.json({
      ok: true,
      modelUsed: completion.model,
      conversationId: convId,
      reply,
      usage: { in: tokensIn, out: tokensOut, total: usage?.total_tokens ?? tokensIn + tokensOut },
      cost: { in: costIn, out: costOut, total: costTotal },
      // utile per debug ergonomico:
      extraction: extracted
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "LLM_ERROR", details: e?.message ?? String(e), hint: "Controlla OPENAI_API_KEY e LLM_MODEL_NAME" },
      { status: 500 }
    );
  }
}
