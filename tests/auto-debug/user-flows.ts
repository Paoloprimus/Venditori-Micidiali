// tests/auto-debug/user-flows.ts
// Simulazione di 3 flussi d'uso reali di un agente di commercio

import { parseIntent, createEmptyContext, type ConversationContext } from '../../lib/nlu/unified';

export interface FlowStep {
  userSays: string;
  expectedIntent: string[];   // Intent accettabili
  minConfidence: number;
  expectedOutcome: string;    // Cosa dovrebbe ottenere l'utente
}

export interface UserFlow {
  id: string;
  name: string;
  description: string;
  persona: string;
  steps: FlowStep[];
}

export interface FlowStepResult {
  userSays: string;
  passed: boolean;
  actualIntent: string;
  confidence: number;
  message: string;
  entities: Record<string, any>;
}

export interface FlowResult {
  flowId: string;
  flowName: string;
  steps: FlowStepResult[];
  passed: boolean;
  passRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// FLUSSO 1: Mattina - L'agente inizia la giornata
// ═══════════════════════════════════════════════════════════════════════════
const FLOW_MORNING: UserFlow = {
  id: 'morning_routine',
  name: '🌅 Mattina - Inizio giornata',
  description: "L'agente apre l'app al mattino e pianifica la giornata",
  persona: 'Mario, agente di commercio HoReCa, 15 clienti attivi',
  steps: [
    {
      userSays: 'buongiorno',
      expectedIntent: ['greet', 'greeting', 'briefing', 'help'],
      minConfidence: 0.6,
      expectedOutcome: 'Saluto e/o riepilogo giornata',
    },
    {
      userSays: 'cosa devo fare oggi?',
      expectedIntent: ['planning_today', 'briefing', 'visit_today', 'reminder_today'],
      minConfidence: 0.8,
      expectedOutcome: 'Lista visite programmate + promemoria + suggerimenti',
    },
    {
      userSays: 'quante visite ho in programma?',
      expectedIntent: ['visit_count', 'visit_today', 'planning_today'],
      minConfidence: 0.8,
      expectedOutcome: 'Numero visite del giorno',
    },
    {
      userSays: 'chi è il primo cliente?',
      expectedIntent: ['visit_by_position', 'visit_today', 'client_detail'],
      minConfidence: 0.7,
      expectedOutcome: 'Info sul primo cliente da visitare',
    },
    {
      userSays: 'e i promemoria?',
      expectedIntent: ['reminder_list', 'reminder_today', 'followup_filter'],
      minConfidence: 0.7,
      expectedOutcome: 'Lista promemoria attivi',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// FLUSSO 2: Ricerca cliente - L'agente cerca info su un cliente
// ═══════════════════════════════════════════════════════════════════════════
const FLOW_CLIENT_SEARCH: UserFlow = {
  id: 'client_search',
  name: '🔍 Ricerca cliente',
  description: "L'agente cerca informazioni su un cliente specifico prima di visitarlo",
  persona: 'Lucia, agente plurimandatario, sta per visitare Bar Centrale',
  steps: [
    {
      userSays: 'info su bar centrale',
      expectedIntent: ['client_detail', 'client_search', 'rag_response'],
      minConfidence: 0.7,
      expectedOutcome: 'Scheda cliente con ultima visita e vendite',
    },
    {
      userSays: "quando l'ho visto l'ultima volta?",
      expectedIntent: ['visit_last', 'visit_history', 'client_detail'],
      minConfidence: 0.75,
      expectedOutcome: 'Data e dettagli ultima visita',
    },
    {
      userSays: 'quanto ha speso quest\'anno?',
      expectedIntent: ['sales_by_client', 'sales_total', 'analytics_client_trend'],
      minConfidence: 0.7,
      expectedOutcome: 'Totale vendite anno per questo cliente',
    },
    {
      userSays: 'cosa gli ho venduto di solito?',
      expectedIntent: ['product_discussed', 'product_by_client', 'sales_by_client', 'analytics_client_trend', 'llm_response'],
      minConfidence: 0.6,
      expectedOutcome: 'Prodotti più ordinati dal cliente',
    },
    {
      userSays: 'registra visita',
      expectedIntent: ['visit_create', 'confirm'],
      minConfidence: 0.85,
      expectedOutcome: 'Avvio registrazione nuova visita',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// FLUSSO 3: Analisi - L'agente vuole capire come sta andando
// ═══════════════════════════════════════════════════════════════════════════
const FLOW_ANALYTICS: UserFlow = {
  id: 'analytics',
  name: '📊 Analisi performance',
  description: "L'agente analizza le sue performance per migliorare",
  persona: 'Giovanni, agente senior, vuole capire dove concentrarsi',
  steps: [
    {
      userSays: 'quanti clienti ho?',
      expectedIntent: ['client_count'],
      minConfidence: 0.9,
      expectedOutcome: 'Numero totale clienti',
    },
    {
      userSays: 'quante visite questo mese?',
      expectedIntent: ['visit_count', 'visit_history'],
      minConfidence: 0.8,
      expectedOutcome: 'Numero visite del mese corrente',
    },
    {
      userSays: 'quanto ho fatturato?',
      expectedIntent: ['sales_total', 'sales_period', 'sales_by_period', 'sales_summary'],
      minConfidence: 0.75,
      expectedOutcome: 'Totale fatturato (mese o anno)',
    },
    {
      userSays: 'chi sono i miei clienti migliori?',
      expectedIntent: ['analytics_top_clients', 'client_list', 'llm_response'],
      minConfidence: 0.7,
      expectedOutcome: 'Top clienti per fatturato',
    },
    {
      userSays: 'chi non vedo da un mese?',
      expectedIntent: ['client_inactive', 'strategy_churn_risk'],
      minConfidence: 0.75,
      expectedOutcome: 'Lista clienti trascurati/a rischio',
    },
    {
      userSays: 'e a Milano?',
      expectedIntent: ['followup_filter', 'client_list', 'client_search'],
      minConfidence: 0.7,
      expectedOutcome: 'Filtra clienti inattivi per Milano',
    },
  ],
};

const ALL_FLOWS: UserFlow[] = [FLOW_MORNING, FLOW_CLIENT_SEARCH, FLOW_ANALYTICS];

/**
 * Esegue un singolo flusso utente
 */
export function runUserFlow(flow: UserFlow): FlowResult {
  const context = createEmptyContext();
  const stepResults: FlowStepResult[] = [];

  for (const step of flow.steps) {
    const parsed = parseIntent(step.userSays, context);
    
    const intentOk = step.expectedIntent.includes(parsed.intent);
    const confidenceOk = parsed.confidence >= step.minConfidence;
    const passed = intentOk && confidenceOk;

    let message: string;
    if (passed) {
      message = `✓ "${parsed.intent}" (${(parsed.confidence * 100).toFixed(0)}%)`;
    } else if (!intentOk) {
      message = `✗ Got "${parsed.intent}" - expected: [${step.expectedIntent.join('|')}]`;
    } else {
      message = `✗ Confidence ${(parsed.confidence * 100).toFixed(0)}% < ${(step.minConfidence * 100).toFixed(0)}%`;
    }

    stepResults.push({
      userSays: step.userSays,
      passed,
      actualIntent: parsed.intent,
      confidence: parsed.confidence,
      message,
      entities: parsed.entities,
    });

    // Aggiorna contesto per step successivo
    context.history.push({
      intent: parsed.intent as any,
      entities: parsed.entities as any,
      timestamp: Date.now(),
    });
  }

  const passedCount = stepResults.filter(s => s.passed).length;

  return {
    flowId: flow.id,
    flowName: flow.name,
    steps: stepResults,
    passed: passedCount === stepResults.length,
    passRate: (passedCount / stepResults.length) * 100,
  };
}

/**
 * Esegue tutti i flussi utente
 */
export function runAllUserFlows(): FlowResult[] {
  return ALL_FLOWS.map(runUserFlow);
}

/**
 * Stampa risultati flussi
 */
export function printUserFlowsReport(results: FlowResult[]): void {
  console.log('\n' + '═'.repeat(70));
  console.log('  👤 SIMULAZIONE FLUSSI UTENTE');
  console.log('═'.repeat(70));

  for (const flow of results) {
    const icon = flow.passed ? '✅' : '⚠️';
    console.log(`\n  ${icon} ${flow.flowName}`);
    console.log('  ' + '─'.repeat(60));

    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];
      const stepIcon = step.passed ? '✓' : '✗';
      const color = step.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`    ${i + 1}. ${color}${stepIcon}\x1b[0m "${step.userSays}"`);
      console.log(`       ${step.message}`);
    }
    
    console.log(`\n    📊 Efficacia: ${flow.passRate.toFixed(0)}% (${flow.steps.filter(s => s.passed).length}/${flow.steps.length})`);
  }

  // Summary
  const totalSteps = results.reduce((acc, f) => acc + f.steps.length, 0);
  const passedSteps = results.reduce((acc, f) => acc + f.steps.filter(s => s.passed).length, 0);
  const overallRate = (passedSteps / totalSteps) * 100;

  console.log('\n' + '═'.repeat(70));
  const color = overallRate >= 80 ? '\x1b[32m' : overallRate >= 60 ? '\x1b[33m' : '\x1b[31m';
  console.log(`  ${color}EFFICACIA TOTALE: ${overallRate.toFixed(0)}%\x1b[0m (${passedSteps}/${totalSteps} step)`);
  console.log('═'.repeat(70) + '\n');
}
