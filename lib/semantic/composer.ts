// lib/semantic/composer.ts
// Response Composer - Formatta risultati query in risposta naturale

import OpenAI from 'openai';
import { QueryResult, ResponseContext } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Determina se la query è VAGA (chiede dettagli generici senza specificare cosa)
 */
function isVagueDetailsQuery(query: string): boolean {
  const normalized = query.toLowerCase().trim();
  
  // Pattern VAGHI - non specificano COSA mostrare
  const vaguePatterns = [
    /^mostra dettagli?$/i,
    /^elenca( tutti)?$/i,
    /^mostra( tutto)?$/i,
    /^dimmi tutto$/i,
    /^lista completa$/i,
    /^vedi( tutto)?$/i,
    /^fammi vedere$/i
  ];
  
  // Se matcha pattern vago E NON contiene campi specifici → è VAGA
  const hasVaguePattern = vaguePatterns.some(pattern => pattern.test(normalized));
  
  if (!hasVaguePattern) return false;
  
  // Verifica che NON contenga campi specifici
  const specificFields = [
    'fatturato', 'vendita', 'ordine', 'importo', 'euro', '€',
    'nota', 'note', 'commento', 'annotazione',
    'visita', 'chiamata', 'contatto', 'ultima',
    'telefono', 'email', 'indirizzo',
    'prodotto', 'articolo', 'ordini'
  ];
  
  const hasSpecificField = specificFields.some(field => 
    normalized.includes(field)
  );
  
  return !hasSpecificField; // È VAGA solo se non ha campi specifici
}

/**
 * Determina se la query è SPECIFICA (chiede campi precisi)
 */
function isSpecificDetailsQuery(query: string): boolean {
  const normalized = query.toLowerCase().trim();
  
  // Pattern SPECIFICI - indicano COSA mostrare
  const specificPatterns = [
    /con (fatturato|vendita|ordine|importo|note|visita|ultima)/i,
    /(mostra|elenca|dammi).*(fatturato|vendita|ordine|importo|note|visita|ultima)/i,
    /(fatturato|vendita|ordine|importo|note|visita|ultima).*(e|con)/i,
    /solo (il |i )?(fatturato|vendita|ordine|importo|note|visita|ultima)/i
  ];
  
  return specificPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Determina se la query richiede una risposta sintetica o dettagliata
 */
function needsDetailedResponse(query: string): boolean {
  // Se è specifica → mostra dettagli richiesti
  if (isSpecificDetailsQuery(query)) return true;
  
  // Se è vaga → NON mostrare tutto (chiederemo cosa vuole)
  if (isVagueDetailsQuery(query)) return false;
  
  const normalized = query.toLowerCase().trim();
  
  // Altri pattern che richiedono dettagli
  const detailPatterns = [
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
  
  // NUOVO: Gestione query VAGHE vs SPECIFICHE
  const isVague = isVagueDetailsQuery(userQuery);
  const isSpecific = isSpecificDetailsQuery(userQuery);
  const wantsDetails = needsDetailedResponse(userQuery);
  const hasMultipleResults = queryResult.data && queryResult.data.length > 1;
  
  // 🎯 CASO 1: Query VAGA ("mostra dettagli" generico)
  if (isVague && hasMultipleResults && !queryResult.aggregated) {
    const count = queryResult.data!.length;
    
    // Se >10 record → proponi PDF
    if (count > 10) {
      return `Ho trovato ${count} clienti. Se vuoi creo il PDF e lo salvo sul tuo dispositivo. Dimmi quali dati mostrare.`;
    }
    
    const maxShow = Math.min(count, 10);
    
    // Crea lista minima con solo [CLIENT:uuid] - Tipo - Città
    let response = `Ecco i ${count} clienti:\n`;
    
    for (let i = 0; i < maxShow; i++) {
      const item = queryResult.data![i];
      const clientId = item.id || item.account_id || 'unknown';
      const tipo = item.tipo_locale || item.tipo || '';
      const city = item.city || '';
      
      response += `${i + 1}. [CLIENT:${clientId}]`;
      if (tipo) response += ` - ${tipo}`;
      if (city) response += ` - ${city}`;
      response += '\n';
    }
    
    return response;
  }
  
  // 🎯 CASO 2: Query semplice (non dettagli) → risposta asciutta con solo numero
  if (!wantsDetails && !isVague && hasMultipleResults && !queryResult.aggregated) {
    const count = queryResult.data!.length;
    
    // Se >10 record → proponi PDF
    if (count > 10) {
      return `Ho trovato ${count} clienti. Se vuoi creo il PDF e lo salvo sul tuo dispositivo. Dimmi quali dati mostrare.`;
    }
    
    // Altrimenti solo numero
    return `${count}`;
  }
  
  // 🎯 CASO 3: Aggregazioni SEMPLICI → Template fisso (NO LLM)
  if (queryResult.aggregated && !queryResult.data) {
    const agg = queryResult.aggregated;
    
    // COUNT semplice
    if ('count' in agg && Object.keys(agg).length === 1) {
      return `${agg.count}`;
    }
    
    // SUM semplice
    if ('sum' in agg && Object.keys(agg).length === 1) {
      return `€${Number(agg.sum).toFixed(2)}`;
    }
    
    // AVG semplice
    if ('avg' in agg && Object.keys(agg).length === 1) {
      return `€${Number(agg.avg).toFixed(2)}`;
    }
    
    // MIN/MAX
    if ('min' in agg || 'max' in agg) {
      if ('min' in agg && 'max' in agg) {
        return `Min: €${Number(agg.min).toFixed(2)}, Max: €${Number(agg.max).toFixed(2)}`;
      }
      if ('min' in agg) return `€${Number(agg.min).toFixed(2)}`;
      if ('max' in agg) return `€${Number(agg.max).toFixed(2)}`;
    }
  }
  
  // 🎯 CASO 4: TOP/RANKING con groupBy → Template con placeholder
  if (queryResult.data && queryResult.data.length > 0 && queryResult.data[0].account_id && 
      ('sum' in queryResult.data[0] || 'count' in queryResult.data[0])) {
    
    const isSum = 'sum' in queryResult.data[0];
    const data = queryResult.data;
    
    let response = isSum ? 'Top clienti per fatturato:\n' : 'Top clienti per numero visite:\n';
    
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const item = data[i];
      const value = isSum ? `€${Number(item.sum).toFixed(2)}` : `${item.count} visite`;
      response += `${i + 1}. [CLIENT:${item.account_id}] - ${value}\n`;
    }
    
    if (data.length > 10) {
      response += `\n... e altri ${data.length - 10} clienti`;
    }
    
    return response;
  }
  
  // 🎯 CASO 5: Liste semplici senza dettagli extra → NO LLM
  if (queryResult.data && queryResult.data.length > 0 && !queryResult.aggregated) {
    const hasOnlyBasicFields = queryResult.data.every(item => {
      const fields = Object.keys(item);
      return fields.length <= 5; // Solo id, tipo_locale, city, etc
    });
    
    if (hasOnlyBasicFields) {
      const count = queryResult.data.length;
      
      // Se >10 record → proponi PDF
      if (count > 10) {
        return `Ho trovato ${count} clienti. Se vuoi creo il PDF e lo salvo sul tuo dispositivo. Dimmi quali dati mostrare.`;
      }
      
      let response = `Ecco i ${count} ${count === 1 ? 'risultato' : 'risultati'}:\n`;
      
      for (let i = 0; i < count; i++) {
        const item = queryResult.data[i];
        const clientId = item.id || item.account_id || 'unknown';
        const tipo = item.tipo_locale || item.tipo || '';
        const city = item.city || '';
        
        response += `${i + 1}. [CLIENT:${clientId}]`;
        if (tipo) response += ` - ${tipo}`;
        if (city) response += ` - ${city}`;
        response += '\n';
      }
      
      return response;
    }
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
    // Per query specifiche mostra fino a 100, per dettagli generici 20
    const maxRows = (wantsDetails || isSpecific) ? Math.min(rowCount, 100) : 5;
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
- Gli account_id sono UUID dei clienti
- DEVI includere l'account_id come placeholder per la decifratura frontend
- Formato: [CLIENT:uuid]

Esempio corretto per "top 5 clienti per fatturato":
"I tuoi top 5 clienti per fatturato:
1. [CLIENT:abc-123-def-456] - €12.450,00
2. [CLIENT:xyz-789-uvw-012] - €8.320,50
3. [CLIENT:qwe-345-rty-678] - €7.100,00
4. [CLIENT:asd-901-fgh-234] - €6.890,00
5. [CLIENT:zxc-567-bnm-890] - €5.200,00"

✅ IMPORTANTE per CLIENTI (risultati aggregati con account_id): 
- Usa SEMPRE il formato [CLIENT:uuid] con l'account_id completo
- Il frontend lo decifrerà automaticamente e mostrerà il nome reale
- NON scrivere "Cliente 1", "Cliente 2", ecc.
- NON inventare nomi fittizi

✅ CRITICO per LISTE DI CLIENTI (dati dalla tabella accounts):
Quando ricevi array di oggetti dalla tabella "accounts" con campi: id, city, tipo_locale, note, ecc:
- Il campo "id" è l'UUID del cliente
- DEVI SEMPRE usare [CLIENT:id] per identificare ogni cliente nella lista
- Il campo "note" NON è il nome - sono annotazioni commerciali
- NON usare MAI "note" come identificativo del cliente
- SEMPRE mettere [CLIENT:id] come PRIMO elemento della riga

⚠️ MOSTRA SOLO I CAMPI PRESENTI NEI DATI:
- Controlla quali campi sono presenti nel JSON dei dati
- Mostra SOLO quei campi, NON inventare o aggiungere campi extra
- Se i dati hanno solo: id, city, tipo_locale → mostra SOLO quelli
- Se i dati hanno anche: note, fatturato, ultima_visita → mostra anche quelli
- NON aggiungere campi che non ci sono nei dati!

Esempio CORRETTO base (dati hanno solo: id, tipo_locale, city):
"Ecco i 38 clienti:
1. [CLIENT:uuid-1] - Bar - Verona
2. [CLIENT:uuid-2] - Ristorante - Milano  
3. [CLIENT:uuid-3] - Pizzeria - Padova"

Esempio CORRETTO con campi aggiuntivi (dati hanno: id, tipo_locale, city, note, importo_vendita):
"1. [CLIENT:uuid-1] - Bar - Verona - Note: Cliente vuole sconti - Fatturato: €1.200"

Esempio SBAGLIATO:
❌ "1. Cliente vuole sconti maggiori - Bar - Verona" (note come nome)
❌ "1. [CLIENT:uuid-1] - Bar - Verona - Note: ..." (se 'note' NON è nei dati)
❌ Aggiungere campi che non esistono nei dati forniti

⚠️ PROMEMORIA:
Se ricevi dati dalla tabella "promemoria" con campo "nota":
- Il campo "nota" è GIÀ in chiaro (non cifrato)
- USA DIRETTAMENTE il testo del campo "nota" nella risposta
- NON usare placeholder [PROMEMORIA:uuid]
- Presenta i promemoria numerati con il loro testo completo

Esempio corretto per "promemoria urgenti":
"I tuoi promemoria urgenti:
1. Richiamare fornitore per ordine cornetti
2. Preparare offerta speciale weekend
3. Controllare giacenza gelati"

❌ SBAGLIATO: "[PROMEMORIA:uuid] - testo..."
✅ CORRETTO: "1. testo del promemoria"

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
      max_tokens: 2000
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
