// lib/semantic/composer.ts
// Response Composer - Formatta risultati query in risposta naturale

import OpenAI from 'openai';
import { QueryResult, ResponseContext } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Determina se la query richiede una risposta sintetica o dettagliata
 */
function needsDetailedResponse(query: string): boolean {
  const normalized = query.toLowerCase().trim();
  
  // Pattern che richiedono dettagli
  const detailPatterns = [
    /dettagli/i,
    /lista completa/i,
    /elenca/i,
    /mostra tutt/i,
    /dimmi tutto/i,
    /quali sono/i,
    /descrivi/i,
    /informazioni su/i
  ];
  
  return detailPatterns.some(pattern => pattern.test(normalized));
}

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
  
  // NUOVO: Risposte sintetiche per query semplici
  const wantsDetails = needsDetailedResponse(userQuery);
  const hasMultipleResults = queryResult.data && queryResult.data.length > 1;
  
  // Se query semplice e più risultati → risposta breve con count
  if (!wantsDetails && hasMultipleResults && !queryResult.aggregated) {
    const count = queryResult.data!.length;
    
    // Estrai info base per risposta sintetica
    const firstItem = queryResult.data![0];
    let entityType = 'risultati';
    
    if (firstItem.tipo_locale) entityType = firstItem.tipo_locale.toLowerCase() + (count > 1 ? '' : '');
    if (firstItem.tipo) entityType = 'contatti'; // visits
    if (firstItem.nota) entityType = 'promemoria';
    
    let location = '';
    if (firstItem.city) location = ` a ${firstItem.city}`;
    
    return `Ho trovato ${count} ${entityType}${location}. 📊\n\nVuoi vedere i dettagli? Chiedi "mostra dettagli" o "elenca tutti".`;
  }
  
  // Prepara context per LLM
  let contextText = '';
  
  // Dati aggregati (priorità alta)
  if (queryResult.aggregated) {
    contextText += '=== RISULTATO AGGREGATO ===\n';
    contextText += JSON.stringify(queryResult.aggregated, null, 2) + '\n\n';
  }
  
  // Dati dettaglio
  if (queryResult.data && queryResult.data.length > 0) {
    const rowCount = queryResult.data.length;
    contextText += `=== DATI (${rowCount} risultat${rowCount === 1 ? 'o' : 'i'}) ===\n`;
    
    // Se vuole dettagli, mostra più dati
    const maxRows = wantsDetails ? 20 : 5;
    const dataToShow = queryResult.data.slice(0, maxRows);
    
    contextText += JSON.stringify(dataToShow, null, 2);
    
    if (rowCount > maxRows) {
      contextText += `\n\n... e altri ${rowCount - maxRows} risultati non mostrati`;
    }
  }
  
  // System prompt per composer
  const systemPrompt = `Sei REPING, assistente per agenti HoReCa.

REGOLE ASSOLUTE:
1. Se la query chiede "quanti" → rispondi SOLO con il numero. NIENTE ALTRO.
2. Se la query chiede "quanto" (somma) → rispondi SOLO con l'importo. NIENTE ALTRO.
3. MAI aggiungere frasi finali tipo "Se hai bisogno..." o "Fammi sapere"
4. MAI aggiungere dettagli non richiesti
5. MAI usare emoji
6. Sii professionale e conciso - sono professionisti indaffarati

⚠️ RISULTATI AGGREGATI CON RANKING:
Se ricevi array di oggetti con "account_id" e "sum"/"count":
- Sono risultati di TOP/RANKING clienti
- Gli account_id sono UUID e i nomi sono CIFRATI (privacy)
- NON menzionare gli UUID
- Presenta i risultati numerati con il valore aggregato

Esempio corretto per "top 5 clienti per fatturato":
"I tuoi top 5 clienti per fatturato:
1. €12.450,00
2. €8.320,50
3. €7.100,00
4. €6.890,00
5. €5.200,00"

❌ NON dire: "Cliente abc-123 ha venduto..."
✅ DÌ: Presenta i valori numerati senza menzionare ID

ESEMPI CORRETTI:

Query: "Quanti clienti ho?"
Output: "Hai 47 clienti."

Query: "Quanti bar a Verona?"
Output: "Hai 7 bar a Verona."

Query: "Quanto ho venduto?"
Output: "€15.420,50"

Query: "Quanti promemoria urgenti?"
Output: "Hai 3 promemoria urgenti."

ESEMPI SBAGLIATI (NON FARE):
❌ "Hai 47 clienti. 📊"
❌ "Hai 7 bar a Verona. 🍺 Ecco i dettagli..."
❌ "€15.420,50 💰"

FORMATO:
- Query "quanti/quanto" → SOLO numero (max 10 parole)
- Query "mostra/elenca" → lista dettagliata
- Sempre conciso, mai verbose
- ZERO emoji`;

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
  return `Non posso aiutarti con questa richiesta. Sono specializzato nella gestione commerciale HoReCa: clienti, visite, promemoria, statistiche e pianificazione.`;
}
