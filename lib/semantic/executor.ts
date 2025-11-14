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
  SemanticErrorCode 
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
    default:
      console.warn(`[executor] Operatore non supportato: ${filter.operator}`);
      return query;
  }
}

/**
 * Calcola aggregazioni client-side sui dati
 */
function calculateAggregation(data: any[], agg: Aggregation): any {
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
      if (agg.having) {
        const filtered: Record<string, any> = {};
        for (const [key, group] of Object.entries(grouped)) {
          if (applyHavingFilter(group.count, agg.having)) {
            filtered[key] = group;
          }
        }
        return Object.values(filtered);
      }
      
      return Object.values(grouped);
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
      
      return Object.values(grouped);
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
    // Tabella principale
    const mainTable = plan.tables[0];
    
    if (cfg.enableLogging) {
      console.log('[executor] Executing plan:', JSON.stringify(plan, null, 2));
    }
    
    // Costruisci SELECT clause
    let selectClause = '*';
    
    // Se ci sono join, includiamo le tabelle correlate
    if (plan.joins && plan.joins.length > 0) {
      const joinSelects = plan.joins.map(j => `${j.to}!inner(*)`).join(',');
      selectClause = `*,${joinSelects}`;
    }
    
    // Inizia query
    let query = supabase.from(mainTable).select(selectClause);
    
    // Applica filtri per tabella principale
    const mainTableFilters = plan.filters.filter(f => 
      f.field.startsWith(`${mainTable}.`) || !f.field.includes('.')
    );
    
    for (const filter of mainTableFilters) {
      query = applyFilter(query, filter, mainTable);
    }
    
    // Applica filtri per tabelle join (sintassi Supabase)
    if (plan.joins) {
      for (const join of plan.joins) {
        const joinFilters = plan.filters.filter(f => f.field.startsWith(`${join.to}.`));
        for (const filter of joinFilters) {
          // In Supabase, filtri su joined table vanno con prefisso
          const field = filter.field.split('.')[1];
          query = applyFilter(query, { ...filter, field: `${join.to}.${field}` }, join.to);
        }
      }
    }
    
    // Applica sort
    if (plan.sort) {
      const [, field] = plan.sort.field.split('.');
      query = query.order(field, { ascending: plan.sort.order === 'asc' });
    }
    
    // Applica limit (con cap massimo)
    const limit = plan.limit 
      ? Math.min(plan.limit, cfg.maxRows!) 
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
        { error, plan }
      );
    }
    
    const executionTime = Date.now() - startTime;
    
    if (cfg.enableLogging) {
      console.log(`[executor] Query executed in ${executionTime}ms, returned ${data?.length || 0} rows`);
    }
    
    // Se c'è aggregazione, calcola client-side
    if (plan.aggregation && data) {
      const aggregated = calculateAggregation(data, plan.aggregation);
      
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
