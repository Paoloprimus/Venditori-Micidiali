import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { openai, LLM_MODEL } from "../../../../lib/openai";

const PRICE_IN = Number(process.env.PRICING_INPUT_PER_1M ?? "1.25");
const PRICE_OUT = Number(process.env.PRICING_OUTPUT_PER_1M ?? "10.0");

const SYSTEM_PROMPT =
  "Sei AIxPMI Assistant. Dai risposte pratiche. Se 'terse' è true, rispondi breve e proponi passi successivi.";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { content?: string; terse?: boolean } | null;
  const content = (body?.content ?? "").trim();
  const terse = !!body?.terse;
  if (!content) return NextResponse.json({ error: "EMPTY" }, { status: 400 });

  // Auth per RLS
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  const userId = u.user.id;

  // Conversazione corrente (ultima o nuova)
  let convId: string;
  {
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) convId = existing.id as string;
    else {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: "Nuova chat", model: LLM_MODEL })
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: "DB_INSERT_CONV", details: error.message }, { status: 500 });
      convId = created.id;
    }
  }

  try {
    // LLM reale
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
    const usage = completion.usage;
    const tokensIn = usage?.prompt_tokens ?? 0;
    const tokensOut = usage?.completion_tokens ?? 0;

    const costIn = (tokensIn / 1_000_000) * PRICE_IN;
    const costOut = (tokensOut / 1_000_000) * PRICE_OUT;
    const costTotal = costIn + costOut;

    const now = new Date().toISOString();

    const { error: errMsg } = await supabase.from("messages").insert([
      { conversation_id: convId, role: "user", content, created_at: now },
      { conversation_id: convId, role: "assistant", content: reply, created_at: now,
        tokens_in: tokensIn, tokens_out: tokensOut, cost_in: costIn, cost_out: costOut, cost_total: costTotal }
    ]);
    if (errMsg) return NextResponse.json({ error: "DB_INSERT_MSG", details: errMsg.message }, { status: 500 });

    await supabase
      .from("conversations")
      .update({ updated_at: now, total_tokens_in: tokensIn, total_tokens_out: tokensOut, total_cost: costTotal })
      .eq("id", convId)
      .eq("user_id", userId);

    return NextResponse.json({
      model: LLM_MODEL,
      conversationId: convId,
      reply,
      usage: { in: tokensIn, out: tokensOut, total: usage?.total_tokens ?? tokensIn + tokensOut },
      cost: { in: costIn, out: costOut, total: costTotal }
    });
  } catch (e: any) {
    return NextResponse.json({
      error: "LLM_ERROR",
      details: e?.message ?? String(e),
      hint: "Controlla OPENAI_API_KEY e LLM_MODEL_NAME (es. gpt-4o-mini)"
    }, { status: 500 });
  }
}
