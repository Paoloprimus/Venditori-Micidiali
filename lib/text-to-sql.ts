// lib/text-to-sql.ts
// Text-to-SQL - LLM genera SQL diretto da natural language

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Schema minimale (riduce token)
const SCHEMA_SNIPPET = `
accounts(id UUID, city TEXT, tipo_locale TEXT, user_id UUID)
visits(id UUID, account_id UUID, data_visita DATE, importo_vendita DECIMAL, user_id UUID)
`;

/**
 * Genera SQL da query natural language
 */
export async function generateSQL(
  userQuery: string,
  userId: string,
  previousContext?: { query: string; resultIds: string[] }
): Promise<{ sql: string; params: any[] }> {
  
  const systemPrompt = `${SCHEMA_SNIPPET}

Sei un generatore SQL per database PostgreSQL.

REGOLE CRITICHE:
- SOLO query SELECT
- SEMPRE filtra per user_id = $1 (primo parametro)
- Campi cifrati (nome, note): NON disponibili - usa solo id, city, tipo_locale, data_visita, importo_vendita
- Usa placeholder $1, $2, $3... per parametri (prepared statements)
- Forza LIMIT ≤ 500 se non specificato
- Follow-up: se previous_ids fornito → WHERE id = ANY($2)

ESEMPI:

Query: "Clienti non visitati da 60 giorni"
SQL: SELECT id, city, tipo_locale FROM accounts WHERE user_id = $1 AND id NOT IN (SELECT account_id FROM visits WHERE data_visita >= NOW() - INTERVAL '60 days' AND user_id = $1) LIMIT 500
Params: ["${userId}"]

Query: "Quanti clienti ho"
SQL: SELECT COUNT(*) as count FROM accounts WHERE user_id = $1 LIMIT 1
Params: ["${userId}"]

Query: "Top 5 clienti per fatturato"
SQL: SELECT account_id, SUM(importo_vendita) as sum FROM visits WHERE user_id = $1 GROUP BY account_id ORDER BY sum DESC LIMIT 5
Params: ["${userId}"]

Query: "Bar a Verona"
SQL: SELECT id, city, tipo_locale FROM accounts WHERE user_id = $1 AND tipo_locale = $2 AND city = $3 LIMIT 50
Params: ["${userId}", "bar", "Verona"]

Rispondi SOLO con JSON: {"sql": "...", "params": [...]}`;

  // Aggiungi contesto se è follow-up
  let userMessage = userQuery;
  
  if (previousContext && previousContext.resultIds && previousContext.resultIds.length > 0) {
    userMessage = `CONTESTO PRECEDENTE:
Query: "${previousContext.query}"
Result IDs: ${JSON.stringify(previousContext.resultIds.slice(0, 50))}

QUERY FOLLOW-UP: "${userQuery}"

Genera SQL che:
1. Filtra SOLO gli ID del contesto: WHERE id = ANY($2)
2. Aggiungi eventuali filtri aggiuntivi dalla query
3. user_id sempre $1, previous_ids sempre $2
4. LIMIT 10 per follow-up`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 600
    });
    
    const responseText = completion.choices[0].message.content?.trim();
    if (!responseText) {
      throw new Error('LLM non ha generato SQL');
    }
    
    const result = JSON.parse(responseText);
    
    if (!result.sql || !result.params) {
      throw new Error('Risposta LLM incompleta');
    }
    
    // Assicurati che userId sia sempre il primo parametro
    if (!result.params[0] || result.params[0] !== userId) {
      result.params = [userId, ...result.params];
    }
    
    return {
      sql: result.sql,
      params: result.params
    };
    
  } catch (error: any) {
    console.error('[text-to-sql] Error:', error);
    throw new Error(`Generazione SQL fallita: ${error.message}`);
  }
}
