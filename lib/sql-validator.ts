// lib/sql-validator.ts
// 🔒 Security layer - Validazione SQL con AST parsing

import { Parser } from 'node-sql-parser';

// Allowlist tabelle consentite
const ALLOWED_TABLES = ['accounts', 'visits'];

// Allowlist colonne per tabella (solo campi NON cifrati)
const ALLOWED_COLUMNS = {
  accounts: ['id', 'city', 'tipo_locale', 'user_id', 'created_at', 'updated_at'],
  visits: ['id', 'account_id', 'data_visita', 'importo_vendita', 'user_id', 'created_at']
};

// Limiti di sicurezza
const MAX_SQL_LENGTH = 2000;
const MAX_ROWS = 500;

/**
 * Valida SQL usando AST parsing per sicurezza
 * Blocca: INSERT, UPDATE, DELETE, DROP, tabelle non allowlist, query troppo lunghe
 */
export function validateSQL(sql: string): void {
  // 1. Controllo lunghezza
  if (sql.length > MAX_SQL_LENGTH) {
    throw new Error('SQL troppo lungo');
  }
  
  // 2. Parse AST
  const parser = new Parser();
  let ast;
  
  try {
    ast = parser.astify(sql);
  } catch (e) {
    throw new Error('SQL non valido');
  }
  
  // 3. Solo SELECT singola (no multiple queries)
  if (Array.isArray(ast)) {
    throw new Error('Query multiple non permesse');
  }
  
  if (ast.type !== 'select') {
    throw new Error('Solo SELECT permesse');
  }
  
  // 4. Verifica tabelle usate (allowlist)
  const tables = new Set<string>();
  parser.tableList(sql).forEach((t: string) => tables.add(t));
  
  for (const table of tables) {
    if (!ALLOWED_TABLES.includes(table)) {
      throw new Error(`Tabella non consentita: ${table}`);
    }
  }
  
  // 5. Verifica LIMIT presente
  if (!/LIMIT\s+\d+/i.test(sql)) {
    throw new Error('LIMIT obbligatorio');
  }
  
  // 6. Verifica LIMIT <= MAX_ROWS
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  if (limitMatch && parseInt(limitMatch[1]) > MAX_ROWS) {
    throw new Error(`LIMIT massimo: ${MAX_ROWS}`);
  }
}

/**
 * Forza LIMIT se mancante
 */
export function ensureLimit(sql: string): string {
  if (!/LIMIT\s+\d+/i.test(sql)) {
    return `${sql} LIMIT ${MAX_ROWS}`;
  }
  return sql;
}

/**
 * Sanitizza SQL aggiungendo LIMIT se manca
 * Throws se validazione fallisce
 */
export function sanitizeSQL(sql: string): string {
  const sanitized = ensureLimit(sql);
  validateSQL(sanitized);
  return sanitized;
}
