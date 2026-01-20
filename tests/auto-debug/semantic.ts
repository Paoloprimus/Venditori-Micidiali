// tests/auto-debug/semantic.ts
// Test semantici: verifica qualità RAG e risposte LLM

import { parseIntent, createEmptyContext } from '../../lib/nlu/unified';

export interface SemanticTestCase {
  id: string;
  query: string;
  category: 'rag_search' | 'llm_fallback' | 'context_handling' | 'entity_extraction';
  expectedBehavior: string;
  minConfidence?: number;
}

export interface SemanticTestResult {
  id: string;
  query: string;
  category: string;
  passed: boolean;
  actualIntent: string;
  confidence: number;
  message: string;
  details?: any;
}

export interface SemanticReport {
  timestamp: string;
  results: SemanticTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    byCategory: Record<string, { passed: number; total: number }>;
  };
}

// Test cases per valutazione semantica
const SEMANTIC_TEST_CASES: SemanticTestCase[] = [
  // RAG Search - Query che dovrebbero triggerare ricerca semantica
  {
    id: 'rag_1',
    query: 'cosa sai del bar centrale?',
    category: 'rag_search',
    expectedBehavior: 'Dovrebbe cercare clienti con nome simile a "bar centrale"',
  },
  {
    id: 'rag_2',
    query: 'dammi info su Rossi',
    category: 'rag_search',
    expectedBehavior: 'Dovrebbe cercare clienti con nome "Rossi"',
  },
  {
    id: 'rag_3',
    query: 'chi è il mio cliente migliore a Milano?',
    category: 'rag_search',
    expectedBehavior: 'Dovrebbe combinare ricerca per città e analytics',
  },

  // LLM Fallback - Query complesse non gestibili localmente
  {
    id: 'llm_1',
    query: 'come posso migliorare le mie vendite nel settore bar?',
    category: 'llm_fallback',
    expectedBehavior: 'Dovrebbe delegare a LLM per risposta strategica',
  },
  {
    id: 'llm_2',
    query: 'quali trend vedi nei miei dati?',
    category: 'llm_fallback',
    expectedBehavior: 'Dovrebbe delegare a LLM per analisi complessa',
  },

  // Context Handling - Gestione contesto conversazione
  {
    id: 'ctx_1',
    query: 'quanti clienti ho?',
    category: 'context_handling',
    expectedBehavior: 'Dovrebbe riconoscere intent client_count',
    minConfidence: 0.9,
  },
  {
    id: 'ctx_2',
    query: 'e a Milano?',
    category: 'context_handling',
    expectedBehavior: 'Dovrebbe capire il riferimento al contesto precedente',
  },

  // Entity Extraction - Estrazione entità accurate
  {
    id: 'ent_1',
    query: 'visite di questa settimana',
    category: 'entity_extraction',
    expectedBehavior: 'Dovrebbe estrarre period=week',
    minConfidence: 0.8,
  },
  {
    id: 'ent_2',
    query: 'vendite a Bianchi',
    category: 'entity_extraction',
    expectedBehavior: 'Dovrebbe estrarre clientName=Bianchi',
    minConfidence: 0.8,
  },
  {
    id: 'ent_3',
    query: 'ricordami di chiamare Mario domani alle 10',
    category: 'entity_extraction',
    expectedBehavior: 'Dovrebbe estrarre reminder con time e contact',
  },
];

/**
 * Esegue un singolo test semantico
 */
function runSemanticTest(test: SemanticTestCase): SemanticTestResult {
  const context = createEmptyContext();
  const parsed = parseIntent(test.query, context);

  const minConf = test.minConfidence ?? 0.5;
  const confidenceOk = parsed.confidence >= minConf;

  // Valutazione basata sulla categoria
  let passed = false;
  let message = '';

  switch (test.category) {
    case 'rag_search':
      // Per RAG, ci aspettiamo unknown o rag_response (se LLM attivo)
      passed = parsed.intent === 'unknown' || parsed.intent.includes('search') || parsed.intent.includes('rag');
      message = passed 
        ? 'Correttamente identificato come query RAG/unknown' 
        : `Intent ${parsed.intent} invece di unknown/rag`;
      break;

    case 'llm_fallback':
      // Per LLM fallback, ci aspettiamo unknown o strategy_*
      passed = parsed.intent === 'unknown' || parsed.intent.startsWith('strategy_');
      message = passed 
        ? 'Correttamente delegato a LLM/strategy' 
        : `Intent ${parsed.intent} non delega a LLM`;
      break;

    case 'context_handling':
      // Per context, verifichiamo confidence alta
      passed = confidenceOk;
      message = passed 
        ? `Confidence ${(parsed.confidence * 100).toFixed(0)}% >= ${(minConf * 100).toFixed(0)}%` 
        : `Confidence ${(parsed.confidence * 100).toFixed(0)}% < ${(minConf * 100).toFixed(0)}%`;
      break;

    case 'entity_extraction':
      // Per entity, verifichiamo che ci siano entità estratte
      const hasEntities = Object.keys(parsed.entities).length > 0;
      passed = hasEntities && confidenceOk;
      message = passed 
        ? `Entità estratte: ${JSON.stringify(parsed.entities)}` 
        : hasEntities ? 'Confidence troppo bassa' : 'Nessuna entità estratta';
      break;
  }

  return {
    id: test.id,
    query: test.query,
    category: test.category,
    passed,
    actualIntent: parsed.intent,
    confidence: parsed.confidence,
    message,
    details: {
      entities: parsed.entities,
      expectedBehavior: test.expectedBehavior,
    },
  };
}

/**
 * Esegue tutti i test semantici
 */
export async function runSemanticTests(): Promise<SemanticReport> {
  const results = SEMANTIC_TEST_CASES.map(runSemanticTest);

  // Calcola summary
  const passed = results.filter(r => r.passed).length;
  const byCategory: Record<string, { passed: number; total: number }> = {};

  for (const r of results) {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { passed: 0, total: 0 };
    }
    byCategory[r.category].total++;
    if (r.passed) byCategory[r.category].passed++;
  }

  return {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      passRate: (passed / results.length) * 100,
      byCategory,
    },
  };
}

/**
 * Stampa report semantico
 */
export function printSemanticReport(report: SemanticReport): void {
  console.log('\n' + '═'.repeat(70));
  console.log('  🧠 SEMANTIC AI TESTS');
  console.log('═'.repeat(70) + '\n');

  // Raggruppa per categoria
  const byCategory = new Map<string, SemanticTestResult[]>();
  for (const r of report.results) {
    if (!byCategory.has(r.category)) {
      byCategory.set(r.category, []);
    }
    byCategory.get(r.category)!.push(r);
  }

  for (const [category, results] of byCategory) {
    const categoryStats = report.summary.byCategory[category];
    const catIcon = categoryStats.passed === categoryStats.total ? '✅' : '⚠️';
    console.log(`\n  ${catIcon} ${category.toUpperCase()} (${categoryStats.passed}/${categoryStats.total})`);
    console.log('  ' + '─'.repeat(50));

    for (const r of results) {
      const icon = r.passed ? '✓' : '✗';
      const color = r.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`    ${color}${icon}\x1b[0m "${r.query}"`);
      console.log(`      └─ ${r.message}`);
    }
  }

  console.log('\n' + '─'.repeat(70));
  const passColor = report.summary.passRate >= 80 ? '\x1b[32m' : report.summary.passRate >= 60 ? '\x1b[33m' : '\x1b[31m';
  console.log(`  ${passColor}Pass Rate: ${report.summary.passRate.toFixed(1)}%\x1b[0m (${report.summary.passed}/${report.summary.total})`);
  console.log('─'.repeat(70) + '\n');
}
