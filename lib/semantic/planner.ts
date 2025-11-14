// lib/semantic/planner.ts
// Query Planner - Trasforma query utente in Query Plan strutturato usando LLM

import OpenAI from 'openai';
import { QueryPlan, PlannerConfig, SemanticError, SemanticErrorCode } from './types';
import { SCHEMA_KNOWLEDGE } from './schema-knowledge';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const DEFAULT_CONFIG: PlannerConfig = {
  model: 'gpt-4o-mini',
  temperature: 0,
  maxTokens: 2000,
  timeoutMs: 30000
};

/**
 * Genera Query Plan da query utente usando LLM
 * 
 * @param userQuery - Query in linguaggio naturale
 * @param userId - ID utente per security filter
 * @param config - Configurazione opzionale
 * @returns Query Plan strutturato
 */
export async function planQuery(
  userQuery: string,
  userId: string,
  config: Partial<PlannerConfig> = {}
): Promise<QueryPlan> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // System prompt con schema knowledge
  const systemPrompt = `${SCHEMA_KNOWLEDGE}

Sei un Query Planner per REPING, sistema gestione commerciale HoReCa.

COMPITO:
Analizza la query dell'utente e genera un Query Plan JSON valido per interrogare il database.

REGOLE CRITICHE:
1. Usa SOLO tabelle e campi presenti nello schema sopra
2. NON inventare campi o tabelle
3. NON accedere mai a campi cifrati (_enc, _iv, _tag, _bi)
4. Gestisci date relative usando il formato specificato (es. "30_days_ago", "this_month")
5. Se serve aggregazione (count, sum, avg, min, max), specifica il campo aggregation
6. Se multi-tabella, specifica i join necessari
7. Restituisci SOLO JSON valido, senza testo aggiuntivo

⚠️ REGOLE AGGREGAZIONI CON GROUPBY:
Quando usi "aggregation" con "groupBy", NON usare "sort" e "limit"!
Il sistema applicherà automaticamente sort/limit sui risultati aggregati.

Esempio SBAGLIATO:
{
  "aggregation": {"function": "sum", "groupBy": ["account_id"]},
  "sort": {"field": "visits.importo_vendita", "order": "desc"},  ❌
  "limit": 5  ❌
}

Esempio CORRETTO:
{
  "aggregation": {"function": "sum", "groupBy": ["account_id"]}
  // NO sort, NO limit - l'executor li applicherà automaticamente
}

Il flusso corretto è:
1. Fetch TUTTI i dati che matchano i filtri
2. Aggrega per groupBy (es. somma per cliente)
3. Ordina i risultati aggregati per valore aggregato (DESC per "top")
4. Prendi i primi N risultati

FORMATO OUTPUT JSON:
{
  "intent": "descrizione breve intento",
  "tables": ["table1", "table2"],
  "filters": [
    {
      "field": "table.field",
      "operator": "eq|neq|gt|gte|lt|lte|like|in",
      "value": "valore" | numero | boolean | ["array"]
    }
  ],
  "joins": [
    {
      "from": "table1",
      "to": "table2", 
      "fromField": "id",
      "toField": "foreign_key",
      "type": "inner|left"
    }
  ],
  "aggregation": {
    "function": "count|sum|avg|min|max",
    "field": "table.field",
    "groupBy": ["field1", "field2"],
    "having": {
      "field": "aggregated_field",
      "operator": "gt|gte|lt|lte|eq|neq",
      "value": numero
    }
  },
  "sort": {
    "field": "table.field",
    "order": "asc|desc"
  },
  "limit": numero
}

ESEMPI QUERY → PLAN:

Query: "Mostra bar di Verona"
Plan:
{
  "intent": "Lista bar a Verona",
  "tables": ["accounts"],
  "filters": [
    {"field": "accounts.tipo_locale", "operator": "eq", "value": "bar"},
    {"field": "accounts.city", "operator": "eq", "value": "Verona"}
  ],
  "limit": 20
}

Query: "Quanti clienti ho visitato più di 3 volte negli ultimi 30 giorni?"
Plan:
{
  "intent": "Count clienti con 3+ visite in 30 giorni",
  "tables": ["visits"],
  "filters": [
    {"field": "visits.data_visita", "operator": "gte", "value": "30_days_ago"}
  ],
  "aggregation": {
    "function": "count",
    "groupBy": ["account_id"],
    "having": {"field": "count", "operator": "gt", "value": 3}
  }
}

Query: "Quanti clienti ho visitato questo mese?"
Plan:
{
  "intent": "Count clienti visitati mese corrente",
  "tables": ["visits"],
  "filters": [
    {"field": "visits.data_visita", "operator": "gte", "value": "this_month"}
  ],
  "aggregation": {
    "function": "count",
    "groupBy": ["account_id"]
  }
}

Query: "Quanto ho venduto negli ultimi 30 giorni?"
Plan:
{
  "intent": "Somma vendite ultimi 30 giorni",
  "tables": ["visits"],
  "filters": [
    {"field": "visits.data_visita", "operator": "gte", "value": "30_days_ago"}
  ],
  "aggregation": {
    "function": "sum",
    "field": "visits.importo_vendita"
  }
}

Query: "Totale vendite di bar a Milano questo mese"
Plan:
{
  "intent": "Somma vendite bar Milano mese corrente",
  "tables": ["visits", "accounts"],
  "filters": [
    {"field": "visits.data_visita", "operator": "gte", "value": "this_month"},
    {"field": "accounts.city", "operator": "eq", "value": "Milano"},
    {"field": "accounts.tipo_locale", "operator": "eq", "value": "bar"}
  ],
  "joins": [
    {"from": "visits", "to": "accounts", "fromField": "account_id", "toField": "id", "type": "inner"}
  ],
  "aggregation": {
    "function": "sum",
    "field": "visits.importo_vendita"
  }
}

Query: "I miei top 5 clienti per fatturato"
Plan:
{
  "intent": "Top 5 clienti per fatturato",
  "tables": ["visits"],
  "filters": [],
  "aggregation": {
    "function": "sum",
    "field": "visits.importo_vendita",
    "groupBy": ["account_id"]
  }
}

NOTA IMPORTANTE:
NON includere il filtro user_id nel plan - verrà aggiunto automaticamente per security.

User ID contesto: ${userId}
`;

  try {
    // Timeout wrapper
    const planPromise = openai.chat.completions.create({
      model: cfg.model!,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuery }
      ],
      temperature: cfg.temperature!,
      max_tokens: cfg.maxTokens,
      response_format: { type: 'json_object' }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('LLM timeout')), cfg.timeoutMs)
    );

    const completion = await Promise.race([planPromise, timeoutPromise]);

    // Parse response
    const response = completion.choices[0].message.content || '{}';
    const plan: QueryPlan = JSON.parse(response);

    // Inizializza filters se mancante
    if (!plan.filters) {
      plan.filters = [];
    }

    // SECURITY: Aggiungi filtro user_id per ogni tabella che lo richiede
    for (const table of plan.tables) {
      if (['accounts', 'visits', 'promemoria'].includes(table)) {
        // NOTA: 'notes' NON ha user_id - ha solo account_id
        // Verifica se non esiste già
        const hasUserFilter = plan.filters.some(
          f => f.field === `${table}.user_id` && f.operator === 'eq'
        );
        
        if (!hasUserFilter) {
          plan.filters.push({
            field: `${table}.user_id`,
            operator: 'eq',
            value: userId
          });
        }
      }
    }

    return plan;

  } catch (error: any) {
    // Log error per debug
    console.error('[planQuery] Error:', error);

    if (error.message === 'LLM timeout') {
      throw new SemanticError(
        'Timeout durante generazione piano query',
        SemanticErrorCode.LLM_TIMEOUT,
        { userQuery, timeoutMs: cfg.timeoutMs }
      );
    }

    throw new SemanticError(
      'Errore generazione Query Plan',
      SemanticErrorCode.INVALID_QUERY_PLAN,
      { userQuery, error: error.message }
    );
  }
}

/**
 * Spiega un Query Plan in linguaggio naturale (per debug/UI)
 */
export function explainQueryPlan(plan: QueryPlan): string {
  let explanation = `📋 ${plan.intent}\n\n`;

  explanation += `🗂️  Tabelle: ${plan.tables.join(', ')}\n`;

  if (plan.filters.length > 0) {
    explanation += `🔍 Filtri:\n`;
    for (const filter of plan.filters) {
      if (!filter.field.endsWith('.user_id')) { // Nascondi filtri user_id (interni)
        explanation += `   - ${filter.field} ${filter.operator} ${JSON.stringify(filter.value)}\n`;
      }
    }
  }

  if (plan.joins && plan.joins.length > 0) {
    explanation += `🔗 Join:\n`;
    for (const join of plan.joins) {
      explanation += `   - ${join.from}.${join.fromField} → ${join.to}.${join.toField} (${join.type})\n`;
    }
  }

  if (plan.aggregation) {
    explanation += `📊 Aggregazione: ${plan.aggregation.function}`;
    if (plan.aggregation.field) {
      explanation += ` su ${plan.aggregation.field}`;
    }
    if (plan.aggregation.groupBy) {
      explanation += ` group by [${plan.aggregation.groupBy.join(', ')}]`;
    }
    explanation += `\n`;
  }

  if (plan.sort) {
    explanation += `📈 Ordinamento: ${plan.sort.field} ${plan.sort.order}\n`;
  }

  if (plan.limit) {
    explanation += `🔢 Limite: ${plan.limit} risultati\n`;
  }

  return explanation;
}
