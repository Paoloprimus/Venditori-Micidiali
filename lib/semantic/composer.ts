// lib/semantic/composer.ts
// Response Composer - Formatta risultati query in risposta naturale

import OpenAI from 'openai';
import { QueryResult, ResponseContext } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Compone risposta naturale da risultati query
 */
export async function composeResponse(
  userQuery: string,
  queryResult: QueryResult,
  context?: Partial<ResponseContext>
): Promise<string> {
  // Gestione errori
  if (!queryResult.success) {
    return `Mi dispiace, non sono riuscito a elaborare la richiesta: ${queryResult.error}`;
  }
  
  // Nessun risultato
  if (!queryResult.data && !queryResult.aggregated) {
    return 'Non ho trovato risultati per questa query.';
  }
  
  if (queryResult.data && queryResult.data.length === 0 && !queryResult.aggregated) {
    return 'Non ho trovato risultati corrispondenti ai criteri specificati.';
  }
  
  // Prepara context per LLM
  let contextText = '';
  
  // Dati aggregati (priorità alta)
  if (queryResult.aggregated) {
    contextText += '=== RISULTATO AGGREGATO ===\n';
    contextText += JSON.stringify(queryResult.aggregated, null, 2) + '\n\n';
  }
  
  // Dati dettaglio (se presenti e non troppi)
  if (queryResult.data && queryResult.data.length > 0) {
    const rowCount = queryResult.data.length;
    contextText += `=== DATI (${rowCount} risultat${rowCount === 1 ? 'o' : 'i'}) ===\n`;
    
    // Limita dati per non superare context window
    const maxRows = 20;
    const dataToShow = queryResult.data.slice(0, maxRows);
    
    contextText += JSON.stringify(dataToShow, null, 2);
    
    if (rowCount > maxRows) {
      contextText += `\n\n... e altri ${rowCount - maxRows} risultati non mostrati`;
    }
  }
  
  // System prompt per composer
  const systemPrompt = `Sei l'assistente REPING per agenti di commercio nel settore HoReCa.

COMPITO:
Trasforma i dati forniti in una risposta chiara, utile e in italiano.

REGOLE:
1. Rispondi in modo naturale e conversazionale
2. Evidenzia numeri e informazioni chiave
3. Usa elenchi puntati quando ci sono più risultati
4. NON inventare dati non presenti nel context
5. Se ci sono risultati aggregati (count, sum, avg), presentali in modo chiaro
6. NON menzionare ID o campi tecnici a meno che non sia essenziale
7. Sii conciso ma completo
8. Usa emoji appropriati per migliorare leggibilità (📊 📈 🏆 ✅ ❌ 📍)

PRIVACY:
- I nomi dei clienti NON sono disponibili per privacy
- Riferisciti ai clienti per città, tipo_locale, o ID (se necessario)
- NON menzionare dati cifrati o sensibili

FORMATO:
- Per liste brevi (1-5 item): elenco numerato
- Per liste medie (6-15 item): riassunto + primi item
- Per liste lunghe (15+): solo statistiche aggregate
- Per aggregazioni: presenta il numero chiave in evidenza

ESEMPI:

Input: {"count": 47}
Output: "Hai 47 clienti totali nel tuo portafoglio. 📊"

Input: {"sum": 15420.50}
Output: "Il totale delle vendite è €15.420,50. 💰"

Input: [{"city": "Verona", "tipo_locale": "bar"}, {"city": "Milano", "tipo_locale": "ristorante"}]
Output: "Ho trovato 2 clienti:
1. Bar a Verona 🍺
2. Ristorante a Milano 🍝"

Input: {"count": 3}, Data: [...]
Output: "Hai 3 clienti che soddisfano i criteri. Ecco i dettagli: ..."`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Query originale: "${userQuery}"\n\n${contextText}` 
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    const response = completion.choices[0].message.content?.trim();
    
    if (!response) {
      return 'Ho elaborato i dati ma non riesco a formulare una risposta.';
    }
    
    return response;
    
  } catch (error: any) {
    console.error('[composer] Error:', error);
    
    // Fallback: risposta semplice senza LLM
    if (queryResult.aggregated) {
      return formatAggregatedFallback(queryResult.aggregated);
    }
    
    if (queryResult.data && queryResult.data.length > 0) {
      return `Ho trovato ${queryResult.data.length} risultati per la tua query.`;
    }
    
    return 'Risposta non disponibile.';
  }
}

/**
 * Formatta risultato aggregato senza LLM (fallback)
 */
function formatAggregatedFallback(aggregated: any): string {
  if (typeof aggregated === 'object' && aggregated !== null) {
    if ('count' in aggregated) {
      return `Risultato: ${aggregated.count}`;
    }
    if ('sum' in aggregated) {
      return `Totale: €${aggregated.sum.toFixed(2)}`;
    }
    if ('avg' in aggregated) {
      return `Media: ${aggregated.avg.toFixed(2)}`;
    }
    if ('min' in aggregated) {
      return `Minimo: ${aggregated.min}`;
    }
    if ('max' in aggregated) {
      return `Massimo: ${aggregated.max}`;
    }
  }
  
  return JSON.stringify(aggregated);
}

/**
 * Verifica se una query è "out of scope" (non business-related)
 */
export function isOutOfScope(query: string): boolean {
  const normalized = query.toLowerCase().trim();
  
  // Pattern per query generali (non business)
  const outOfScopePatterns = [
    /chi ha vinto/i,
    /che tempo fa/i,
    /meteo/i,
    /notizie/i,
    /sport/i,
    /calcio/i,
    /politica/i,
    /ricetta/i,
    /come si fa/i,
    /cos[ìi]'[èe]/i,
    /significato di/i,
    /definizione di/i,
    /storia di/i,
    /biografia/i
  ];
  
  return outOfScopePatterns.some(pattern => pattern.test(normalized));
}

/**
 * Genera risposta per query out of scope
 */
export function getOutOfScopeResponse(): string {
  return `Non posso aiutarti con questa richiesta. Sono specializzato nella gestione commerciale del tuo portafoglio HoReCa.

Posso assisterti con:
• Clienti e visite
• Promemoria e task
• Statistiche vendite
• Pianificazione commerciale
• Note e appunti

Come posso aiutarti con la tua attività? 💼`;
}
