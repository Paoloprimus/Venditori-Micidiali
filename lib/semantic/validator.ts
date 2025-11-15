
// lib/semantic/validator.ts
// Sistema di validazione Query Plan

import { 
  QueryPlan, 
  FieldFilter, 
  Aggregation, 
  TableJoin,
  ValidationResult,
  FilterOperator,
  AggregationFunction,
  TableName 
} from './types';

/**
 * Tabelle valide nel sistema
 */
const VALID_TABLES: TableName[] = [
  'accounts',
  'visits',
  'promemoria',
  'notes',
  'products'
];

/**
 * Campi validi per ogni tabella
 * NOTA: Solo campi PLAIN (non cifrati)
 */
const VALID_FIELDS: Record<string, string[]> = {
  accounts: [
    'id',
    'user_id',
    'city',
    'tipo_locale',
    'ultimo_esito',
    'ultimo_esito_at',
    'volume_attuale',
    'volume_attuale_at',
    'note',
    'prodotti',
    'postal_code',
    'created_at',
    'updated_at'
  ],
  visits: [
    'id',
    'user_id',
    'account_id',
    'tipo',
    'data_visita',
    'durata',
    'esito',
    'notes',
    'importo_vendita',
    'created_at',
    'updated_at'
  ],
  promemoria: [
    'id',
    'user_id',
    'nota',
    'urgente',
    'created_at',
    'updated_at'
  ],
  notes: [
    'id',
    'account_id',
    'contact_id',
    'body',
    'created_at'
  ],
  products: [
    'id',
    'codice',
    'sku',
    'title',
    'descrizione_articolo',
    'base_price',
    'unita_misura',
    'giacenza',
    'sconto_merce',
    'sconto_fattura',
    'is_active',
    'created_at',
    'updated_at'
  ]
};

/**
 * Operatori validi
 */
const VALID_OPERATORS: FilterOperator[] = [
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'not_in'
];

/**
 * Funzioni aggregazione valide
 */
const VALID_AGGREGATIONS: AggregationFunction[] = [
  'count', 'sum', 'avg', 'min', 'max'
];

/**
 * Valida un Query Plan completo
 */
export function validateQueryPlan(plan: QueryPlan): ValidationResult {
  const warnings: string[] = [];

  // 1. Valida presenza campi obbligatori
  if (!plan.tables || plan.tables.length === 0) {
    return { 
      valid: false, 
      error: 'Query Plan deve specificare almeno una tabella' 
    };
  }

  if (!plan.filters || !Array.isArray(plan.filters)) {
    return { 
      valid: false, 
      error: 'Query Plan deve avere array filters (anche vuoto)' 
    };
  }

  // 2. Valida tabelle
  for (const table of plan.tables) {
    if (!VALID_TABLES.includes(table as TableName)) {
      return { 
        valid: false, 
        error: `Tabella non valida: "${table}". Tabelle disponibili: ${VALID_TABLES.join(', ')}` 
      };
    }
  }

  // 3. Valida filtri
  for (const filter of plan.filters) {
    const filterValidation = validateFilter(filter);
    if (!filterValidation.valid) {
      return filterValidation;
    }
  }

  // 4. Verifica presenza user_id filter per security
  const hasUserIdFilter = plan.filters.some(f => 
    f.field.endsWith('.user_id') && f.operator === 'eq'
  );
  
  if (!hasUserIdFilter) {
    warnings.push('Query senza filtro user_id - verrà aggiunto automaticamente per security');
  }

  // 5. Valida aggregazioni se presenti
  if (plan.aggregation) {
    const aggValidation = validateAggregation(plan.aggregation);
    if (!aggValidation.valid) {
      return aggValidation;
    }
  }

  // 6. Valida join se presenti
  if (plan.joins && plan.joins.length > 0) {
    for (const join of plan.joins) {
      const joinValidation = validateJoin(join, plan.tables);
      if (!joinValidation.valid) {
        return joinValidation;
      }
    }
  }

  // 7. Valida sort se presente
  if (plan.sort) {
    const sortValidation = validateSort(plan.sort, !!plan.aggregation);
    if (!sortValidation.valid) {
      return sortValidation;
    }
  }

  // 8. Valida limit
  if (plan.limit !== undefined) {
    if (typeof plan.limit !== 'number' || plan.limit < 1 || plan.limit > 1000) {
      return { 
        valid: false, 
        error: 'Limit deve essere un numero tra 1 e 1000' 
      };
    }
    if (plan.limit > 100) {
      warnings.push(`Limit elevato (${plan.limit}). Performance potrebbe essere impattata.`);
    }
  }

  return { 
    valid: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
  };
}

/**
 * Valida un singolo filtro
 */
function validateFilter(filter: FieldFilter): ValidationResult {
  // Verifica formato field
  if (!filter.field || typeof filter.field !== 'string') {
    return { 
      valid: false, 
      error: 'Filter field deve essere una stringa non vuota' 
    };
  }

  const parts = filter.field.split('.');
  if (parts.length !== 2) {
    return { 
      valid: false, 
      error: `Filter field deve essere formato "table.field", ricevuto: "${filter.field}"` 
    };
  }

  const [table, field] = parts;

  // Verifica tabella valida
  if (!VALID_TABLES.includes(table as TableName)) {
    return { 
      valid: false, 
      error: `Tabella non valida in filter: "${table}"` 
    };
  }

  // Verifica campo valido
  if (!VALID_FIELDS[table]?.includes(field)) {
    return { 
      valid: false, 
      error: `Campo non valido: "${filter.field}". Campi disponibili per ${table}: ${VALID_FIELDS[table]?.join(', ')}` 
    };
  }

  // Verifica operatore valido
  if (!VALID_OPERATORS.includes(filter.operator)) {
    return { 
      valid: false, 
      error: `Operatore non valido: "${filter.operator}". Operatori disponibili: ${VALID_OPERATORS.join(', ')}` 
    };
  }

  // Verifica coerenza valore con operatore
  if (filter.operator === 'in' || filter.operator === 'not_in') {
    // Può essere array diretto o oggetto con subquery
    const isArray = Array.isArray(filter.value);
    const isSubquery = typeof filter.value === 'object' && 
                       filter.value !== null && 
                       !Array.isArray(filter.value) &&
                       'subquery' in filter.value;
    
    if (!isArray && !isSubquery) {
      return { 
        valid: false, 
        error: `Operatore "${filter.operator}" richiede un array o un oggetto subquery come value` 
      };
    }
  } else {
    if (Array.isArray(filter.value)) {
      return { 
        valid: false, 
        error: `Operatore "${filter.operator}" non supporta array come value` 
      };
    }
  }

  return { valid: true };
}

/**
 * Valida aggregazione
 */
function validateAggregation(agg: Aggregation): ValidationResult {
  // Verifica funzione valida
  if (!VALID_AGGREGATIONS.includes(agg.function)) {
    return { 
      valid: false, 
      error: `Funzione aggregazione non valida: "${agg.function}". Disponibili: ${VALID_AGGREGATIONS.join(', ')}` 
    };
  }

  // Per sum, avg, min, max serve il campo
  if (['sum', 'avg', 'min', 'max'].includes(agg.function)) {
    if (!agg.field) {
      return { 
        valid: false, 
        error: `Funzione "${agg.function}" richiede campo da aggregare` 
      };
    }

    // Valida formato campo
    const parts = agg.field.split('.');
    if (parts.length !== 2) {
      return { 
        valid: false, 
        error: `Aggregation field deve essere formato "table.field"` 
      };
    }

    const [table, field] = parts;
    if (!VALID_FIELDS[table]?.includes(field)) {
      return { 
        valid: false, 
        error: `Campo aggregazione non valido: "${agg.field}"` 
      };
    }
  }

  // Valida groupBy se presente
  if (agg.groupBy && agg.groupBy.length > 0) {
    for (const gbField of agg.groupBy) {
      // groupBy può essere solo nome campo (non table.field)
      // Questo va validato nel contesto della query
      if (typeof gbField !== 'string' || gbField.trim() === '') {
        return { 
          valid: false, 
          error: 'GroupBy fields devono essere stringhe non vuote' 
        };
      }
    }
  }

  // Valida having se presente
  if (agg.having) {
    // Having su aggregati può avere field senza table prefix (es. "count", "sum")
    const aggregateFunctions = ['count', 'sum', 'avg', 'min', 'max'];
    const isAggregateField = aggregateFunctions.includes(agg.having.field.toLowerCase());
    
    if (!isAggregateField) {
      // Se non è un aggregato, usa validazione normale
      const havingValidation = validateFilter(agg.having);
      if (!havingValidation.valid) {
        return { 
          valid: false, 
          error: `Having clause non valida: ${havingValidation.error}` 
        };
      }
    } else {
      // Valida solo operatore e valore per aggregati
      if (!VALID_OPERATORS.includes(agg.having.operator)) {
        return {
          valid: false,
          error: `Having operator non valido: "${agg.having.operator}"`
        };
      }
      if (typeof agg.having.value !== 'number') {
        return {
          valid: false,
          error: 'Having value su aggregato deve essere numerico'
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Valida join
 */
function validateJoin(join: TableJoin, queryTables: string[]): ValidationResult {
  // Verifica tabelle esistenti
  if (!VALID_TABLES.includes(join.from as TableName)) {
    return { 
      valid: false, 
      error: `Join from table non valida: "${join.from}"` 
    };
  }

  if (!VALID_TABLES.includes(join.to as TableName)) {
    return { 
      valid: false, 
      error: `Join to table non valida: "${join.to}"` 
    };
  }

  // Verifica tabelle presenti in query
  if (!queryTables.includes(join.from)) {
    return { 
      valid: false, 
      error: `Join from table "${join.from}" non presente in tables array` 
    };
  }

  if (!queryTables.includes(join.to)) {
    return { 
      valid: false, 
      error: `Join to table "${join.to}" non presente in tables array` 
    };
  }

  // Verifica campi join
  if (!VALID_FIELDS[join.from]?.includes(join.fromField)) {
    return { 
      valid: false, 
      error: `Join fromField non valido: "${join.fromField}" per table "${join.from}"` 
    };
  }

  if (!VALID_FIELDS[join.to]?.includes(join.toField)) {
    return { 
      valid: false, 
      error: `Join toField non valido: "${join.toField}" per table "${join.to}"` 
    };
  }

  // Verifica tipo join
  if (!['inner', 'left'].includes(join.type)) {
    return { 
      valid: false, 
      error: `Join type non valido: "${join.type}". Disponibili: inner, left` 
    };
  }

  return { valid: true };
}

/**
 * Valida sort
 */
function validateSort(
  sort: { field: string; order: string },
  hasAggregation: boolean = false
): ValidationResult {
  // ✅ Se c'è aggregazione, accetta anche campi aggregati semplici (sum, count, avg, min, max)
  if (hasAggregation && ['sum', 'count', 'avg', 'min', 'max'].includes(sort.field)) {
    // Sort su campo aggregato - valido!
    if (!['asc', 'desc'].includes(sort.order)) {
      return { 
        valid: false, 
        error: `Sort order deve essere "asc" o "desc"` 
      };
    }
    return { valid: true };
  }
  
  // Verifica formato field standard (table.field)
  const parts = sort.field.split('.');
  if (parts.length !== 2) {
    return { 
      valid: false, 
      error: 'Sort field deve essere formato "table.field" o un campo aggregato (sum, count, avg)' 
    };
  }

  const [table, field] = parts;
  if (!VALID_FIELDS[table]?.includes(field)) {
    return { 
      valid: false, 
      error: `Sort field non valido: "${sort.field}"` 
    };
  }

  // Verifica order
  if (!['asc', 'desc'].includes(sort.order)) {
    return { 
      valid: false, 
      error: `Sort order non valido: "${sort.order}". Disponibili: asc, desc` 
    };
  }

  return { valid: true };
}

/**
 * Verifica se un campo è cifrato (per sicurezza aggiuntiva)
 */
export function isEncryptedField(field: string): boolean {
  const encryptedSuffixes = ['_enc', '_iv', '_tag', '_bi'];
  return encryptedSuffixes.some(suffix => field.endsWith(suffix));
}

/**
 * Sanitize Query Plan per log (rimuove dati sensibili)
 */
export function sanitizeQueryPlanForLog(plan: QueryPlan): Partial<QueryPlan> {
  return {
    intent: plan.intent,
    tables: plan.tables,
    filters: plan.filters.map(f => ({
      field: f.field,
      operator: f.operator,
      value: typeof f.value === 'string' && f.value.length > 50 
        ? f.value.substring(0, 50) + '...' 
        : f.value
    })),
    aggregation: plan.aggregation ? {
      function: plan.aggregation.function,
      field: plan.aggregation.field,
      groupBy: plan.aggregation.groupBy
    } : undefined,
    limit: plan.limit
  };
}
