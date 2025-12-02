// app/api/messages/send/route.ts
// VERSIONE 3.1 - Refactored (tools e executor estratti in lib/ai/)

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { encryptText } from "@/lib/crypto/serverEncryption";
import { chatTools } from "@/lib/ai/tools";
import { executeFunction, formatToolResult } from "@/lib/ai/executor";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const CONVERSATIONS_TABLE = "conversations";
const MESSAGES_TABLE = "messages";

// ==================== MAIN HANDLER ====================

export async function POST(req: NextRequest) {
  try {
    // 🔐 AUTH CHECK: Verifica utente autenticato
    const authSupabase = createSupabaseServer();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const content = String(body?.content ?? "").trim();
    const conversationId = body?.conversationId;

    if (!content) return NextResponse.json({ error: "content mancante" }, { status: 400 });
    if (!conversationId) return NextResponse.json({ error: "conversationId mancante" }, { status: 400 });
    if (content.length > 8000) return NextResponse.json({ error: "content troppo lungo" }, { status: 413 });

    const supabase = getSupabaseAdmin();

    // Get conversation owner
    const { data: conv, error: convError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select("user_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: "conversation_not_found" }, { status: 404 });
    }

    // 🔐 AUTHORIZATION CHECK: Verifica che l'utente sia il proprietario
    if (conv.user_id !== user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const userId = conv.user_id;

    // Save user message
    const userEnc = encryptText(content);
    await supabase.from(MESSAGES_TABLE).insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "user",
      body_enc: userEnc.ciphertext,
      body_iv: userEnc.iv,
      body_tag: userEnc.tag,
      content: null
    });

    // Get recent conversation history for context
    const { data: history } = await supabase
      .from(MESSAGES_TABLE)
      .select("role, body_enc, body_iv, body_tag")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(6); // Ultimi 3 scambi (6 messaggi)

    // Decrypt history
    const { decryptText } = await import("@/lib/crypto/serverEncryption");
    const decryptedHistory: { role: string; content: string }[] = [];
    
    for (const msg of (history || []).reverse()) {
      try {
        const decrypted = decryptText(msg.body_enc, msg.body_iv, msg.body_tag);
        decryptedHistory.push({ role: msg.role, content: decrypted });
      } catch { /* skip unreadable */ }
    }

    // Build messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `Sei l'assistente REPPING per agenti di commercio HoReCa. Rispondi in italiano, breve e utile.

REGOLE:
- Usa le funzioni per accedere ai dati (clienti, visite, vendite)
- I nomi clienti sono cifrati: usa [CLIENT:id] come placeholder
- IMPORTANTE: Se l'utente dice "elencali", "elencameli", "quali sono", "chi sono", DEVI usare gli STESSI FILTRI della query precedente
- Esempio: se prima ha chiesto "clienti di Negrar" e ora dice "elencali", cerca clienti di Negrar`
      }
    ];

    // Add conversation history (for context)
    for (const msg of decryptedHistory.slice(-4)) { // Ultimi 2 scambi
      messages.push({ 
        role: msg.role as "user" | "assistant", 
        content: msg.content 
      });
    }
    
    // Add current user message
    messages.push({ role: "user", content });

    // Call OpenAI with tools
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: chatTools,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 1000
    });

    let reply = "";
    const assistantMessage = response.choices[0].message;

    // Check if LLM wants to call a function
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Execute all tool calls
      const toolResults: { name: string; result: any }[] = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments || "{}");
        
        console.log(`[function-call] ${fnName}:`, fnArgs);
        
        const result = await executeFunction(fnName, fnArgs, userId, supabase);
        toolResults.push({ name: fnName, result });
      }

      // If single tool call, format the result directly
      if (toolResults.length === 1) {
        reply = formatToolResult(toolResults[0].name, toolResults[0].result);
      } else {
        // Multiple tool calls - let LLM compose the response
        const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          ...messages,
          assistantMessage,
          ...assistantMessage.tool_calls.map((tc, i) => ({
            role: "tool" as const,
            tool_call_id: tc.id,
            content: JSON.stringify(toolResults[i].result)
          }))
        ];

        const finalResponse = await openai.chat.completions.create({
          model: MODEL,
          messages: toolMessages,
          temperature: 0.3,
          max_tokens: 500
        });

        reply = finalResponse.choices[0].message.content || "Ecco i risultati.";
      }
    } else {
      // No tool call - direct response
      reply = assistantMessage.content || "Come posso aiutarti?";
    }

    // Save assistant message
    const replyEnc = encryptText(reply);
    await supabase.from(MESSAGES_TABLE).insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      body_enc: replyEnc.ciphertext,
      body_iv: replyEnc.iv,
      body_tag: replyEnc.tag,
      content: null
    });

    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error("[/api/messages/send] ERROR:", err);
    
    if (err?.status === 429) {
      return NextResponse.json({ error: "QUOTA_ESAURITA" }, { status: 429 });
    }
    
    return NextResponse.json({ error: err?.message || "Errore interno" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: MODEL, version: "3.1-refactored" });
}
