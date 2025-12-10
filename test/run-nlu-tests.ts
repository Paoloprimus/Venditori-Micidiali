#!/usr/bin/env npx tsx
// test/run-nlu-tests.ts
// Runner automatico per test NLU di Repping
// Esegui con: npx tsx test/run-nlu-tests.ts

import { TEST_QUERIES, PHASE1_NUMERIC_QUERIES, PHASE2_STRATEGY_QUERIES, PHASE3_VISUAL_QUERIES, EXTENDED_QUERIES, type TestQuery } from './nlu-queries';
import { parseIntent, createEmptyContext, type ParsedIntent } from '../lib/nlu/unified';

// ═══════════════════════════════════════════════════════════════
// CONFIGURAZIONE
// ═══════════════════════════════════════════════════════════════

const DEFAULT_MIN_CONFIDENCE = 0.75;
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

// ═══════════════════════════════════════════════════════════════
// TIPI
// ═══════════════════════════════════════════════════════════════

type TestResult = {
  id: number;
  query: string;
  expectedIntent: string;
  actualIntent: string;
  confidence: number;
  passed: boolean;
  intentMatch: boolean;
  confidenceOk: boolean;
  entitiesMatch: boolean;
  expectedEntities?: Record<string, any>;
  actualEntities?: Record<string, any>;
  errors: string[];
};

type TestSummary = {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  byIntent: Record<string, { total: number; passed: number }>;
  avgConfidence: number;
  lowConfidenceQueries: TestResult[];
};

// ═══════════════════════════════════════════════════════════════
// FUNZIONI TEST
// ═══════════════════════════════════════════════════════════════

function runSingleTest(test: TestQuery): TestResult {
  const context = createEmptyContext();
  const parsed = parseIntent(test.query, context);
  
  const minConfidence = test.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const intentMatch = parsed.intent === test.expectedIntent;
  const confidenceOk = parsed.confidence >= minConfidence;
  
  // Verifica entities se specificate
  let entitiesMatch = true;
  const errors: string[] = [];
  
  if (test.expectedEntities) {
    for (const [key, expectedValue] of Object.entries(test.expectedEntities)) {
      const actualValue = parsed.entities[key];
      
      if (actualValue === undefined) {
        entitiesMatch = false;
        errors.push(`Entity "${key}" mancante (atteso: "${expectedValue}")`);
      } else if (typeof expectedValue === 'string') {
        // Per stringhe, verifica che il valore contenga o sia uguale
        const normalizedExpected = expectedValue.toLowerCase();
        const normalizedActual = String(actualValue).toLowerCase();
        if (!normalizedActual.includes(normalizedExpected) && normalizedActual !== normalizedExpected) {
          entitiesMatch = false;
          errors.push(`Entity "${key}": atteso "${expectedValue}", ottenuto "${actualValue}"`);
        }
      } else if (actualValue !== expectedValue) {
        entitiesMatch = false;
        errors.push(`Entity "${key}": atteso ${expectedValue}, ottenuto ${actualValue}`);
      }
    }
  }
  
  if (!intentMatch) {
    errors.push(`Intent: atteso "${test.expectedIntent}", ottenuto "${parsed.intent}"`);
  }
  
  if (!confidenceOk) {
    errors.push(`Confidence: ${(parsed.confidence * 100).toFixed(0)}% < ${(minConfidence * 100).toFixed(0)}%`);
  }
  
  const passed = intentMatch && confidenceOk && entitiesMatch;
  
  return {
    id: test.id,
    query: test.query,
    expectedIntent: test.expectedIntent,
    actualIntent: parsed.intent,
    confidence: parsed.confidence,
    passed,
    intentMatch,
    confidenceOk,
    entitiesMatch,
    expectedEntities: test.expectedEntities,
    actualEntities: parsed.entities,
    errors,
  };
}

function runAllTests(queries: TestQuery[]): TestResult[] {
  return queries.map(runSingleTest);
}

function generateSummary(results: TestResult[]): TestSummary {
  const passed = results.filter(r => r.passed).length;
  const byIntent: Record<string, { total: number; passed: number }> = {};
  
  for (const r of results) {
    if (!byIntent[r.expectedIntent]) {
      byIntent[r.expectedIntent] = { total: 0, passed: 0 };
    }
    byIntent[r.expectedIntent].total++;
    if (r.passed) byIntent[r.expectedIntent].passed++;
  }
  
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  const lowConfidenceQueries = results.filter(r => r.confidence < 0.8);
  
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: (passed / results.length) * 100,
    byIntent,
    avgConfidence,
    lowConfidenceQueries,
  };
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════

function printHeader() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${COLORS.bold}${COLORS.cyan}  🧪 REPPING NLU TEST SUITE${COLORS.reset}`);
  console.log('═'.repeat(70) + '\n');
}

function printResult(r: TestResult) {
  const icon = r.passed ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
  const confColor = r.confidence >= 0.9 ? COLORS.green : r.confidence >= 0.75 ? COLORS.yellow : COLORS.red;
  
  console.log(
    `${icon} [${String(r.id).padStart(2)}] "${r.query}"` +
    `${COLORS.dim} → ${r.actualIntent} ${confColor}(${(r.confidence * 100).toFixed(0)}%)${COLORS.reset}`
  );
  
  if (!r.passed && r.errors.length > 0) {
    for (const err of r.errors) {
      console.log(`      ${COLORS.red}└─ ${err}${COLORS.reset}`);
    }
  }
}

function printSummary(summary: TestSummary) {
  console.log('\n' + '─'.repeat(70));
  console.log(`${COLORS.bold}📊 SOMMARIO${COLORS.reset}\n`);
  
  const passColor = summary.passRate >= 90 ? COLORS.green : summary.passRate >= 70 ? COLORS.yellow : COLORS.red;
  
  console.log(`  Totale test:     ${summary.total}`);
  console.log(`  ${COLORS.green}Passati:${COLORS.reset}         ${summary.passed}`);
  console.log(`  ${COLORS.red}Falliti:${COLORS.reset}         ${summary.failed}`);
  console.log(`  ${passColor}Pass rate:       ${summary.passRate.toFixed(1)}%${COLORS.reset}`);
  console.log(`  Confidence avg:  ${(summary.avgConfidence * 100).toFixed(1)}%`);
  
  console.log(`\n${COLORS.bold}📈 PER INTENT:${COLORS.reset}`);
  
  const sortedIntents = Object.entries(summary.byIntent)
    .sort((a, b) => b[1].total - a[1].total);
  
  for (const [intent, stats] of sortedIntents) {
    const rate = (stats.passed / stats.total) * 100;
    const rateColor = rate === 100 ? COLORS.green : rate >= 50 ? COLORS.yellow : COLORS.red;
    console.log(
      `  ${intent.padEnd(25)} ${rateColor}${stats.passed}/${stats.total}${COLORS.reset}` +
      ` (${rate.toFixed(0)}%)`
    );
  }
  
  if (summary.lowConfidenceQueries.length > 0) {
    console.log(`\n${COLORS.yellow}⚠️  Query con confidence bassa (<80%):${COLORS.reset}`);
    for (const q of summary.lowConfidenceQueries.slice(0, 5)) {
      console.log(`  • "${q.query}" → ${(q.confidence * 100).toFixed(0)}%`);
    }
  }
  
  console.log('\n' + '═'.repeat(70) + '\n');
}

function printJSON(results: TestResult[], summary: TestSummary) {
  const output = {
    timestamp: new Date().toISOString(),
    summary: {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      passRate: summary.passRate,
      avgConfidence: summary.avgConfidence,
    },
    results: results.map(r => ({
      id: r.id,
      query: r.query,
      expected: r.expectedIntent,
      actual: r.actualIntent,
      confidence: r.confidence,
      passed: r.passed,
      errors: r.errors,
    })),
    failedTests: results.filter(r => !r.passed).map(r => ({
      id: r.id,
      query: r.query,
      errors: r.errors,
    })),
  };
  
  console.log(JSON.stringify(output, null, 2));
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const includeExtended = args.includes('--extended');
  const includePhase1 = args.includes('--phase1');
  const includePhase2 = args.includes('--phase2');
  const includePhase3 = args.includes('--phase3');
  const includeAll = args.includes('--all');
  const onlyFailed = args.includes('--failed');
  
  let queries = TEST_QUERIES;
  if (includePhase1 || includeAll) queries = [...queries, ...PHASE1_NUMERIC_QUERIES];
  if (includePhase2 || includeAll) queries = [...queries, ...PHASE2_STRATEGY_QUERIES];
  if (includePhase3 || includeAll) queries = [...queries, ...PHASE3_VISUAL_QUERIES];
  if (includeExtended) queries = [...queries, ...EXTENDED_QUERIES];
  
  if (!jsonOutput) {
    printHeader();
    console.log(`Esecuzione di ${queries.length} test...\n`);
  }
  
  const results = runAllTests(queries);
  const summary = generateSummary(results);
  
  if (jsonOutput) {
    printJSON(results, summary);
  } else {
    const toShow = onlyFailed ? results.filter(r => !r.passed) : results;
    
    for (const r of toShow) {
      printResult(r);
    }
    
    printSummary(summary);
    
    // Exit code basato sui risultati
    process.exit(summary.failed > 0 ? 1 : 0);
  }
}

main();

