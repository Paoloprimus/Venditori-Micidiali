// app/api/messages/send/route.ts
// VERSIONE 3.0 - Function Calling (conversazione naturale)

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { encryptText } from "@/lib/crypto/serverEncryption";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const CONVERSATIONS_TABLE = "conversations";
const MESSAGES_TABLE = "messages";

// ==================== TOOLS DEFINITIONS ====================

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_clients",
      description: "Cerca clienti nel database. Usa per domande su clienti, conteggi, liste.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Filtra per città (es. Verona, Negrar)" },
          tipo_locale: { type: "string", description: "Tipo: bar, ristorante, pizzeria, hotel, etc." },
          notes_contain: { type: "string", description: "Cerca testo nelle note (es. figli, pagamento, interessi)" },
          limit: { type: "number", description: "Max risultati (default 10, max 100)" },
          count_only: { type: "boolean", description: "Se true, restituisce solo il conteggio" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_in_notes",
      description: "Cerca informazioni specifiche nelle note dei clienti. Usa per domande tipo 'ha figli?', 'preferenze pagamento', 'interessi', etc.",
      parameters: {
        type: "object",
        properties: {
          search_text: { type: "string", description: "Cosa cercare nelle note (es. figli, contanti, allergico)" },
          client_city: { type: "string", description: "Opzionale: filtra per città del cliente" }
        },
        required: ["search_text"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_visits",
      description: "Ottieni visite/attività. Usa per storico visite, ultime visite, visite di oggi.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "ID cliente specifico (opzionale)" },
          period: { type: "string", enum: ["today", "week", "month", "year"], description: "Periodo" },
          limit: { type: "number", description: "Max risultati (default 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_sales_summary",
      description: "Riepilogo vendite/fatturato per periodo.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "year"], description: "Periodo (default: month)" },
          client_id: { type: "string", description: "Solo per un cliente specifico (opzionale)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description: "Genera link per aprire una pagina dell'app (clienti, visite, prodotti, etc.)",
      parameters: {
        type: "object",
        properties: {
          page: { type: "string", enum: ["clients", "visits", "products", "documents", "settings"], description: "Pagina da aprire" }
        },
        required: ["page"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_visit_by_position",
      description: "Ottieni info su una visita in base alla posizione nel giorno (primo, secondo, terzo cliente visitato). Usa per domande tipo 'il secondo cliente di oggi', 'il primo che ho visto ieri'.",
      parameters: {
        type: "object",
        properties: {
          day: { type: "string", enum: ["today", "yesterday", "tomorrow"], description: "Giorno di riferimento" },
          position: { type: "number", description: "Posizione: 1 = primo, 2 = secondo, etc." }
        },
        required: ["day", "position"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_visits_by_product",
      description: "Cerca visite in cui sono stati discussi/venduti specifici prodotti. Usa per domande tipo 'chi ha comprato cornetti', 'a chi ho venduto birra'.",
      parameters: {
        type: "object",
        properties: {
          product: { type: "string", description: "Prodotto cercato (es. cornetti, birra, caffè)" },
          day: { type: "string", enum: ["today", "yesterday", "week", "month"], description: "Periodo (opzionale)" }
        },
        required: ["product"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_pdf_report",
      description: "Genera un report PDF. Usa quando l'utente chiede di salvare, esportare, o generare un PDF/report.",
      parameters: {
        type: "object",
        properties: {
          report_type: { type: "string", enum: ["clienti", "visite", "vendite"], description: "Tipo di report" },
          city_filter: { type: "string", description: "Filtra per città (opzionale)" },
          tipo_filter: { type: "string", description: "Filtra per tipo locale (opzionale)" },
          period: { type: "string", enum: ["today", "week", "month", "year"], description: "Periodo per report visite/vendite" }
        },
        required: ["report_type"]
      }
    }
  }
];

// ==================== TOOL IMPLEMENTATIONS ====================

async function executeFunction(
  name: string, 
  args: Record<string, any>, 
  userId: string,
  supabase: any
): Promise<any> {
  
  switch (name) {
    case "search_clients": {
      let query = supabase
        .from("accounts")
        .select(args.count_only ? "id" : "id, city, tipo_locale, notes")
        .eq("user_id", userId);
      
      // "Inizia con" per evitare falsi positivi (es: "Verona" non trova "Villafranca di Verona")
      if (args.city) query = query.ilike("city", `${args.city}%`);
      if (args.tipo_locale) query = query.ilike("tipo_locale", `%${args.tipo_locale}%`);
      if (args.notes_contain) query = query.ilike("notes", `%${args.notes_contain}%`);
      
      const limit = Math.min(args.limit || 10, 100);
      query = query.limit(limit);
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (args.count_only) {
        return { count: data?.length || 0, ids: data?.map((d: any) => d.id) || [] };
      }
      return { clients: data || [], count: data?.length || 0 };
    }
    
    case "search_in_notes": {
      let query = supabase
        .from("accounts")
        .select("id, city, tipo_locale, notes")
        .eq("user_id", userId)
        .ilike("notes", `%${args.search_text}%`);
      
      if (args.client_city) query = query.ilike("city", `${args.client_city}%`);
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { found: false, message: `Nessuna nota trovata con "${args.search_text}"` };
      }
      
      // Estrai snippet rilevanti dalle note
      const results = data.map((c: any) => {
        const notes = c.notes || "";
        // Trova la frase che contiene il termine cercato
        const sentences = notes.split(/[.!?]+/);
        const relevant = sentences.find((s: string) => 
          s.toLowerCase().includes(args.search_text.toLowerCase())
        );
        return {
          client_id: c.id,
          city: c.city,
          tipo: c.tipo_locale,
          snippet: relevant?.trim() || notes.substring(0, 100)
        };
      });
      
      return { found: true, results, count: results.length };
    }
    
    case "get_visits": {
      let query = supabase
        .from("visits")
        .select("id, account_id, data_visita, tipo, esito, importo_vendita, prodotti_discussi")
        .eq("user_id", userId)
        .order("data_visita", { ascending: false });
      
      if (args.client_id) query = query.eq("account_id", args.client_id);
      
      if (args.period) {
        const now = new Date();
        let fromDate: Date;
        switch (args.period) {
          case "today": fromDate = new Date(now.toDateString()); break;
          case "week": fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case "month": fromDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
          case "year": fromDate = new Date(now.getFullYear(), 0, 1); break;
          default: fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
      }
      
      const limit = Math.min(args.limit || 10, 50);
      query = query.limit(limit);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return { visits: data || [], count: data?.length || 0 };
    }
    
    case "get_sales_summary": {
      const now = new Date();
      let fromDate: Date;
      let periodLabel: string;
      
      switch (args.period || "month") {
        case "today": 
          fromDate = new Date(now.toDateString()); 
          periodLabel = "oggi";
          break;
        case "week": 
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          periodLabel = "questa settimana";
          break;
        case "year": 
          fromDate = new Date(now.getFullYear(), 0, 1);
          periodLabel = "quest'anno";
          break;
        default: 
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = "questo mese";
      }
      
      let query = supabase
        .from("visits")
        .select("importo_vendita")
        .eq("user_id", userId)
        .gte("data_visita", fromDate.toISOString().split('T')[0]);
      
      if (args.client_id) query = query.eq("account_id", args.client_id);
      
      const { data, error } = await query;
      if (error) throw error;
      
      const total = (data || []).reduce((sum: number, v: any) => sum + (v.importo_vendita || 0), 0);
      const orderCount = (data || []).filter((v: any) => v.importo_vendita > 0).length;
      
      return { total, orderCount, period: periodLabel };
    }
    
    case "navigate_to_page": {
      const pages: Record<string, { url: string; name: string }> = {
        clients: { url: "/clients", name: "Lista Clienti" },
        visits: { url: "/visits", name: "Lista Visite" },
        products: { url: "/products", name: "Prodotti" },
        documents: { url: "/documents", name: "Documenti" },
        settings: { url: "/settings", name: "Impostazioni" }
      };
      return pages[args.page] || { url: "/", name: "Home" };
    }
    
    case "get_visit_by_position": {
      const now = new Date();
      let targetDate: string;
      
      switch (args.day) {
        case "yesterday":
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          targetDate = yesterday.toISOString().split('T')[0];
          break;
        case "tomorrow":
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          targetDate = tomorrow.toISOString().split('T')[0];
          break;
        default: // today
          targetDate = now.toISOString().split('T')[0];
      }
      
      // Prendi tutte le visite del giorno ordinate per orario
      const { data, error } = await supabase
        .from("visits")
        .select("id, account_id, data_visita, tipo, esito, importo_vendita, prodotti_discussi, notes, created_at")
        .eq("user_id", userId)
        .eq("data_visita", targetDate)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      if (!data || data.length === 0) {
        return { found: false, message: `Nessuna visita trovata per ${args.day === 'yesterday' ? 'ieri' : args.day === 'tomorrow' ? 'domani' : 'oggi'}` };
      }
      
      const position = args.position - 1; // 0-indexed
      if (position < 0 || position >= data.length) {
        return { found: false, message: `Hai solo ${data.length} visite ${args.day === 'yesterday' ? 'ieri' : args.day === 'tomorrow' ? 'domani' : 'oggi'}` };
      }
      
      const visit = data[position];
      
      // Prendi anche le note del cliente
      const { data: clientData } = await supabase
        .from("accounts")
        .select("city, tipo_locale, notes")
        .eq("id", visit.account_id)
        .single();
      
      return {
        found: true,
        position: args.position,
        day: args.day,
        visit: {
          client_id: visit.account_id,
          client_city: clientData?.city,
          client_tipo: clientData?.tipo_locale,
          client_notes: clientData?.notes,
          visit_tipo: visit.tipo,
          esito: visit.esito,
          importo: visit.importo_vendita,
          prodotti: visit.prodotti_discussi,
          visit_notes: visit.notes
        }
      };
    }
    
    case "search_visits_by_product": {
      let query = supabase
        .from("visits")
        .select("id, account_id, data_visita, tipo, esito, importo_vendita, prodotti_discussi")
        .eq("user_id", userId)
        .ilike("prodotti_discussi", `%${args.product}%`)
        .order("data_visita", { ascending: false });
      
      if (args.day) {
        const now = new Date();
        let fromDate: Date;
        switch (args.day) {
          case "today":
            fromDate = new Date(now.toDateString());
            break;
          case "yesterday":
            fromDate = new Date(now);
            fromDate.setDate(fromDate.getDate() - 1);
            query = query.eq("data_visita", fromDate.toISOString().split('T')[0]);
            break;
          case "week":
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
            break;
          default:
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            query = query.gte("data_visita", fromDate.toISOString().split('T')[0]);
        }
      }
      
      const { data, error } = await query.limit(10);
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { found: false, message: `Nessuna visita trovata con prodotto "${args.product}"` };
      }
      
      return {
        found: true,
        product: args.product,
        visits: data.map((v: any) => ({
          client_id: v.account_id,
          date: v.data_visita,
          importo: v.importo_vendita,
          prodotti: v.prodotti_discussi
        })),
        count: data.length
      };
    }
    
    case "generate_pdf_report": {
      // Restituisce un comando speciale che il frontend intercetterà
      const filters: Record<string, string> = {};
      if (args.city_filter) filters.city = args.city_filter;
      if (args.tipo_filter) filters.tipo = args.tipo_filter;
      if (args.period) filters.period = args.period;
      
      return {
        action: "GENERATE_PDF",
        report_type: args.report_type,
        filters,
        // Il frontend userà questi dati per generare il PDF
      };
    }
    
    default:
      return { error: "Funzione non trovata" };
  }
}

// ==================== FORMAT RESPONSE ====================

function formatToolResult(name: string, result: any): string {
  switch (name) {
    case "search_clients": {
      if (result.count === 0) return "Nessun cliente trovato.";
      if (result.clients) {
        // Lista clienti
        const lines = result.clients.slice(0, 10).map((c: any, i: number) => {
          let line = `${i + 1}. [CLIENT:${c.id}]`;
          if (c.tipo_locale) line += ` - ${c.tipo_locale}`;
          if (c.city) line += ` - ${c.city}`;
          return line;
        });
        return lines.join("\n") + (result.count > 10 ? `\n\n...e altri ${result.count - 10}` : "");
      }
      // Solo count
      return `${result.count}`;
    }
    
    case "get_visits": {
      if (result.count === 0) return "Nessuna visita trovata.";
      const lines = result.visits.slice(0, 10).map((v: any, i: number) => {
        const data = new Date(v.data_visita).toLocaleDateString("it-IT");
        let line = `${i + 1}. ${data} - [CLIENT:${v.account_id}] - ${v.tipo || "visita"}`;
        if (v.importo_vendita) line += ` - €${v.importo_vendita}`;
        return line;
      });
      return lines.join("\n");
    }
    
    case "get_sales_summary": {
      if (result.total === 0) return `Nessuna vendita ${result.period}.`;
      return `**€${result.total.toLocaleString("it-IT")}** ${result.period} (${result.orderCount} ordini)`;
    }
    
    case "navigate_to_page": {
      return `📂 **${result.name}**\n\n👉 [Clicca qui per aprire](${result.url})`;
    }
    
    case "search_in_notes": {
      if (!result.found) return result.message;
      const lines = result.results.slice(0, 5).map((r: any, i: number) => {
        let line = `${i + 1}. [CLIENT:${r.client_id}]`;
        if (r.city) line += ` (${r.city})`;
        line += `\n   📝 "${r.snippet}"`;
        return line;
      });
      return lines.join("\n\n");
    }
    
    case "get_visit_by_position": {
      if (!result.found) return result.message;
      const v = result.visit;
      const dayLabel = result.day === 'yesterday' ? 'ieri' : result.day === 'tomorrow' ? 'domani' : 'oggi';
      let text = `**Visita #${result.position} di ${dayLabel}:**\n\n`;
      text += `👤 [CLIENT:${v.client_id}]`;
      if (v.client_city) text += ` - ${v.client_city}`;
      if (v.client_tipo) text += ` (${v.client_tipo})`;
      text += '\n';
      if (v.esito) text += `📋 Esito: ${v.esito}\n`;
      if (v.importo) text += `💰 Importo: €${v.importo}\n`;
      if (v.prodotti) text += `📦 Prodotti: ${v.prodotti}\n`;
      if (v.client_notes) text += `\n📝 Note cliente: ${v.client_notes}`;
      return text;
    }
    
    case "search_visits_by_product": {
      if (!result.found) return result.message;
      let text = `Trovate **${result.count}** visite con "${result.product}":\n\n`;
      result.visits.slice(0, 5).forEach((v: any, i: number) => {
        const date = new Date(v.date).toLocaleDateString('it-IT');
        text += `${i + 1}. [CLIENT:${v.client_id}] - ${date}`;
        if (v.importo) text += ` - €${v.importo}`;
        text += '\n';
      });
      return text;
    }
    
    case "generate_pdf_report": {
      // Marker speciale che il frontend intercetta
      const filterDesc = Object.entries(result.filters || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ') || 'nessuno';
      
      return `[PDF_COMMAND:${JSON.stringify(result)}]\n\n📄 **Report PDF pronto!**\n\nTipo: ${result.report_type}\nFiltri: ${filterDesc}\n\n👉 Clicca il pulsante qui sotto per scaricare il PDF.`;
    }
    
    default:
      return JSON.stringify(result);
  }
}

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
      tools,
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
  return NextResponse.json({ ok: true, model: MODEL, version: "3.0-function-calling" });
}
