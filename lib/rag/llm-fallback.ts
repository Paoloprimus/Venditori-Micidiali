// lib/rag/llm-fallback.ts
// Fallback a Claude per query che l'NLU non capisce

import Anthropic from '@anthropic-ai/sdk';
import { searchAccountsWithThreshold, formatRAGContext, type SearchResult } from './search';

// Lazy init Anthropic client
let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }
    _anthropic = new Anthropic({ apiKey });
  }
  return _anthropic;
}

const SYSTEM_PROMPT = `Sei l'assistente REPING per agenti di commercio.
Rispondi in italiano, in modo conciso e utile.
Se ti vengono forniti "Clienti rilevanti", usali per rispondere.
Non inventare dati. Se non sai qualcosa, dillo chiaramente.
Rispondi in massimo 2-3 frasi quando possibile.`;

export interface LLMResponse {
  text: string;
  ragResults: SearchResult[];
  tokensUsed: number;
}

/**
 * Genera una risposta con Claude usando RAG context
 */
export async function generateWithRAG(
  query: string,
  userId: string,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
): Promise<LLMResponse> {
  // 1. Cerca contesto RAG
  const ragResults = await searchAccountsWithThreshold(query, userId, 0.6, 5);
  const ragContext = formatRAGContext(ragResults);
  
  // 2. Costruisci messaggio con contesto
  let userMessage = query;
  if (ragContext) {
    userMessage = `${ragContext}\n\n---\nDomanda utente: ${query}`;
  }
  
  // 3. Prepara history (max ultimi 6 messaggi)
  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  if (conversationHistory && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-6);
    messages.push(...recent);
  }
  messages.push({ role: 'user', content: userMessage });
  
  // 4. Chiama Claude
  try {
    const anthropic = getAnthropic();
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: messages,
    });
    
    const text = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'Mi dispiace, non sono riuscito a generare una risposta.';
    
    return {
      text,
      ragResults,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  } catch (e: any) {
    console.error('[LLM:fallback] Errore Claude:', e);
    
    // Fallback se Claude non disponibile
    if (ragResults.length > 0) {
      return {
        text: `Ho trovato ${ragResults.length} clienti che potrebbero essere rilevanti: ${ragResults.map(r => r.name).join(', ')}. Puoi chiedermi dettagli specifici su uno di loro.`,
        ragResults,
        tokensUsed: 0,
      };
    }
    
    return {
      text: 'Mi dispiace, non ho capito la richiesta. Prova a riformulare o usa comandi come "quanti clienti ho" o "visite di oggi".',
      ragResults: [],
      tokensUsed: 0,
    };
  }
}

/**
 * Verifica se una query dovrebbe usare il fallback LLM
 */
export function shouldUseLLMFallback(intent: string, confidence: number): boolean {
  // Usa LLM se:
  // 1. Intent è unknown
  // 2. Confidence è molto bassa
  // 3. Intent è di tipo analytics/strategy (complessi)
  
  if (intent === 'unknown') return true;
  if (confidence < 0.5) return true;
  if (intent.startsWith('analytics_') || intent.startsWith('strategy_')) return true;
  
  return false;
}
