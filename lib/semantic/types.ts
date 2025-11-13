// lib/semantic/types.ts
// Definizioni TypeScript per il sistema semantico

/**
 * Operatori di filtro supportati
 */
export type FilterOperator = 
  | 'eq'      // uguale
  | 'neq'     // diverso
  | 'gt'      // maggiore
  | 'gte'     // maggiore o uguale
  | 'lt'      // minore
  | 'lte'     // minore o uguale
  | 'like'    // contiene (case-insensitive)
  | 'in';     // in lista

/**
 * Funzioni di aggregazione supportate
 */
export type AggregationFunction = 
  | 'count'   // conteggio
  | 'sum'     // somma
  | 'avg'     // media
  | 'min'     // minimo
  | 'max';    // massimo

/**
 * Tabelle disponibili nel sistema
 */
export type TableName = 
  | 'accounts' 
  | 'visits' 
  | 'promemoria' 
  | 'notes' 
  | 'products';

/**
 * Tipi di join supportati
 */
export type JoinType = 'inner' | 'left';

/**
 * Ordine di sort
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Filtro su un campo
 */
export interface FieldFilter {
  field: string;                // formato: "table.field" (es. "accounts.city")
  operator: FilterOperator;     // operatore da applicare
  value: string | number | boolean | (string | number)[];  // valore di confronto
}

/**
 * Configurazione aggregazione
 */
export interface Aggregation {
  function: AggregationFunction;  // funzione da applicare
  field?: string;                 // campo da aggregare (opzionale per count)
  groupBy?: string[];             // campi per group by
  having?: FieldFilter;           // filtro post-aggregazione
}

/**
 * Configurazione join tra tabelle
 */
export interface TableJoin {
  from: string;       // tabella di origine
  to: string;         // tabella destinazione
  fromField: string;  // campo join in from
  toField: string;    // campo join in to
  type: JoinType;     // tipo di join
}

/**
 * Configurazione ordinamento
 */
export interface SortConfig {
  field: string;      // campo per sort (formato: "table.field")
  order: SortOrder;   // ordine crescente/decrescente
}

/**
 * Query Plan generato dall'LLM
 * Rappresenta la query da eseguire in formato strutturato
 */
export interface QueryPlan {
  intent: string;               // descrizione intento (per logging/debug)
  tables: TableName[];          // tabelle coinvolte nella query
  filters: FieldFilter[];       // filtri da applicare
  joins?: TableJoin[];          // join tra tabelle (se multi-table)
  aggregation?: Aggregation;    // aggregazione richiesta (se presente)
  sort?: SortConfig;            // ordinamento risultati (opzionale)
  limit?: number;               // limite numero risultati (opzionale)
}

/**
 * Risultato esecuzione query
 */
export interface QueryResult {
  success: boolean;             // esito operazione
  data?: any[];                 // dati risultanti (se query standard)
  aggregated?: any;             // risultato aggregato (se aggregazione presente)
  error?: string;               // messaggio errore (se success=false)
  executedQuery?: string;       // query SQL per debug (opzionale)
  rowCount?: number;            // numero righe restituite
}

/**
 * Risultato validazione Query Plan
 */
export interface ValidationResult {
  valid: boolean;               // query plan valido
  error?: string;               // messaggio errore se invalid
  warnings?: string[];          // warning non bloccanti
}

/**
 * Context per Response Composer
 */
export interface ResponseContext {
  userQuery: string;            // query originale utente
  queryPlan: QueryPlan;         // piano eseguito
  queryResult: QueryResult;     // risultato query
  executionTimeMs?: number;     // tempo esecuzione (ms)
}

/**
 * Configurazione Query Planner
 */
export interface PlannerConfig {
  model?: string;               // modello LLM da usare
  temperature?: number;         // temperatura generazione
  maxTokens?: number;           // max token response
  timeoutMs?: number;           // timeout chiamata LLM
}

/**
 * Configurazione Query Executor
 */
export interface ExecutorConfig {
  maxRows?: number;             // max righe risultato (default: 100)
  timeoutMs?: number;           // timeout query DB
  enableLogging?: boolean;      // abilita log query
}

/**
 * Statistiche esecuzione query
 */
export interface QueryStats {
  planningTimeMs: number;       // tempo generazione piano
  executionTimeMs: number;      // tempo esecuzione query
  composingTimeMs: number;      // tempo composizione risposta
  totalTimeMs: number;          // tempo totale
  rowsReturned: number;         // righe restituite
  tablesQueried: string[];      // tabelle interrogate
}

/**
 * Error type specifico per semantic system
 */
export class SemanticError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SemanticError';
  }
}

/**
 * Codici errore comuni
 */
export enum SemanticErrorCode {
  INVALID_QUERY_PLAN = 'INVALID_QUERY_PLAN',
  QUERY_EXECUTION_FAILED = 'QUERY_EXECUTION_FAILED',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  UNAUTHORIZED_TABLE = 'UNAUTHORIZED_TABLE',
  INVALID_FILTER = 'INVALID_FILTER',
  AGGREGATION_ERROR = 'AGGREGATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
