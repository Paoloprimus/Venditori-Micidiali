// tests/auto-debug/semantic.ts
// Test semantici: verifica EFFICACIA risposte per l'utente (non processi interni)

import { parseIntent, createEmptyContext, ConversationContext } from '../../lib/nlu/unified';

export interface SemanticTestCase {
  id: string;
  query: string;
  category: 'comprensione' | 'risposta_utile' | 'flusso_conversazione';
  // Cosa ci aspettiamo che l'utente OTTENGA (non come il sistema lo fa)
  expectedOutcome: string;
  // Intent accettabili (se uno di questi → OK)
  acceptableIntents: string[];
  minConfidence?: number;
  // Per test di flusso: contesto precedente
  previousContext?: {
    lastIntent: string;
    lastEntities: Record<string, any>;
  };
}

export interface SemanticTestResult {
  id: string;
  query: string;
  category: string;
  passed: boolean;
  actualIntent: string;
  confidence: number;
  message: string;
  expectedOutcome: string;
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

// ═══════════════════════════════════════════════════════════════════════════
// TEST CASES - Orientati all'EFFICACIA per l'utente
// ═══════════════════════════════════════════════════════════════════════════

const SEMANTIC_TEST_CASES: SemanticTestCase[] = [
  // ───────────────────────────────────────────────────────────────────────
  // COMPRENSIONE: L'NLU capisce cosa vuole l'utente?
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'comp_1',
    query: 'quanti clienti ho?',
    category: 'comprensione',
    expectedOutcome: 'Utente riceve il numero totale dei suoi clienti',
    acceptableIntents: ['client_count'],
    minConfidence: 0.85,
  },
  {
    id: 'comp_2',
    query: 'info su Rossi',
    category: 'comprensione',
    expectedOutcome: 'Utente riceve dettagli sul cliente Rossi',
    acceptableIntents: ['client_detail', 'client_search', 'rag_response'],
    minConfidence: 0.7,
  },
  {
    id: 'comp_3',
    query: 'visite di oggi',
    category: 'comprensione',
    expectedOutcome: 'Utente vede lista visite di oggi',
    acceptableIntents: ['visit_today', 'visit_count'],
    minConfidence: 0.85,
  },
  {
    id: 'comp_4',
    query: 'quanto ho venduto questo mese?',
    category: 'comprensione',
    expectedOutcome: 'Utente vede totale vendite del mese',
    acceptableIntents: ['sales_total', 'sales_period', 'sales_by_period'],
    minConfidence: 0.8,
  },
  {
    id: 'comp_5',
    query: 'ricordami di chiamare il bar centrale domani',
    category: 'comprensione',
    expectedOutcome: 'Sistema crea un promemoria per domani',
    acceptableIntents: ['reminder_create'],
    minConfidence: 0.85,
  },

  // ───────────────────────────────────────────────────────────────────────
  // RISPOSTA UTILE: Il sistema fornisce info rilevanti?
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'util_1',
    query: 'chi sono i miei migliori clienti?',
    category: 'risposta_utile',
    expectedOutcome: 'Lista clienti ordinati per valore/frequenza',
    acceptableIntents: ['analytics_top_clients', 'client_list', 'llm_response'],
    minConfidence: 0.7,
  },
  {
    id: 'util_2',
    query: 'cosa devo fare oggi?',
    category: 'risposta_utile',
    expectedOutcome: 'Planning giornata: visite + promemoria + suggerimenti',
    acceptableIntents: ['planning_today', 'visit_today', 'reminder_today', 'briefing'],
    minConfidence: 0.8,
  },
  {
    id: 'util_3',
    query: 'chi non vedo da più di un mese?',
    category: 'risposta_utile',
    expectedOutcome: 'Lista clienti inattivi/trascurati',
    acceptableIntents: ['client_inactive', 'client_list', 'strategy_churn_risk'],
    minConfidence: 0.75,
  },
  {
    id: 'util_4',
    query: 'come sta andando Bianchi?',
    category: 'risposta_utile',
    expectedOutcome: 'Trend vendite/visite per cliente Bianchi',
    acceptableIntents: ['analytics_client_trend', 'client_detail', 'sales_by_client'],
    minConfidence: 0.7,
  },

  // ───────────────────────────────────────────────────────────────────────
  // FLUSSO CONVERSAZIONE: Il follow-up funziona?
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'flow_1',
    query: 'e a Milano?',
    category: 'flusso_conversazione',
    expectedOutcome: 'Filtra la query precedente per Milano',
    acceptableIntents: ['followup_filter', 'client_list', 'client_search'],
    minConfidence: 0.7,
    previousContext: { lastIntent: 'client_count', lastEntities: {} },
  },
  {
    id: 'flow_2',
    query: 'elencali',
    category: 'flusso_conversazione',
    expectedOutcome: 'Mostra lista del risultato precedente',
    acceptableIntents: ['followup_list', 'client_list'],
    minConfidence: 0.85,
    previousContext: { lastIntent: 'client_count', lastEntities: {} },
  },
  {
    id: 'flow_3',
    query: 'e ieri?',
    category: 'flusso_conversazione',
    expectedOutcome: 'Ripete query precedente con periodo=ieri',
    acceptableIntents: ['followup_period', 'visit_count', 'sales_period'],
    minConfidence: 0.8,
    previousContext: { lastIntent: 'visit_today', lastEntities: { period: 'today' } },
  },
];

/**
 * Esegue un singolo test semantico
 */
function runSemanticTest(test: SemanticTestCase): SemanticTestResult {
  // Crea contesto (con history se specificato)
  const context = createEmptyContext();
  if (test.previousContext) {
    context.history = [{
      intent: test.previousContext.lastIntent as any,
      entities: test.previousContext.lastEntities as any,
      timestamp: Date.now() - 5000,
    }];
  }

  const parsed = parseIntent(test.query, context);
  const minConf = test.minConfidence ?? 0.7;

  // TEST PASSA SE:
  // 1. L'intent è uno di quelli accettabili
  // 2. La confidence è sopra la soglia
  const intentOk = test.acceptableIntents.includes(parsed.intent);
  const confidenceOk = parsed.confidence >= minConf;
  const passed = intentOk && confidenceOk;

  let message: string;
  if (passed) {
    message = `✓ Intent "${parsed.intent}" (${(parsed.confidence * 100).toFixed(0)}%)`;
  } else if (!intentOk) {
    message = `Intent "${parsed.intent}" non tra i previsti: [${test.acceptableIntents.join(', ')}]`;
  } else {
    message = `Confidence ${(parsed.confidence * 100).toFixed(0)}% < ${(minConf * 100).toFixed(0)}% richiesta`;
  }

  return {
    id: test.id,
    query: test.query,
    category: test.category,
    passed,
    actualIntent: parsed.intent,
    confidence: parsed.confidence,
    message,
    expectedOutcome: test.expectedOutcome,
    details: {
      entities: parsed.entities,
      acceptableIntents: test.acceptableIntents,
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
  console.log('  🎯 TEST EFFICACIA RISPOSTE');
  console.log('═'.repeat(70) + '\n');

  // Raggruppa per categoria
  const byCategory = new Map<string, SemanticTestResult[]>();
  for (const r of report.results) {
    if (!byCategory.has(r.category)) {
      byCategory.set(r.category, []);
    }
    byCategory.get(r.category)!.push(r);
  }

  const categoryNames: Record<string, string> = {
    comprensione: '🧠 COMPRENSIONE (NLU capisce la richiesta?)',
    risposta_utile: '💡 RISPOSTA UTILE (info rilevanti?)',
    flusso_conversazione: '🔄 FLUSSO CONVERSAZIONE (follow-up?)',
  };

  for (const [category, results] of byCategory) {
    const categoryStats = report.summary.byCategory[category];
    const catIcon = categoryStats.passed === categoryStats.total ? '✅' : '⚠️';
    console.log(`\n  ${catIcon} ${categoryNames[category] || category.toUpperCase()} (${categoryStats.passed}/${categoryStats.total})`);
    console.log('  ' + '─'.repeat(60));

    for (const r of results) {
      const icon = r.passed ? '✓' : '✗';
      const color = r.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`    ${color}${icon}\x1b[0m "${r.query}"`);
      console.log(`      └─ ${r.message}`);
      if (!r.passed) {
        console.log(`      └─ Atteso: ${r.expectedOutcome}`);
      }
    }
  }

  console.log('\n' + '─'.repeat(70));
  const passColor = report.summary.passRate >= 80 ? '\x1b[32m' : report.summary.passRate >= 60 ? '\x1b[33m' : '\x1b[31m';
  console.log(`  ${passColor}Efficacia: ${report.summary.passRate.toFixed(1)}%\x1b[0m (${report.summary.passed}/${report.summary.total})`);
  console.log('─'.repeat(70) + '\n');
}
