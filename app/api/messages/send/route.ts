// app/api/messages/send/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { openai, LLM_MODEL } from "../../../../lib/openai";

// Prezzi solo per riepilogo (non salvati su DB)
const PRICE_IN = Number(process.env.PRICING_INPUT_PER_1M ?? "1.25");
const PRICE_OUT = Number(process.env.PRICING_OUTPUT_PER_1M ?? "10.0");

// Campi chiave nella scheda cliente (accounts.custom)
const FIELD_KEYS = [
  "fascia",             // A/B/C
  "pagamento",          // "60 giorni"
  "prodotti_interesse", // string[] o string
  "ultimi_volumi",      // "50 unità linea base"
  "ultimo_esito",       // breve testo
  "tabu",               // string[]
  "interessi",          // string[]
  "note"                // testo breve
] as const;

const SYSTEM_PROMPT =
  "Sei AIxPMI Assistant. Dai risposte pratiche. Se 'terse' è true, rispondi breve e proponi passi successivi.";

/** Classificatore d’intento (nessun comando rigido) */
const INTENT_SYS = `Sei un classificatore di intenzioni per un assistente vendite.
Dato un messaggio breve e naturale di un venditore, restituisci SOLO un JSON con:
{
  "intent": "briefing" | "update" | "other",
  "account_name": string | null
}
- "briefing": l'utente chiede piano/brief/come prepararsi per un cliente (es. "com'è messo X?", "preparami l'incontro con X")
- "update": l'utente comunica informazioni da registrare (es. "X paga a 60 giorni", "tabù ACME", "fascia B")
- "other": tutto il resto
Se c'è un nome cliente, mettilo in "account_name" (anche parziale). Non aggiungere altro testo.`;

/** Estrattore per aggiornamenti strutturati */
const EXTRACTOR_SYS = (allowedKeys: readonly string[]) => `Sei un estrattore di dati per un CRM vendite.
Dato un messaggio dell'utente, se contiene informazioni strutturate su un cliente, restituisci SOLO un JSON con:
{
  "account_name": string | null,
  "fields": {  // solo tra: ${allowedKeys.join(", ")}  }
}
Se non ci sono aggiornamenti, restituisci {"account_name": null, "fields": {}}. Nessun altro testo.`;

function safeJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

/** Autonomina titolo conversazione se vuoto/placeholder */
async function autoNameConversation(
  supabase: ReturnType<typeof createSupabaseServer>,
  convId: string,
  userId: string
) {
  try {
    const { data: convRow } = await supabase
      .from("conversations")
      .select("title")
      .eq("id", convId)
      .eq("user_id", userId)
      .single();

    const currentTitle = (convRow?.title ?? "").trim();
    const isPlaceholder = currentTitle === "" || currentTitle.toLowerCase() === "nuova chat";
    if (!isPlaceholder) return;

    const nowRome = new Date();
    const weekday = new Intl.DateTimeFormat("it-IT", {
      weekday: "short",
      timeZone: "Europe/Rome",
    }).format(nowRome).toLowerCase(); // es. "gio"

    const datePart = new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      timeZone: "Europe/Rome",
    }).format(nowRome); // es. "28/08/25"

    const autoTitle = `${weekday} ${datePart}`;

    await supabase
      .from("conversations")
      .update({ title: autoTitle })
      .eq("id", convId)
      .eq("user_id", userId);
  } catch {
    // non bloccare il flusso in caso di errore
  }
}

export async function POST(req: Request) {
  // Config
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "CONFIG", details: "OPENAI_API_KEY mancante" }, { status: 500 });
  }
  if (!LLM_MODEL) {
    return NextResponse.json({ error: "CONFIG", details: "LLM_MODEL_NAME mancante" }, { status: 500 });
  }

  // Input
  const body = (await req.json().catch(() => null)) as {
    content?: string; terse?: boolean; conversationId?: string;
  } | null;

  const content = (body?.content ?? "").trim();
  const terse = !!body?.terse;
  const conversationIdInput = body?.conversationId?.trim() || null;
  if (!content) {
    return NextResponse.json({ error: "EMPTY", details: "contenuto mancante" }, { status: 400 });
  }

  // Auth
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  const userId = u.user.id;

  // 1) Conversazione: valida o crea/riusa l’ultima
  let convId: string;
  if (conversationIdInput) {
    const { data: conv, error: convErr } = await supabase
      .from("conversations").select("id")
      .eq("id", conversationIdInput).eq("user_id", userId).single();
    if (convErr || !conv) {
      return NextResponse.json({ error: "INVALID_CONVERSATION", details: "not found or not owned" }, { status: 404 });
    }
    convId = conv.id;
  } else {
    const { data: lastConv } = await supabase
      .from("conversations").select("id")
      .eq("user_id", userId).order("updated_at", { ascending: false })
      .limit(1).maybeSingle();
    if (lastConv?.id) {
      convId = lastConv.id;
    } else {
      // ⬇️ PATCH: crea la conversazione SENZA titolo (placeholder)
      const { data: created, error: createErr } = await supabase
        .from("conversations").insert({ user_id: userId, title: "" })
        .select("id").single();
      if (createErr || !created?.id) {
        return NextResponse.json({ error: "DB_INSERT_CONV", details: createErr?.message || "Impossibile creare conversazione" }, { status: 500 });
      }
      convId = created.id;
    }
  }

  // 2) Classifica intento naturale
  type IntentOut = { intent: "briefing" | "update" | "other"; account_name: string | null };
  const intentRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: INTENT_SYS }, { role: "user", content }],
    temperature: 0
  });
  const intentObj = safeJson<IntentOut>(
    intentRes.choices?.[0]?.message?.content || "",
    { intent: "other", account_name: null }
  );

  // 3) Se update → estrai campi e aggiorna scheda cliente
  let updateConfirmation = "";
  if (intentObj.intent === "update") {
    type Extracted = { account_name: string | null; fields: Record<string, any> };
    let extracted: Extracted = { account_name: null, fields: {} };
    try {
      const ext = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: EXTRACTOR_SYS(FIELD_KEYS) }, { role: "user", content }],
        temperature: 0
      });
      extracted = safeJson<Extracted>(ext.choices?.[0]?.message?.content || "", { account_name: null, fields: {} });

      // Filtra solo chiavi consentite
      const filtered: Record<string, any> = {};
      for (const k of Object.keys(extracted.fields || {})) {
        if ((FIELD_KEYS as readonly string[]).includes(k as any)) filtered[k] = extracted.fields[k];
      }
      extracted.fields = filtered;
    } catch {
      extracted = { account_name: null, fields: {} };
    }

    if (extracted.account_name && Object.keys(extracted.fields).length > 0) {
      const { data: accounts, error: accErr } = await supabase
        .from("accounts").select("id, name, custom")
        .eq("user_id", userId).ilike("name", `%${extracted.account_name}%`).limit(5);
      if (!accErr && accounts && accounts.length > 0) {
        const target = accounts[0];
        const newCustom = { ...(target.custom || {}), ...extracted.fields };
        const { error: updErr } = await supabase
          .from("accounts").update({ custom: newCustom })
          .eq("id", target.id).eq("user_id", userId);
        if (!updErr) {
          updateConfirmation = `\n\n✅ Ho aggiornato la scheda di **${target.name}**: ${Object.keys(extracted.fields).join(", ")}.`;
        } else {
          updateConfirmation = `\n\n⚠️ Non sono riuscito ad aggiornare la scheda cliente (${updErr.message}).`;
        }
        // nota audit
        await supabase.from("notes").insert({
          account_id: target.id, contact_id: null,
          body: `Auto-update da chat: ${JSON.stringify(extracted.fields)}`
        });
      } else {
        updateConfirmation = `\n\n⚠️ Non ho trovato un cliente che somigli a "${extracted.account_name}". Dimmi il nome esatto.`;
      }
    }
  }

  // 4) Se briefing → costruisci briefing deterministico + azioni
  if (intentObj.intent === "briefing") {
    // 4.1 identifica cliente
    let chosen: { id: string; name: string; custom: any } | null = null;
    if (intentObj.account_name) {
      const { data: accounts } = await supabase
        .from("accounts").select("id, name, custom")
        .eq("user_id", userId).ilike("name", `%${intentObj.account_name}%`).limit(5);
      if (accounts && accounts.length > 0) chosen = accounts[0];
    }
    if (!chosen) {
      const replyFallback =
        "Per preparare il briefing mi serve il nome del cliente. Dimmi ad esempio: “brief per Rossi” o “preparami l’incontro con Rossi”.";
      const now = new Date().toISOString();
      await supabase.from("messages").insert([
        { conversation_id: convId, user_id: userId, role: "user", content, created_at: now },
        { conversation_id: convId, user_id: userId, role: "assistant", content: replyFallback, created_at: now }
      ]);
      await supabase.from("conversations").update({ updated_at: now }).eq("id", convId).eq("user_id", userId);

      // ⬇️ Autonomina titolo al primo messaggio (anche in fallback)
      await autoNameConversation(supabase, convId, userId);

      return NextResponse.json({
        ok: true, conversationId: convId, reply: replyFallback,
        usage: { in: 0, out: 0, total: 0 }, cost: { in: 0, out: 0, total: 0 }
      });
    }

    // 4.2 note recenti
    const { data: lastNotes } = await supabase
      .from("notes").select("id, body, created_at")
      .eq("account_id", chosen.id).order("created_at", { ascending: false }).limit(5);

    // 4.3 normalizza campi
    const c = chosen.custom || {};
    const arr = (v: any) => Array.isArray(v) ? v : (v == null ? [] : [String(v)]);
    const clean = (s?: string) => (typeof s === "string" && s.trim().length ? s.trim() : null);

    const fascia = clean(c.fascia);
    const pagamento = clean(c.pagamento);
    const prodottiInteresse = arr(c.prodotti_interesse).map(String);
    const ultimiVolumi = clean(c.ultimi_volumi);
    const ultimoEsito = clean(c.ultimo_esito);
    const tabu = arr(c.tabu).map(String);
    const interessi = arr(c.interessi).map(String);
    const note = clean(c.note);

    // 4.4 briefing deterministico
    const lines: string[] = [];
    lines.push(`### Briefing Operativo — **${chosen.name}**`);
    lines.push(`- **Fascia**: ${fascia ?? "—"}`);
    lines.push(`- **Pagamento**: ${pagamento ?? "—"}`);
    lines.push(`- **Prodotti di interesse**: ${prodottiInteresse.length ? prodottiInteresse.join(", ") : "—"}`);
    lines.push(`- **Volumi / ultimo esito**: ${(ultimiVolumi || ultimoEsito) ? [ultimiVolumi, ultimoEsito].filter(Boolean).join(" — ") : "—"}`);
    lines.push(`- **Tabù da evitare**: ${tabu.length ? tabu.join(", ") : "—"}`);
    lines.push(`- **Interessi personali**: ${interessi.length ? interessi.join(", ") : "—"}`);
    lines.push(`- **Note**: ${note ?? "—"}`);

    if (lastNotes && lastNotes.length) {
      lines.push(`- **Note recenti**:`);
      for (const n of lastNotes) {
        const d = new Date(n.created_at).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
        lines.push(`  • (${d}) ${n.body}`);
      }
    }

    const briefingFixed = lines.join("\n");

    // 4.5 azioni (vietato inventare)
    const actionsPrompt = `In base al seguente briefing (vero e completo per quanto noto), proponi 2-3 prossime azioni pratiche.
Regole:
- NON inventare prodotti o interessi non presenti.
- NON trasformare interessi personali (es. "calcio") in "prodotti di interesse".
- Suggerisci passi operativi coerenti (follow-up, confermare condizioni, preparare demo, ecc.).

BRIEFING:
${briefingFixed}
`;

    const completion = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: "Sei un assistente vendite. Rispondi in modo conciso e operativo." },
        { role: "user", content: actionsPrompt }
      ],
      temperature: 0.2,
      max_tokens: 200
    });

    const nextActions = completion.choices?.[0]?.message?.content?.trim() || "- (Nessuna azione suggerita)";
    const replyBrief = `${briefingFixed}\n\n**Prossime azioni (consigli):**\n${nextActions}`;

    const usage = completion.usage;
    const tokensIn = usage?.prompt_tokens ?? 0;
    const tokensOut = usage?.completion_tokens ?? 0;
    const costIn = (tokensIn / 1_000_000) * PRICE_IN;
    const costOut = (tokensOut / 1_000_000) * PRICE_OUT;
    const costTotal = costIn + costOut;

    const now = new Date().toISOString();
    await supabase.from("messages").insert([
      { conversation_id: convId, user_id: userId, role: "user", content, created_at: now },
      { conversation_id: convId, user_id: userId, role: "assistant", content: replyBrief, created_at: now }
    ]);
    await supabase.from("conversations").update({ updated_at: now }).eq("id", convId).eq("user_id", userId);

    // ⬇️ Autonomina titolo al primo messaggio
    await autoNameConversation(supabase, convId, userId);

    return NextResponse.json({
      ok: true,
      conversationId: convId,
      reply: replyBrief,
      usage: { in: tokensIn, out: tokensOut, total: usage?.total_tokens ?? tokensIn + tokensOut },
      cost: { in: costIn, out: costOut, total: costTotal }
    });
  } // <-- chiusura IF briefing

  // 5) Altrimenti (other) → risposta standard + eventuale conferma update
  try {
    const completion = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content }],
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
      { conversation_id: convId, user_id: userId, role: "user", content, created_at: now },
      { conversation_id: convId, user_id: userId, role: "assistant", content: reply, created_at: now }
    ]);
    await supabase.from("conversations").update({ updated_at: now }).eq("id", convId).eq("user_id", userId);

    // ⬇️ Autonomina titolo al primo messaggio
    await autoNameConversation(supabase, convId, userId);

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
} // <-- chiusura funzione POST
