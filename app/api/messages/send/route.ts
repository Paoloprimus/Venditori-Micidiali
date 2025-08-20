import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { openai, LLM_MODEL } from "../../../../lib/openai";


const PRICE_IN = Number(process.env.PRICING_INPUT_PER_1M ?? "1.25");   // EUR / 1M token
const PRICE_OUT = Number(process.env.PRICING_OUTPUT_PER_1M ?? "10.0"); // EUR / 1M token

// Micro-system prompt per essere sintetici quando 'terse' è true
const SYSTEM_PROMPT =
  "Sei AIxPMI Assistant. Dai risposte pratiche. Se 'terse' è true, rispondi breve e proponi passi successivi.";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { content?: string; terse?: boolean } | null;
    const content = (body?.content ?? "").trim();
    const terse = !!body?.terse;
    if (!content) {
      return NextResponse.json({ error: "EMPTY" }, { status: 400 });
    }

    // Auth utente (RLS)
    const supabase = createSupabaseServer();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
    const userId = u.user.id;

    // 1) Trova o crea una conversazione attiva dell'utente (MVP: 1 sola chat “corrente”)
    let convId: string | null = null;
    {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        convId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({ user_id: userId, title: "Nuova chat", model: LLM_MODEL })
          .select("id")
          .single();
        if (error) throw error;
        convId = created.id;
      }
    }

    // 2) Chiamata LLM
    const completion = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content }
      ],
      temperature: terse ? 0.2 : 0.7,
      max_tokens: terse ? 300 : 800
    });

    const reply = completion.choices?.[0]?.message?.content ?? "Ok.";
    const usage = completion.usage; // { prompt_tokens, completion_tokens, total_tokens }
    const tokensIn = usage?.prompt_tokens ?? 0;
    const tokensOut = usage?.completion_tokens ?? 0;

    // 3) Calcolo costi
    const costIn = (tokensIn / 1_000_000) * PRICE_IN;
    const costOut = (tokensOut / 1_000_000) * PRICE_OUT;
    const costTotal = costIn + costOut;

    // 4) Persistenza messaggi + update aggregati conversazione
    //    Inseriamo sia il messaggio utente che quello assistente
    const now = new Date().toISOString();

    const { error: errMsg } = await supabase.from("messages").insert([
      {
        conversation_id: convId,
        role: "user",
        content,
        created_at: now,
        tokens_in: tokensIn,     // opzionale per audit
        tokens_out: 0,
        cost_in: 0,
        cost_out: 0,
        cost_total: 0
      },
      {
        conversation_id: convId,
        role: "assistant",
        content: reply,
        created_at: now,
        tokens_in: 0,
        tokens_out: tokensOut,
        cost_in: costIn,
        cost_out: costOut,
        cost_total: costTotal
      }
    ]);
    if (errMsg) throw errMsg;

    // Update totals su conversazione
    await supabase.rpc("noop"); // no-op se vuoi garantire ordine; qui non serve, ma evita warning sul 'await'

    const { error: errAgg } = await supabase
      .from("conversations")
      .update({
        updated_at: now,
        total_tokens_in: (tokensIn),
        total_tokens_out: (tokensOut),
        total_cost: (costTotal)
      })
      .eq("id", convId)
      .eq("user_id", userId);

    // NB: sopra sovrascriviamo i totali per semplicità MVP; in STEP 4 li sommeremo.
    if (errAgg) throw errAgg;

    // 5) Risposta
    return NextResponse.json({
      conversationId: convId,
      reply,
      usage: { in: tokensIn, out: tokensOut, total: (usage?.total_tokens ?? tokensIn + tokensOut) },
      cost: { in: costIn, out: costOut, total: costTotal }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "SERVER_ERROR" }, { status: 500 });
  }
}
