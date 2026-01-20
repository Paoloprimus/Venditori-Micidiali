// tests/auto-debug/preflight.ts
// Pre-flight checks: verifica che tutto sia pronto per i test

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carica env vars da .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface PreflightResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

export interface PreflightReport {
  timestamp: string;
  checks: PreflightResult[];
  canProceed: boolean;
}

// Env vars richieste per test completi (E2E, seeding)
// Ma non bloccano i test NLU/semantic che sono offline
const REQUIRED_ENV_VARS: string[] = [];

const OPTIONAL_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'TEST_EMAIL',
  'TEST_PASSWORD',
  'TEST_PASSPHRASE',
];

const REQUIRED_FILES = [
  'package.json',
  'next.config.mjs',
  'lib/supabase/client.ts',
  'lib/nlu/unified.ts',
];

/**
 * Verifica variabili d'ambiente
 */
function checkEnvVars(): PreflightResult[] {
  const results: PreflightResult[] = [];

  // Required
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    results.push({
      name: `ENV: ${envVar}`,
      status: value ? 'pass' : 'fail',
      message: value ? 'Configurato' : 'Mancante (REQUIRED)',
      details: value ? `${value.slice(0, 20)}...` : undefined,
    });
  }

  // Optional
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar];
    results.push({
      name: `ENV: ${envVar}`,
      status: value ? 'pass' : 'warn',
      message: value ? 'Configurato' : 'Mancante (opzionale)',
    });
  }

  return results;
}

/**
 * Verifica file necessari
 */
function checkRequiredFiles(rootDir: string): PreflightResult[] {
  const results: PreflightResult[] = [];

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(rootDir, file);
    const exists = fs.existsSync(filePath);
    results.push({
      name: `FILE: ${file}`,
      status: exists ? 'pass' : 'fail',
      message: exists ? 'Presente' : 'Mancante',
    });
  }

  return results;
}

/**
 * Verifica dipendenze npm
 */
function checkDependencies(rootDir: string): PreflightResult[] {
  const results: PreflightResult[] = [];
  const nodeModulesPath = path.join(rootDir, 'node_modules');

  if (!fs.existsSync(nodeModulesPath)) {
    results.push({
      name: 'NPM: node_modules',
      status: 'fail',
      message: 'node_modules non trovato - esegui npm install',
    });
    return results;
  }

  // Verifica dipendenze chiave
  const criticalDeps = ['@supabase/supabase-js', 'openai', '@anthropic-ai/sdk', 'next'];
  for (const dep of criticalDeps) {
    const depPath = path.join(nodeModulesPath, dep);
    const exists = fs.existsSync(depPath);
    results.push({
      name: `DEP: ${dep}`,
      status: exists ? 'pass' : 'fail',
      message: exists ? 'Installato' : 'Mancante',
    });
  }

  return results;
}

/**
 * Verifica auth state salvato
 */
function checkAuthState(rootDir: string): PreflightResult[] {
  const authPath = path.join(rootDir, 'tests/.auth/user.json');
  const exists = fs.existsSync(authPath);

  return [{
    name: 'AUTH: Stato salvato',
    status: exists ? 'pass' : 'warn',
    message: exists 
      ? 'Auth state presente (login precedente)' 
      : 'Auth state mancante - richiederà login',
  }];
}

/**
 * Esegue tutti i pre-flight checks
 */
export async function runPreflight(rootDir: string): Promise<PreflightReport> {
  const checks: PreflightResult[] = [
    ...checkEnvVars(),
    ...checkRequiredFiles(rootDir),
    ...checkDependencies(rootDir),
    ...checkAuthState(rootDir),
  ];

  const failedCritical = checks.filter(c => c.status === 'fail' && !c.name.includes('TEST_'));
  const canProceed = failedCritical.length === 0;

  return {
    timestamp: new Date().toISOString(),
    checks,
    canProceed,
  };
}

/**
 * Stampa report pre-flight
 */
export function printPreflightReport(report: PreflightReport): void {
  console.log('\n' + '═'.repeat(70));
  console.log('  🔍 PRE-FLIGHT CHECKS');
  console.log('═'.repeat(70) + '\n');

  for (const check of report.checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    console.log(`  ${icon} ${check.name.padEnd(35)} ${check.message}`);
    if (check.details) {
      console.log(`     └─ ${check.details}`);
    }
  }

  console.log('\n' + '─'.repeat(70));
  if (report.canProceed) {
    console.log('  ✅ Pre-flight: PASSED - Si può procedere con i test');
  } else {
    console.log('  ❌ Pre-flight: FAILED - Risolvi i problemi sopra prima di continuare');
  }
  console.log('─'.repeat(70) + '\n');
}
