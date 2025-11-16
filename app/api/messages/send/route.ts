// app/api/messages/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { encryptText, decryptText } from "@/lib/crypto/serverEncryption";

// ===== IMPORT SISTEMA SEMANTICO =====
import { planQuery } from "@/lib/semantic/planner";
import { executeQueryPlan } from "@/lib/semantic/executor";
import { composeResponse, isOutOfScope, getOutOfScopeResponse } from "@/lib/semantic/composer";
import { validateQueryPlan } from "@/lib/semantic/validator";
import { PreviousContext } from "@/lib/semantic/types";
// ===== FINE IMPORT =====

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Config base
const MODEL  = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const SYSTEM = process.env.OPENAI_SYSTEM_PROMPT || "Rispondi in italiano in modo chiaro e conciso.";

// Tabelle
const CONVERSATIONS_TABLE = process.env.DB_CONVERSATIONS_TABLE || "conversations";
const MESSAGES_TABLE      = process.env.DB_MESSAGES_TABLE || "messages";

// ===== FUNZIONI HELPER PER CONTESTO =====

/**
 * Marker invisibile per salvare contesto nel messaggio
 */
const CONTEXT_MARKER_START = '\n\n<!--SEMANTIC_CONTEXT:';
const CONTEXT_MARKER_END = '-->';

/**
 * Crea marker contesto da aggiungere al messaggio assistant
 */
function createContextMarker(context: PreviousContext): string {
  const contextJson = JSON.stringify(context);
  return `${CONTEXT_MARKER_START}${contextJson}${CONTEXT_MARKER_END}`;
}

/**
 * Estrae contesto dall'ultimo messaggio con marker
 */
function extractContextFromMessage(messageBody: string): PreviousContext | undefined {
  try {
    const startIdx = messageBody.lastIndexOf(CONTEXT_MARKER_START);
    if (startIdx === -1) return undefined;
    
    const endIdx = messageBody.indexOf(CONTEXT_MARKER_END, startIdx);
    if (endIdx === -1) return undefined;
    
    const contextJson = messageBody.substring(
      startIdx + CONTEXT_MARKER_START.length, 
      endIdx
    );
    
    return JSON.parse(contextJson);
  } catch (error) {
    console.error('[extractContext] Parse error:', error);
    return undefined;
  }
}

/**
 * Recupera contesto dalla conversazione recente
 */
async function getPreviousContext(
  conversationId: string, 
  supabase: any
): Promise<PreviousContext | undefined> {
  try {
    // Prendi ultimi 5 messaggi assistant
    const { data: messages, error } = await supabase
      .from(MESSAGES_TABLE)
      .select('body_enc, body_iv, body_tag, created_at')
      .eq('conversation_id', conversationId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error || !messages || messages.length === 0) {
      return undefined;
    }
    
    // Cerca marker nell'ultimo messaggio assistant
    for (const msg of messages) {
      try {
        const decrypted = decryptText(msg.body_enc, msg.body_iv, msg.body_tag);
        const context = extractContextFromMessage(decrypted);
        if (context) {
          console.log('[getPreviousContext] Found context from:', context.userQuery);
          return context;
        }
      } catch (decryptError) {
        // Ignora errori di decriptazione, passa al messaggio successivo
        continue;
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('[getPreviousContext] Error:', error);
    return undefined;
  }
}

/**
 * Estrae ID risultati dalla query result
 */
function extractResultIds(data: any[]): string[] {
  if (!data || data.length === 0) return [];
  
  // Cerca campo "id" o "account_id"
  return data
    .map(row => row.id || row.account_id)
    .filter(id => id && typeof id === 'string')
    .slice(0, 100); // Max 100 ID per evitare marker troppo lunghi
}

/**
 * Determina se la query è NUOVA (standalone) o FOLLOW-UP (dipende da contesto)
 * 
 * @param query - Query utente
 * @returns true se è nuova (ignora contesto), false se è follow-up (usa contesto)
 */
function isNewQuery(query: string): boolean {
  const normalized = query.toLowerCase().trim();
  
  // 🎯 PATTERN FOLLOW-UP (dipendono da contesto precedente)
  const followUpPatterns = [
    /^mostra dettagli?$/i,
    /^elenca( tutti)?$/i,
    /^mostra( tutto)?$/i,
    /^solo (quelli|quegli|quei|bar|ristoranti|pizzerie|clienti)/i,
    /^filtra per/i,
    /^ordina per/i,
    /^(i )?primi? \d+$/i,
    /^ultim[io] \d+$/i,
    /^con (fatturato|note|ordine|visita|importo)/i,
    /^aggiungi (fatturato|note|ordine|visita)/i,
    /^anche (fatturato|note|ordine|visita)/i,
    /^dimmi (il|i|le) (fatturato|note|ordine|visita)/i,
    /^mostrami (anche|pure)/i
  ];
  
  // Se matcha pattern follow-up → NON è nuova
  if (followUpPatterns.some(pattern => pattern.test(normalized))) {
    return false;
  }
  
  // 🎯 PATTERN QUERY NUOVE (standalone, complete)
  // Query che iniziano con interrogativi o verbi "informativi"
  const newQueryStarters = [
    /^quant[aeio]/i,        // "quanti clienti", "quanto ho venduto"
    /^qual[ei]/i,           // "quali clienti", "quale bar"
    /^chi/i,                // "chi sono i top clienti"
    /^dove/i,               // "dove sono i bar"
    /^quando/i,             // "quando ho visitato"
    /^come/i,               // "come stanno i clienti"
    /^dimmi (i|le|tutti)/i, // "dimmi i clienti", "dimmi tutti i bar"
    /^(trova|cerca|mostra) (i|le|tutti|tutte|clienti|bar|ristoranti)/i,
    /^elenca (i|le|tutti|tutte|clienti|bar|ristoranti)/i,
    /^lista (di )?clienti/i,
    /^top \d+/i,            // "top 5 clienti"
    /^clienti (che|non|con|senza|a|di|da)/i,  // "clienti non visitati", "clienti di Verona"
    /^bar (a|di|che|con|senza)/i,
    /^ristoranti? (a|di|che|con|senza)/i,
    /^pizzerie (a|di|che|con|senza)/i
  ];
  
  // Se matcha pattern nuova → È NUOVA
  if (newQueryStarters.some(pattern => pattern.test(normalized))) {
    return true;
  }
  
  // 🤔 EURISTICHE AGGIUNTIVE
  // Se la query è molto corta (<4 parole) E non ha verbi completi → probabile follow-up
  const wordCount = normalized.split(/\s+/).length;
  const hasCompleteVerb = /\b(sono|hanno|voglio|dammi|mostra|elenca|trova|cerca)\b/i.test(normalized);
  
  if (wordCount <= 3 && !hasCompleteVerb) {
    return false; // Probabile follow-up tipo "solo Verona", "con note"
  }
  
  // Default: se ha >4 parole e contiene sostantivi business → È NUOVA
  const hasBusinessNouns = /\b(clienti|bar|ristoranti?|pizzerie|hotel|gelateri[ae]|visite?|vendite?|fatturato)\b/i.test(normalized);
  if (wordCount > 4 && hasBusinessNouns) {
    return true;
  }
  
  // Default conservativo: tratta come follow-up se ambiguo
  return false;
}

// ===== FINE FUNZIONI HELPER =====

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const content = String(body?.content ?? "").trim();
    const conversationId = body?.conversationId ? String(body.conversationId) : undefined;
    const terse = Boolean(body?.terse);

    if (!content)        return NextResponse.json({ error: "content mancante" }, { status: 400 });
    if (!conversationId) return NextResponse.json({ error: "conversationId mancante" }, { status: 400 });
    if (content.length > 8000) return NextResponse.json({ error: "content troppo lungo" }, { status: 413 });

    const supabase = getSupabaseAdmin();

    // 0) Recupera l'owner della conversazione (user_id)
    const conv = await supabase
      .from(CONVERSATIONS_TABLE)
      .select("user_id")
      .eq("id", conversationId)
      .single();

    if (conv.error || !conv.data) {
      console.error("[send] conversation lookup error:", conv.error);
      return NextResponse.json(
        { error: "conversation_not_found", details: conv.error?.message },
        { status: 404 }
      );
    }

    const ownerUserId = conv.data.user_id;

    // 🔐 CIFRA il messaggio USER prima di salvarlo
    const userEnc = encryptText(content);

    // 1) Salva messaggio USER cifrato
    const insUser = await supabase
      .from(MESSAGES_TABLE)
      .insert({
        conversation_id: conversationId,
        user_id: ownerUserId,
        role: "user",
        body_enc: userEnc.ciphertext,
        body_iv: userEnc.iv,
        body_tag: userEnc.tag,
        content: null, // ← campo vecchio vuoto
      })
      .select("id")
      .single();

    if (insUser.error) {
      console.error("[send] insert user msg error:", insUser.error);
      return NextResponse.json(
        { error: "insert_user_failed", details: insUser.error.message, code: insUser.error.code },
        { status: 500 }
      );
    }

    // 1.b) INTENTO LOCALE: "quanti clienti ho?"
    const normalized = content.toLowerCase().trim();
    const askClients = /^(quanti|numero|n\.)\s+(clienti|accounts?)(\s+ho)?\??$/.test(normalized);

    if (askClients) {
      const { count, error } = await supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .or(`owner_id.eq.${ownerUserId},user_id.eq.${ownerUserId}`);

      const n = count ?? 0;
      const reply =
        error
          ? "Non riesco a contare i clienti adesso."
          : `Hai ${n} ${n === 1 ? "cliente" : "clienti"}.`;

      // 🔐 CIFRA la risposta locale
      const replyEnc = encryptText(reply);

      const insAsstLocal = await supabase
        .from(MESSAGES_TABLE)
        .insert({
          conversation_id: conversationId,
          user_id: ownerUserId,
          role: "assistant",
          body_enc: replyEnc.ciphertext,
          body_iv: replyEnc.iv,
          body_tag: replyEnc.tag,
          content: null,
        })
        .select("id")
        .single();

      if (insAsstLocal.error) {
        console.error("[send] insert assistant (count) msg error:", insAsstLocal.error);
      }

      return NextResponse.json({ reply }, { status: 200 });
    }

    // ========== INIZIO SISTEMA SEMANTICO ==========
    // Verifica se query è out of scope (non business-related)
    if (isOutOfScope(content)) {
      const reply = getOutOfScopeResponse();
      
      // 🔐 Cifra risposta
      const replyEnc = encryptText(reply);
      
      await supabase
        .from(MESSAGES_TABLE)
        .insert({
          conversation_id: conversationId,
          user_id: ownerUserId,
          role: "assistant",
          body_enc: replyEnc.ciphertext,
          body_iv: replyEnc.iv,
          body_tag: replyEnc.tag,
          content: null,
        });
      
      return NextResponse.json({ reply }, { status: 200 });
    }

    // Prova sistema semantico
    try {
      console.log('[send] Attempting semantic system for query:', content);
      
      // 🎯 DETERMINA SE QUERY È NUOVA O FOLLOW-UP
      const queryIsNew = isNewQuery(content);
      console.log('[send] Query type:', queryIsNew ? 'NEW (standalone)' : 'FOLLOW-UP (uses context)');
      
      // 🔄 RECUPERA CONTESTO PRECEDENTE (solo se è follow-up)
      let previousContext: PreviousContext | undefined = undefined;
      
      if (!queryIsNew) {
        previousContext = await getPreviousContext(conversationId, supabase);
        if (previousContext) {
          console.log('[send] Found previous context:', {
            query: previousContext.userQuery,
            resultCount: previousContext.resultCount
          });
        } else {
          console.log('[send] Follow-up query but no context found');
        }
      } else {
        console.log('[send] New query - ignoring any previous context');
      }
      
      // 1. Genera Query Plan (con contesto SOLO se follow-up E trovato)
      const queryPlan = await planQuery(content, ownerUserId, {}, previousContext);
      console.log('[send] Query plan generated:', JSON.stringify(queryPlan, null, 2));
      
      // 2. Valida Query Plan
      const validation = validateQueryPlan(queryPlan);
      if (!validation.valid) {
        throw new Error(`Query plan validation failed: ${validation.error}`);
      }
      
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn('[send] Query plan warnings:', validation.warnings);
      }
      
      // 3. Esegui Query
      const queryResult = await executeQueryPlan(queryPlan);
      console.log('[send] Query executed, success:', queryResult.success);
      
      if (!queryResult.success) {
        throw new Error(`Query execution failed: ${queryResult.error}`);
      }
      
      // 4. Componi risposta
      const semanticReply = await composeResponse(content, queryResult);
      console.log('[send] Semantic reply composed, length:', semanticReply.length);
      
      // 🔄 CREA CONTESTO PER PROSSIMA QUERY
      const newContext: PreviousContext = {
        userQuery: content,
        queryPlan,
        resultIds: queryResult.data ? extractResultIds(queryResult.data) : undefined,
        resultCount: queryResult.data?.length || queryResult.aggregated ? 1 : 0,
        timestamp: new Date().toISOString()
      };
      
      // Aggiungi marker invisibile alla risposta
      const replyWithContext = semanticReply + createContextMarker(newContext);
      
      // 🔐 Cifra risposta semantica CON contesto
      const semanticEnc = encryptText(replyWithContext);
      
      // Salva messaggio assistant
      const insAsstSemantic = await supabase
        .from(MESSAGES_TABLE)
        .insert({
          conversation_id: conversationId,
          user_id: ownerUserId,
          role: "assistant",
          body_enc: semanticEnc.ciphertext,
          body_iv: semanticEnc.iv,
          body_tag: semanticEnc.tag,
          content: null,
        })
        .select("id")
        .single();
      
      if (insAsstSemantic.error) {
        console.error('[send] insert assistant semantic msg error:', insAsstSemantic.error);
      }
      
      console.log('[send] ✅ Semantic system succeeded');
      // Ritorna risposta SENZA marker (invisibile al frontend)
      return NextResponse.json({ reply: semanticReply }, { status: 200 });
      
    } catch (semanticError: any) {
      // Log dettagliato dell'errore
      console.error('[send] ❌ Semantic system error:');
      console.error('  Error type:', semanticError.constructor.name);
      console.error('  Error message:', semanticError.message);
      console.error('  Error stack:', semanticError.stack);
      console.error('  Query was:', content);
      
      // Se è un errore di validazione, restituiscilo invece di fallback
      if (semanticError.message?.includes('validation')) {
        console.error('[send] Validation error - should not happen!');
      }
      
      // Prosegue al blocco OpenAI standard sotto
    }
    // ========== FINE SISTEMA SEMANTICO ==========

    // 2) Fallback: Chiama OpenAI standard (come prima)
    // SYSTEM PROMPT MODIFICATO per limitare AI
    const sys = `${SYSTEM}

IMPORTANTE: Sei l'assistente REPING per la gestione commerciale nel settore HoReCa.

Rispondi SOLO se la domanda riguarda:
- Clienti e portafoglio
- Visite e chiamate
- Promemoria e task
- Note commerciali
- Prodotti del catalogo
- Pianificazione vendite
- Statistiche business

Se l'utente chiede informazioni generali (meteo, sport, notizie, politica, ricette, ecc.):
Rispondi educatamente: "Non posso aiutarti con questa richiesta. Sono specializzato nella gestione del tuo portafoglio commerciale HoReCa. Posso assisterti con clienti, visite, promemoria, statistiche e pianificazione. Come posso aiutarti?"

${terse ? "Rispondi molto brevemente." : ""}`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: sys },
        { role: "user", content }, // ← in chiaro per OpenAI
      ],
      temperature: 0.3,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "Ok.";

    // 🔐 CIFRA la risposta dell'assistente prima di salvarla
    const assistantEnc = encryptText(reply);

    // 3) Salva messaggio ASSISTANT cifrato
    const insAsst = await supabase
      .from(MESSAGES_TABLE)
      .insert({
        conversation_id: conversationId,
        user_id: ownerUserId,
        role: "assistant",
        body_enc: assistantEnc.ciphertext,
        body_iv: assistantEnc.iv,
        body_tag: assistantEnc.tag,
        content: null, // ← campo vecchio vuoto
      })
      .select("id")
      .single();

    if (insAsst.error) {
      console.error("[send] insert assistant msg error:", insAsst.error);
    }

    return NextResponse.json({ reply }); // ← ritorna in chiaro al client (transitorio)
  } catch (err: any) {
    // Gestione errori quota OpenAI
    const status = err?.status ?? 500;
    const type   = err?.error?.type ?? err?.code;
    const retryHeader = err?.headers?.get?.("retry-after");
    const retryAfter = retryHeader ? Number(retryHeader) : undefined;

    if (status === 429 || type === "insufficient_quota") {
      return NextResponse.json(
        { error: "QUOTA_ESAURITA", message: "Quota OpenAI esaurita o rate limit.", retryAfter },
        { status: 429 }
      );
    }

    if (typeof err?.message === "string" && err.message.includes("[supabase] Missing env")) {
      console.error(err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    console.error("[/api/messages/send] ERROR:", err);
    return NextResponse.json({ error: err?.message || "Errore interno" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, model: MODEL });
}
