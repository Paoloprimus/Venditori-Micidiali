// lib/semantic/executor.ts
// Query Executor - Esegue Query Plan su Supabase e calcola aggregazioni

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { 
  QueryPlan, 
  QueryResult, 
  FieldFilter, 
  Aggregation,
  ExecutorConfig,
  SemanticError,
  SemanticErrorCode,
  Subquery
} from './types';

const DEFAULT_CONFIG: ExecutorConfig = {
  maxRows: 100,
  timeoutMs: 30000,
  enableLogging: process.env.NODE_ENV === 'development'
};

/**
 * Risolve valori relativi di data in timestamp ISO
 */
function resolveRelativeDate(value: string): string {
  const now = new Date();
  
  // Date assolute
  if (value === 'now') return now.toISOString();
  
  if (value === 'today') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return today.toISOString();
  }
  
  // Pattern: "{numero}_{days|months|years}_ago"
  const relativeMatch = value.match(/^(\d+)_(days?|months?|years?)_ago$/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    
    const date = new Date(now);
    if (unit.startsWith('day')) {
      date.setDate(date.getDate() - amount);
    } else if (unit.startsWith('month')) {
      date.setMonth(date.getMonth() - amount);
    } else if (unit.startsWith('year')) {
      date.setFullYear(date.getFullYear() - amount);
    }
    return date.toISOString();
  }
  
  // Periodi correnti
  if (value === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString();
  }
  
  if (value === 'this_year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return start.toISOString();
  }
  
  if (value === 'this_week') {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  
  // Se non match, ritorna value originale (assume sia già ISO o valido)
  return value;
}

/**
 * Applica un filtro a query Supabase
 */
function applyFilter(query: any, filter: FieldFilter, tableName: string): any {
  // Estrai nome campo (rimuovi prefisso tabella se presente)
  const fieldParts = filter.field.split('.');
  const field = fieldParts.length > 1 ? fieldParts[1] : filter.field;
  
  let value = filter.value;
  
  // Risolvi date relative se il campo è timestamp
  if (typeof value === 'string' && (
    field.includes('date') || 
    field.includes('data_') ||  // Per data_visita
    field.includes('_at') || 
    field === 'created_at' || 
    field === 'updated_at'
  )) {
    value = resolveRelativeDate(value);
  }
  
  // Determina se il campo è stringa (per case-insensitive)
  const stringFields = ['city', 'tipo_locale', 'esito', 'ultimo_esito', 'tipo', 'note', 'nota'];
  const isStringField = stringFields.some(sf => field.includes(sf));
  
  // Applica operatore appropriato
  switch (filter.operator) {
    case 'eq':
      // Per campi stringa, usa ilike per case-insensitive
      if (isStringField && typeof value === 'string') {
        return query.ilike(field, value);
      }
      return query.eq(field, value);
    case 'neq':
      return query.neq(field, value);
    case 'gt':
      return query.gt(field, value);
    case 'gte':
      return query.gte(field, value);
    case 'lt':
      return query.lt(field, value);
    case 'lte':
      return query.lte(field, value);
    case 'like':
      return query.ilike(field, `%${value}%`);
    case 'in':
      return query.in(field, value as any[]);
    case 'not_in':
      // NOT IN = usa .not().in()
      return query.not(field, 'in', value as any[]);
    default:
      console.warn(`[executor] Operatore non supportato: ${filter.operator}`);
      return query;
  }
}

/**
 * Risolve le subquery nei filtri NOT IN
 * Esegue le subquery e sostituisce i value con array di ID
 */
async function resolveSubqueries(plan: QueryPlan, config: ExecutorConfig): Promise<QueryPlan> {
  const resolvedFilters: FieldFilter[] = [];
  
  for (const filter of plan.filters) {
    // Controlla se questo filtro ha una subquery
    if (
      filter.operator === 'not_in' && 
      typeof filter.value === 'object' && 
      filter.value !== null && 
      !Array.isArray(filter.value) &&
      'subquery' in filter.value
    ) {
      const subqueryValue = filter.value as Subquery;
      const subqueryPlan = subqueryValue.subquery;
      
      if (config.enableLogging) {
        console.log('[executor] Esecuzione subquery per not_in:', JSON.stringify(subqueryPlan, null, 2));
      }
      
      // Esegui ricorsivamente la subquery
      const subqueryResult = await executeQueryPlan(subqueryPlan, config);
      
      if (!subqueryResult.success || !subqueryResult.data) {
        throw new SemanticError(
          `Subquery fallita: ${subqueryResult.error || 'Nessun dato'}`,
          SemanticErrorCode.QUERY_EXECUTION_FAILED,
          { subqueryPlan, subqueryResult }
        );
      }
      
      // Estrai il campo rilevante dai risultati
      // Se la subquery ha groupBy (es. account_id), usa quello
      // Altrimenti cerca un campo che termina con _id
      let fieldToExtract: string;
      
      if (subqueryPlan.aggregation?.groupBy && subqueryPlan.aggregation.groupBy.length > 0) {
        // Usa il primo campo del groupBy
        fieldToExtract = subqueryPlan.aggregation.groupBy[0];
      } else {
        // Cerca un campo ID nei risultati
        const firstRow = subqueryResult.data[0];
        const idFields = Object.keys(firstRow).filter(k => k.endsWith('_id') || k === 'id');
        
        if (idFields.length === 0) {
          throw new SemanticError(
            'Subquery non ha restituito un campo ID da usare per NOT IN',
            SemanticErrorCode.INVALID_FILTER,
            { subqueryResult }
          );
        }
        
        fieldToExtract = idFields[0];
      }
      
      // Estrai array di ID
      const ids = subqueryResult.data
        .map(row => row[fieldToExtract])
        .filter(id => id !== null && id !== undefined);
      
      if (config.enableLogging) {
        console.log(`[executor] Subquery restituita ${ids.length} ID da escludere`);
      }
      
      // Se la subquery non ha restituito nessun ID, NOT IN [] = tutti i record
      // In questo caso, possiamo semplicemente non applicare il filtro
      if (ids.length === 0) {
        if (config.enableLogging) {
          console.log('[executor] Subquery vuota - il filtro NOT IN non escluderà nulla');
        }
        // Non aggiungere il filtro (NOT IN [] = nessuna esclusione)
        continue;
      }
      
      // Sostituisci il filtro con un NOT IN con array di ID
      resolvedFilters.push({
        field: filter.field,
        operator: 'not_in',
        value: ids
      });
      
    } else {
      // Filtro normale, mantieni com'è
      resolvedFilters.push(filter);
    }
  }
  
  return {
    ...plan,
    filters: resolvedFilters
  };
}

/**
 * Calcola aggregazioni client-side sui dati
 */
function calculateAggregation(
  data: any[], 
  agg: Aggregation,
  sortConfig?: { field: string; order: 'asc' | 'desc' },
  limitValue?: number
): any {
  if (!data || data.length === 0) {
    return null;
  }
  
  // COUNT
  if (agg.function === 'count') {
    if (agg.groupBy && agg.groupBy.length > 0) {
      // Group by + count
      const grouped: Record<string, any> = {};
      
      for (const row of data) {
        const key = agg.groupBy.map(field => row[field] ?? 'null').join('|');
        
        if (!grouped[key]) {
          grouped[key] = {
            ...agg.groupBy.reduce((acc, field) => ({ ...acc, [field]: row[field] }), {}),
            count: 0
          };
        }
        grouped[key].count++;
      }
      
      // Applica having se presente
      let results = Object.values(grouped);
      if (agg.having) {
        results = results.filter(group => applyHavingFilter(group.count, agg.having!));
      }
      
      // ✅ Applica sort dal plan (default: count DESC)
      const sortField = sortConfig?.field || 'count';
      const sortOrder = sortConfig?.order || 'desc';
      
      results.sort((a, b) => {
        const aVal = a[sortField] || 0;
        const bVal = b[sortField] || 0;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });
      
      // ✅ Applica limit dal plan (default: 10)
      const limit = limitValue || 10;
      const limitedResults = results.slice(0, limit);
      
      return limitedResults;
    }
    
    // Simple count
    return { count: data.length };
  }
  
  // Estrai nome campo per aggregazioni su campo specifico
  const fieldName = agg.field ? agg.field.split('.')[1] : null;
  
  if (!fieldName && ['sum', 'avg', 'min', 'max'].includes(agg.function)) {
    throw new SemanticError(
      `Funzione ${agg.function} richiede campo specificato`,
      SemanticErrorCode.AGGREGATION_ERROR
    );
  }
  
  // Estrai valori numerici
  const values = data
    .map(row => parseFloat(row[fieldName!]) || 0)
    .filter(v => !isNaN(v));
  
  if (values.length === 0) {
    return null;
  }
  
  // SUM
  if (agg.function === 'sum') {
    if (agg.groupBy && agg.groupBy.length > 0) {
      const grouped: Record<string, any> = {};
      
      for (const row of data) {
        const key = agg.groupBy.map(field => row[field] ?? 'null').join('|');
        const value = parseFloat(row[fieldName!]) || 0;
        
        if (!grouped[key]) {
          grouped[key] = {
            ...agg.groupBy.reduce((acc, field) => ({ ...acc, [field]: row[field] }), {}),
            sum: 0
          };
        }
        grouped[key].sum += value;
      }
      
      // Converti in array e applica sort dal plan
      const results = Object.values(grouped);
      
      // ✅ Applica sort dal plan (default: sum DESC)
      const sortField = sortConfig?.field || 'sum';
      const sortOrder = sortConfig?.order || 'desc';
      
      results.sort((a, b) => {
        const aVal = a[sortField] || 0;
        const bVal = b[sortField] || 0;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });
      
      // ✅ Applica limit dal plan (default: 10)
      const limit = limitValue || 10;
      const limitedResults = results.slice(0, limit);
      
      return limitedResults;
    }
    
    const sum = values.reduce((a, b) => a + b, 0);
    return { sum: Math.round(sum * 100) / 100 };
  }
  
  // AVG
  if (agg.function === 'avg') {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { avg: Math.round(avg * 100) / 100 };
  }
  
  // MIN
  if (agg.function === 'min') {
    return { min: Math.min(...values) };
  }
  
  // MAX
  if (agg.function === 'max') {
    return { max: Math.max(...values) };
  }
  
  return null;
}

/**
 * Applica filtro HAVING su valore aggregato
 */
function applyHavingFilter(value: number, having: FieldFilter): boolean {
  const filterValue = typeof having.value === 'number' 
    ? having.value 
    : parseInt(String(having.value));
  
  switch (having.operator) {
    case 'gt': return value > filterValue;
    case 'gte': return value >= filterValue;
    case 'lt': return value < filterValue;
    case 'lte': return value <= filterValue;
    case 'eq': return value === filterValue;
    case 'neq': return value !== filterValue;
    default: return true;
  }
}

/**
 * Esegue Query Plan su Supabase
 */
export async function executeQueryPlan(
  plan: QueryPlan,
  config: Partial<ExecutorConfig> = {}
): Promise<QueryResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const supabase = getSupabaseAdmin();
  const startTime = Date.now();
  
  try {
    // ✅ STEP 1: Risolvi subquery nei filtri NOT IN
    const resolvedPlan = await resolveSubqueries(plan, cfg);
    
    // Tabella principale: se c'è join, usa join.from, altrimenti prima tabella
    const mainTable = (resolvedPlan.joins && resolvedPlan.joins.length > 0) 
      ? resolvedPlan.joins[0].from 
      : resolvedPlan.tables[0];
    
    if (cfg.enableLogging) {
      console.log('[executor] Executing resolved plan:', JSON.stringify(resolvedPlan, null, 2));
    }
    
    // Costruisci SELECT clause
    let selectClause = '*';
    
    // Se ci sono join espliciti dal plan, includiamoli
    if (resolvedPlan.joins && resolvedPlan.joins.length > 0) {
      const joinSelects = resolvedPlan.joins.map(j => `${j.to}!inner(*)`).join(',');
      selectClause = `*,${joinSelects}`;
    }
    
    // Inizia query
    let query = supabase.from(mainTable).select(selectClause);
    
    // Applica filtri per tabella principale
    const mainTableFilters = resolvedPlan.filters.filter(f => 
      f.field.startsWith(`${mainTable}.`) || !f.field.includes('.')
    );
    
    for (const filter of mainTableFilters) {
      query = applyFilter(query, filter, mainTable);
    }
    
    // Applica filtri per tabelle join (sintassi Supabase)
    if (resolvedPlan.joins) {
      for (const join of resolvedPlan.joins) {
        const joinFilters = resolvedPlan.filters.filter(f => f.field.startsWith(`${join.to}.`));
        for (const filter of joinFilters) {
          // Per joined tables, Supabase vuole prefisso completo: "accounts.tipo_locale"
          // NON passare per applyFilter che rimuove il prefisso
          const fullField = filter.field; // es. "accounts.tipo_locale"
          let value = filter.value;
          
          // Risolvi date relative se necessario
          const fieldName = fullField.split('.')[1];
          if (typeof value === 'string' && (
            fieldName.includes('date') || 
            fieldName.includes('data_') ||
            fieldName.includes('_at')
          )) {
            value = resolveRelativeDate(value);
          }
          
          // Applica operatore direttamente
          switch (filter.operator) {
            case 'eq':
              query = query.eq(fullField, value);
              break;
            case 'neq':
              query = query.neq(fullField, value);
              break;
            case 'gt':
              query = query.gt(fullField, value);
              break;
            case 'gte':
              query = query.gte(fullField, value);
              break;
            case 'lt':
              query = query.lt(fullField, value);
              break;
            case 'lte':
              query = query.lte(fullField, value);
              break;
            case 'like':
              query = query.ilike(fullField, `%${value}%`);
              break;
            case 'in':
              query = query.in(fullField, value as any[]);
              break;
            case 'not_in':
              query = query.not(fullField, 'in', value as any[]);
              break;
          }
        }
      }
    }
    
    // Applica sort
    if (resolvedPlan.sort) {
      const [, field] = resolvedPlan.sort.field.split('.');
      query = query.order(field, { ascending: resolvedPlan.sort.order === 'asc' });
    }
    
    // Applica limit (con cap massimo)
    const limit = resolvedPlan.limit 
      ? Math.min(resolvedPlan.limit, cfg.maxRows!) 
      : cfg.maxRows!;
    query = query.limit(limit);
    
    // Esegui query con timeout
    const queryPromise = query;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), cfg.timeoutMs)
    );
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (error) {
      throw new SemanticError(
        `Errore esecuzione query: ${error.message}`,
        SemanticErrorCode.QUERY_EXECUTION_FAILED,
        { error, plan: resolvedPlan }
      );
    }
    
    const executionTime = Date.now() - startTime;
    
    if (cfg.enableLogging) {
      console.log(`[executor] Query executed in ${executionTime}ms, returned ${data?.length || 0} rows`);
    }
    
    // Se c'è aggregazione, calcola client-side
    if (resolvedPlan.aggregation && data) {
      const aggregated = calculateAggregation(
        data, 
        resolvedPlan.aggregation,
        resolvedPlan.sort,
        resolvedPlan.limit
      );
      
      return {
        success: true,
        data: data || [],
        aggregated,
        rowCount: data.length
      };
    }
    
    // Query standard senza aggregazione
    return {
      success: true,
      data: data || [],
      rowCount: data?.length || 0
    };
    
  } catch (error: any) {
    console.error('[executor] Error:', error);
    
    if (error instanceof SemanticError) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
    
    return {
      success: false,
      error: error.message || 'Errore sconosciuto durante esecuzione query',
      data: []
    };
  }
}

/**
 * Verifica se una query è "sicura" (per preview/dry-run)
 */
export function isQuerySafe(plan: QueryPlan): { safe: boolean; reason?: string } {
  // Verifica presenza filtro user_id
  const hasUserFilter = plan.filters.some(f => 
    f.field.endsWith('.user_id') && f.operator === 'eq'
  );
  
  if (!hasUserFilter) {
    return { 
      safe: false, 
      reason: 'Query senza filtro user_id - rischio accesso dati altri utenti' 
    };
  }
  
  // Verifica limit ragionevole
  if (plan.limit && plan.limit > 1000) {
    return { 
      safe: false, 
      reason: 'Limit troppo alto - rischio performance' 
    };
  }
  
  return { safe: true };
}
