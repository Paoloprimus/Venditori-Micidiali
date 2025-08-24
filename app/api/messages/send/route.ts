// app/api/messages/send/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { openai, LLM_MODEL } from "../../../../lib/openai";

// Prezzi solo per calcolare e restituire un riepilogo (non salviamo in DB perché non ci sono colonne)
const PRICE_IN = Number(process.env.PRICING_INPUT_PER_1M ?? "1.25");   // EUR / 1M token
const PRICE_OUT = Number(process.env.PRICING_OUTPUT_PER_1M ?? "10.0"); // EUR / 1M token

const SYSTEM_PROMPT =
  "Sei AIxPMI Assistant. Dai risposte pratiche. Se 'terse' è true, rispondi breve e proponi passi successivi.";

export async function POST(req: Request) {
  // Config check
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "CONFIG", details: "OPENAI_API_KEY mancante" }, { status: 500 });
  }
  if (!LLM_MODEL) {
    return NextResponse.json({ error: "CONFIG", details: "LLM_MODEL_NAME mancante" }, { status: 500 });
  }

  // Input parse
  const body = (await req.json().catch(() => null)) as {
    content?: string;
    terse?: boolean;
    conversationId?: string;
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
  if (!u?.user) {
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  }
  const userId = u.user.id;

  // --- Conversazione: valida o crea/riusa l'ultima ---
  let convId: string | null = null;

  if (conversationIdInput) {
    // Verifica che la conv esista e sia dell'utente (niente deleted_at: non esiste in schema)
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationIdInput)
      .eq("user_id", userId)
      .single();

    if (convErr || !conv) {
      return NextResponse.json(
        { error: "INVALID_CONVERSATION", details: "not found or not owned" },
        { status: 404 }
      );
    }
    convId = conv.id;
  } else {
    // Prova a riusare l'ultima conversazione dell'utente
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
      // Creane una nuova (NB: schema conversations NON ha 'model', né 'deleted_at')
      const defaultTitle =
        "Nuova sessione " +
        new Date().toLocaleString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

      const { data: created, error: createErr } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: defaultTitle })
        .select("id")
        .single();

      if (createErr || !created?.id) {
        return NextResponse.json(
          { error: "DB_INSERT_CONV", details: createErr?.message || "Impossibile creare conversazione" },
          { status: 500 }
        );
      }
      convId = created.id;
    }
  }

  // --- Call LLM ---
  try {
    const completion = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
      temperature: terse ? 0.2 : 0.7,
      max_tokens: terse ? 300 : 800,
    });

    const replyRaw = completion.choices?.[0]?.message?.content ?? "";
    const reply = replyRaw.trim() || "⚠️ Nessun contenuto generato, riprova formulando meglio la richiesta.";
    const usage = completion.usage;
    const tokensIn = usage?.prompt_tokens ?? 0;
    const tokensOut = usage?.completion_tokens ?? 0;

    // Calcoli economici solo per ritorno (non esistono colonne per salvarli)
    const costIn = (tokensIn / 1_000_000) * PRICE_IN;
    const costOut = (tokensOut / 1_000_000) * PRICE_OUT;
    const costTotal = costIn + costOut;

    const now = new Date().toISOString();

    // --- Salvataggio messaggi (schema: no tokens/cost) ---
    const userRow = {
      conversation_id: convId!,
      user_id: userId,
      role: "user" as const,
      content,
      created_at: now,
    };
    const assistantRow = {
      conversation_id: convId!,
      user_id: userId,
      role: "assistant" as const,
      content: reply,
      created_at: now,
    };

    const { error: insErr } = await supabase.from("messages").insert([userRow, assistantRow]);
    if (insErr) {
      return NextResponse.json(
        { error: "DB_INSERT_MSG", details: insErr.message },
        { status: 500 }
      );
    }

    // Aggiorna updated_at (in aggiunta/backup al trigger DB)
    await supabase
      .from("conversations")
      .update({ updated_at: now })
      .eq("id", convId)
      .eq("user_id", userId);

    return NextResponse.json({
      ok: true,
      modelUsed: completion.model,
      conversationId: convId,
      reply,
      usage: {
        in: tokensIn,
        out: tokensOut,
        total: usage?.total_tokens ?? tokensIn + tokensOut,
      },
      cost: { in: costIn, out: costOut, total: costTotal },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "LLM_ERROR", details: e?.message ?? String(e), hint: "Controlla OPENAI_API_KEY e LLM_MODEL_NAME" },
      { status: 500 }
    );
  }
}
