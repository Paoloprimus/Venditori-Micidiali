// app/api/messages/send/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { openai, LLM_MODEL } from "../../../../lib/openai";

// Prezzi solo per riepilogo (non salvati su DB: lo schema non li prevede)
const PRICE_IN = Number(process.env.PRICING_INPUT_PER_1M ?? "1.25");
const PRICE_OUT = Number(process.env.PRICING_OUTPUT_PER_1M ?? "10.0");

// I nostri 8 campi chiave nella scheda cliente (accounts.custom)
const FIELD_KEYS = [
  "fascia",             // A/B/C
  "pagamento",          // es. "60 giorni"
  "prodotti_interesse", // string[] o string
  "ultimi_volumi",      // es. "50 unità linea base"
  "ultimo_esito",       // breve testo
  "tabu",               // string[]
  "interessi",          // string[]
  "note"                // testo libero breve
] as const;

const SYSTEM_PROMPT =
  "Sei AIxPMI Assistant. Dai risposte pratiche. Se 'terse' è true, rispondi breve e proponi passi successivi.";

/** Classificatore d'intento (senza comandi rigidi) */
const INTENT_SYS = `Sei un classificatore di intenzioni per un assistente vendite.
Dato un messaggio breve e naturale di un venditore, restituisci SOLO un JSON con:
{
  "intent": "briefing" | "update" | "other",
  "account_name": string | null
}
- "briefing": l'utente chiede piano/brief/come prepararsi per un cliente (anche frasi tipo "com'è messo X?", "preparami l'incontro con X", "idee per X")
- "update": l'utente comunica informazioni da registrare in scheda (es. "X paga a 60 giorni", "non nominare ACME", "fascia B", "ama il calcio")
- "other": tutto il resto (domande generiche, chiacchiere, ecc.)
Se c'è un nome di cliente nel testo, mettilo in "account_name" (anche parziale, es. "Rossi").
Non aggiungere altro testo.`;

/** Estrattore per aggiornamenti strutturati */
const EXTRACTOR_SYS = (allowedKeys: readonly string[]) => `Sei un estrattore di dati per un CRM vendite.
Dato un messaggio dell'utente, se contiene informazioni strutturate su un cliente, restituisci SOLO un JSON con:
{
  "account_name": string | null,       // nome cliente se presente nel testo (es. "Rossi Srl" o "Rossi")
  "fields": {                          // solo campi tra: ${allowedKeys.join(", ")}
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

  // 2) Classifica intento naturale (briefing/update/other) + account_name
  type IntentOut = { intent: "briefing" | "update" | "other"; account_name: string | null };
  const intentRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: INTENT_SYS },
      { role: "user", content }
    ],
    temperature: 0
  });
  const intentObj = safeJson<IntentOut>(intentRes.choices?.[0]?.message?.content || "", { intent: "other", account_name: null });

  // 3) Se INTENT = update → estrai campi e aggiorna scheda cliente
  let updateConfirmation = ""; // da appiccicare alla risposta assistant
  if (intentObj.intent === "update") {
    type Extracted = { account_name: string | null; fields: Record<string, any> };
    let extracted: Extracted = { account_name: null, fields: {} };

    try {
      const ext = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: EXTRACTOR_SYS(FIELD_KEYS) },
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
      extracted = { account_name: null, fields: {} };
    }

    if (extracted.account_name && Object.keys(extracted.fields).length > 0) {
      const { data: accounts, error: accErr } = await supabase
        .from("accounts")
        .select("id, name, custom")
        .eq("user_id", userId)
        .ilike("name", `%${extracted.account_name}%`)
        .limit(5);

      if (!accErr && accounts && accounts.length > 0) {
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

        // nota audit
        await supabase.from("notes").insert({
          account_id: target.id,
          contact_id: null,
          body: `Auto-update da chat: ${JSON.stringify(extracted.fields)}`
        });
      } else {
        updateConfirmation = `\n\n⚠️ Non ho trovato un cliente che somigli a "${extracted.account_name}". Dimmi il nome esatto.`;
      }
    }
  }

  // 4) Se INTENT = briefing → costruisci contesto reale e genera briefing
  if (intentObj.intent === "briefing") {
    // Prova a identificare il cliente
    let chosen: { id: string; name: string; custom: any } | null = null;
    if (intentObj.account_name) {
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, name, custom")
        .eq("user_id", userId)
        .ilike("name", `%${intentObj.account_name}%`)
        .limit(5);
      if (accounts && accounts.length > 0) chosen = accounts[0];
    }

    // Se non lo trovi, prova l'ultimo account aggiornato via note (opzionale) o chiedi nome esplicito
    if (!chosen) {
      // fallback: nessun account identificato
      const replyFallback =
        "Per preparare il briefing mi serve il nome del cliente. Dimmi ad esempio: “brief per Rossi” o “preparami l’incontro con Rossi”.";
      // Salvo i messaggi prima di uscire
      const now = new Date().toISOString();
      await supabase.from("messages").insert([
        { conversation_id: convId!, user_id: userId, role: "user", content, created_at: now },
        { conversation_id: convId!, user_id: userId, role: "assistant", content: replyFallback, created_at: now }
      ]);
      await supabase.from("conversations").update({ updated_at: now }).eq("id", convId).eq("user_id", userId);
      return NextResponse.json({ ok: true, conversationId: convId, reply: replyFallback, usage: { in: 0, out: 0, total: 0 }, cost: { in: 0, out: 0, total: 0 } });
    }

    // Recupera ultime note del cliente (max 5)
    const { data: lastNotes } = await supabase
      .from("notes")
      .select("id, body, created_at")
      .eq("account_id", chosen.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const context = {
      account: { id: chosen.id, name: chosen.name, custom: chosen.custom || {} },
      recent_notes: (lastNotes || []).map(n => ({ id: n.id, body: n.body, created_at: n.created_at }))
    };

    const briefingPrompt = `Sei un assistente vendite. Genera un briefing operativo sintetico e utile per incontrare il cliente seguente.
Usa SOLO i dati forniti nel CONTEXT (non inventare). Tono pratico. Punti elenco chiari.
Mostra: fascia, pagamento, prodotti interesse, volumi/ultimo esito, tabù da evitare, interessi personali, note utili. 
Chiudi con 2-3 suggerimenti di prossima azione.

CONTEXT:
${JSON.stringify(context, null, 2)}
`;

    const completion = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: briefingPrompt }
      ],
      temperature: 0.3,
      max_tokens: 600
    });

    const replyBrief = completion.choices?.[0]?.message?.content?.trim() || "Non ho potuto generare il briefing.";
    const usage = completion.usage;
    const tokensIn = usage?.prompt_tokens ?? 0;
    const tokensOut = usage?.completion_tokens ?? 0;
    const costIn = (tokensIn / 1_000_000) * PRICE_IN;
    const costOut = (tokensOut / 1_000_000) * PRICE_OUT;
    const costTotal = costIn + costOut;

    const now = new Date().toISOString();
    await supabase.from("messages").insert([
      { conversation_id: convId!, user_id: userId, role: "user", content, created_at: now },
      { conversation_id: convId!, user_id: userId, role: "assistant", content: replyBrief, created_at: now }
    ]);
    await supabase.from("conversations").update({ updated_at: now }).eq("id", convId).eq("user_id", userId);

    return NextResponse.json({
      ok: true,
      conversationId: convId,
      reply: replyBrief,
      usage: { in: tokensIn, out: tokensOut, total: usage?.total_tokens ?? tokensIn + tokensOut },
      cost: { in: costIn, out: costOut, total: costTotal }
    });
  }

  // 5) Altrimenti (other) → risposta conversazionale standard + eventuale conferma update
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
    const reply = (replyRaw.trim() || "⚠️ Nessun contenuto generato.").concat(updateConfirmation);

    const usage = completion.usage;
    const tokensIn = usage?.prompt_tokens ?? 0;
    const tokensOut = usage?.completion_tokens ?? 0;
    const costIn = (tokensIn / 1_000_000) * PRICE_IN;
    const costOut = (tokensOut / 1_000_000) * PRICE_OUT;
    const costTotal = costIn + costOut;

    const now = new Date().toISOString();
    await supabase.from("messages").insert([
      { conversation_id: convId!, user_id: userId, role: "user", content, created_at: now },
      { conversation_id: convId!, user_id: userId, role: "assistant", content: reply, created_at: now }
    ]);
    await supabase.from("conversations").update({ updated_at: now }).eq("id", convId).eq("user_id", userId);

    return NextResponse.json({
      ok: true,
      conversationId: convId,
      reply,
      usage: { in: tokensIn, out: tokensOut, total: usage?.total_tokens ?? tokensIn + tokensOut },
      cost: { in: costIn, out: costOut, total: costTotal }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "LLM_ERROR", details: e?.message ?? String(e), hint: "Controlla OPENAI_API_KEY e LLM_MODEL_NAME" },
      { status: 500 }
    );
  }
}
