#!/usr/bin/env npx tsx
// tests/auto-debug/runner.ts
// Runner principale per il sistema di auto-debug
//
// Esegui con: npx tsx tests/auto-debug/runner.ts
// Opzioni:
//   --skip-e2e      Salta test E2E Playwright
//   --skip-nlu      Salta test NLU
//   --skip-semantic Salta test semantici
//   --json          Output JSON
//   --report        Genera report HTML

import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

import { runPreflight, printPreflightReport, type PreflightReport } from './preflight';
import { runHealthChecks, printHealthReport, type HealthReport } from './health';
import { runSemanticTests, printSemanticReport, type SemanticReport } from './semantic';
import { runAllUserFlows, printUserFlowsReport, type FlowResult } from './user-flows';

// ═══════════════════════════════════════════════════════════════
// TIPI
// ═══════════════════════════════════════════════════════════════

interface NLUReport {
  timestamp: string;
  total: number;
  passed: number;
  passRate: number;
}

interface E2EReport {
  timestamp: string;
  total: number;
  passed: number;
  passRate: number;
  skipped: boolean;
}

interface UserFlowsReport {
  timestamp: string;
  flows: FlowResult[];
  total: number;
  passed: number;
  passRate: number;
}

interface FullReport {
  timestamp: string;
  preflight: PreflightReport;
  health: HealthReport;
  nlu: NLUReport | null;
  semantic: SemanticReport;
  userFlows: UserFlowsReport | null;
  e2e: E2EReport | null;
  overall: {
    status: 'PASS' | 'FAIL' | 'PARTIAL';
    score: number;
    summary: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getRootDir(): string {
  return path.resolve(__dirname, '../..');
}

async function runCommand(cmd: string, args: string[], cwd: string): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, shell: true });
    let stdout = '';

    proc.stdout?.on('data', (data) => { stdout += data.toString(); });
    proc.stderr?.on('data', (data) => { stdout += data.toString(); });

    proc.on('close', (code) => {
      resolve({ stdout, exitCode: code || 0 });
    });

    proc.on('error', () => {
      resolve({ stdout, exitCode: 1 });
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// TEST RUNNERS
// ═══════════════════════════════════════════════════════════════

async function runNLUTests(rootDir: string): Promise<NLUReport | null> {
  console.log('\n' + '═'.repeat(70));
  console.log('  🧪 NLU TESTS (esistenti)');
  console.log('═'.repeat(70) + '\n');

  try {
    const { stdout, exitCode } = await runCommand(
      'npx',
      ['tsx', 'test/run-nlu-tests.ts', '--json'],
      rootDir
    );

    // Parse JSON output
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      console.log(`  ✅ Test eseguiti: ${data.summary.total}`);
      console.log(`  ✅ Passati: ${data.summary.passed}`);
      console.log(`  ${data.summary.failed > 0 ? '❌' : '✅'} Falliti: ${data.summary.failed}`);
      console.log(`  📊 Pass rate: ${data.summary.passRate.toFixed(1)}%`);

      return {
        timestamp: data.timestamp,
        total: data.summary.total,
        passed: data.summary.passed,
        passRate: data.summary.passRate,
      };
    }

    console.log('  ⚠️ Output NLU non parsabile');
    return null;
  } catch (e: any) {
    console.log(`  ❌ Errore NLU tests: ${e.message}`);
    return null;
  }
}

async function runE2ETests(rootDir: string): Promise<E2EReport | null> {
  console.log('\n' + '═'.repeat(70));
  console.log('  🎭 E2E TESTS (Playwright)');
  console.log('═'.repeat(70) + '\n');

  // Verifica se auth state esiste
  const authPath = path.join(rootDir, 'tests/.auth/user.json');
  if (!fs.existsSync(authPath)) {
    console.log('  ⚠️ Auth state mancante');
    console.log('  ℹ️ Esegui prima: npx playwright test --project=setup');
    return { timestamp: new Date().toISOString(), total: 0, passed: 0, passRate: 0, skipped: true };
  }

  try {
    const { stdout, exitCode } = await runCommand(
      'npx',
      ['playwright', 'test', '--reporter=json'],
      rootDir
    );

    // Parse risultati (semplificato)
    const passMatch = stdout.match(/(\d+) passed/);
    const failMatch = stdout.match(/(\d+) failed/);
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    const total = passed + failed;

    console.log(`  ${exitCode === 0 ? '✅' : '❌'} Exit code: ${exitCode}`);
    console.log(`  📊 Passati: ${passed}/${total}`);

    return {
      timestamp: new Date().toISOString(),
      total,
      passed,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      skipped: false,
    };
  } catch (e: any) {
    console.log(`  ❌ Errore E2E tests: ${e.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════

function generateHTMLReport(report: FullReport, outputPath: string): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>REPING Auto-Debug Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .status-pass { color: #4CAF50; }
    .status-fail { color: #f44336; }
    .status-partial { color: #ff9800; }
    .card { background: #f5f5f5; border-radius: 8px; padding: 15px; margin: 10px 0; }
    .metric { display: inline-block; margin-right: 20px; }
    .metric-value { font-size: 24px; font-weight: bold; }
    .metric-label { color: #666; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #333; color: white; }
    .icon { margin-right: 5px; }
  </style>
</head>
<body>
  <h1>🧪 REPING Auto-Debug Report</h1>
  <p>Generated: ${report.timestamp}</p>
  
  <div class="card">
    <h2 class="status-${report.overall.status.toLowerCase()}">${report.overall.status}</h2>
    <div class="metric">
      <div class="metric-value">${report.overall.score.toFixed(1)}%</div>
      <div class="metric-label">Overall Score</div>
    </div>
    <p>${report.overall.summary}</p>
  </div>

  <h2>🔍 Pre-flight Checks</h2>
  <table>
    <tr><th>Check</th><th>Status</th><th>Message</th></tr>
    ${report.preflight.checks.map(c => `
      <tr>
        <td>${c.name}</td>
        <td>${c.status === 'pass' ? '✅' : c.status === 'warn' ? '⚠️' : '❌'}</td>
        <td>${c.message}</td>
      </tr>
    `).join('')}
  </table>

  <h2>🏥 Health Checks</h2>
  <table>
    <tr><th>Service</th><th>Status</th><th>Latency</th><th>Message</th></tr>
    ${report.health.checks.map(c => `
      <tr>
        <td>${c.name}</td>
        <td>${c.status === 'healthy' ? '✅' : c.status === 'degraded' ? '⚠️' : '❌'}</td>
        <td>${c.latencyMs}ms</td>
        <td>${c.message}</td>
      </tr>
    `).join('')}
  </table>

  ${report.nlu ? `
  <h2>🧪 NLU Tests</h2>
  <div class="card">
    <div class="metric">
      <div class="metric-value">${report.nlu.passed}/${report.nlu.total}</div>
      <div class="metric-label">Tests Passed</div>
    </div>
    <div class="metric">
      <div class="metric-value">${report.nlu.passRate.toFixed(1)}%</div>
      <div class="metric-label">Pass Rate</div>
    </div>
  </div>
  ` : ''}

  <h2>🧠 Semantic Tests</h2>
  <div class="card">
    <div class="metric">
      <div class="metric-value">${report.semantic.summary.passed}/${report.semantic.summary.total}</div>
      <div class="metric-label">Tests Passed</div>
    </div>
    <div class="metric">
      <div class="metric-value">${report.semantic.summary.passRate.toFixed(1)}%</div>
      <div class="metric-label">Pass Rate</div>
    </div>
  </div>
  <table>
    <tr><th>Category</th><th>Passed</th><th>Total</th><th>Rate</th></tr>
    ${Object.entries(report.semantic.summary.byCategory).map(([cat, stats]) => `
      <tr>
        <td>${cat}</td>
        <td>${stats.passed}</td>
        <td>${stats.total}</td>
        <td>${((stats.passed / stats.total) * 100).toFixed(0)}%</td>
      </tr>
    `).join('')}
  </table>

  ${report.e2e && !report.e2e.skipped ? `
  <h2>🎭 E2E Tests</h2>
  <div class="card">
    <div class="metric">
      <div class="metric-value">${report.e2e.passed}/${report.e2e.total}</div>
      <div class="metric-label">Tests Passed</div>
    </div>
    <div class="metric">
      <div class="metric-value">${report.e2e.passRate.toFixed(1)}%</div>
      <div class="metric-label">Pass Rate</div>
    </div>
  </div>
  ` : '<h2>🎭 E2E Tests</h2><p>Skipped (auth state missing)</p>'}

</body>
</html>`;

  fs.writeFileSync(outputPath, html);
  console.log(`\n  📄 Report HTML salvato: ${outputPath}`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const skipE2E = args.includes('--skip-e2e');
  const skipNLU = args.includes('--skip-nlu');
  const skipSemantic = args.includes('--skip-semantic');
  const jsonOutput = args.includes('--json');
  const generateReport = args.includes('--report');

  const rootDir = getRootDir();

  console.log('\n' + '█'.repeat(70));
  console.log('█  🚀 REPING AUTO-DEBUG SYSTEM');
  console.log('█'.repeat(70) + '\n');
  console.log(`Root: ${rootDir}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // 1. Pre-flight
  const preflight = await runPreflight(rootDir);
  if (!jsonOutput) printPreflightReport(preflight);

  if (!preflight.canProceed) {
    console.log('\n❌ Pre-flight fallito. Risolvi i problemi prima di continuare.\n');
    process.exit(1);
  }

  // 2. Health checks
  const health = await runHealthChecks(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000');
  if (!jsonOutput) printHealthReport(health);

  // 3. NLU Tests
  let nlu: NLUReport | null = null;
  if (!skipNLU) {
    nlu = await runNLUTests(rootDir);
  }

  // 4. Semantic Tests
  let semantic: SemanticReport;
  if (!skipSemantic) {
    semantic = await runSemanticTests();
    if (!jsonOutput) printSemanticReport(semantic);
  } else {
    semantic = {
      timestamp: new Date().toISOString(),
      results: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0, byCategory: {} },
    };
  }

  // 4b. User Flow Tests (simulazione flussi reali)
  let userFlows: UserFlowsReport | null = null;
  if (!skipSemantic) {
    const flowResults = runAllUserFlows();
    if (!jsonOutput) printUserFlowsReport(flowResults);
    
    const totalSteps = flowResults.reduce((acc, f) => acc + f.steps.length, 0);
    const passedSteps = flowResults.reduce((acc, f) => acc + f.steps.filter(s => s.passed).length, 0);
    
    userFlows = {
      timestamp: new Date().toISOString(),
      flows: flowResults,
      total: totalSteps,
      passed: passedSteps,
      passRate: (passedSteps / totalSteps) * 100,
    };
  }

  // 5. E2E Tests
  let e2e: E2EReport | null = null;
  if (!skipE2E) {
    e2e = await runE2ETests(rootDir);
  }

  // 6. Calcola overall score
  const scores: number[] = [];
  if (nlu) scores.push(nlu.passRate);
  if (semantic.summary.total > 0) scores.push(semantic.summary.passRate);
  if (userFlows && userFlows.total > 0) scores.push(userFlows.passRate);
  if (e2e && !e2e.skipped && e2e.total > 0) scores.push(e2e.passRate);

  const overallScore = scores.length > 0 
    ? scores.reduce((a, b) => a + b, 0) / scores.length 
    : 0;

  const overallStatus: 'PASS' | 'FAIL' | 'PARTIAL' = 
    overallScore >= 90 ? 'PASS' : overallScore >= 70 ? 'PARTIAL' : 'FAIL';

  const fullReport: FullReport = {
    timestamp: new Date().toISOString(),
    preflight,
    health,
    nlu,
    semantic,
    userFlows,
    e2e,
    overall: {
      status: overallStatus,
      score: overallScore,
      summary: `${scores.length} suite testate, score medio ${overallScore.toFixed(1)}%`,
    },
  };

  // 7. Output finale
  if (jsonOutput) {
    console.log(JSON.stringify(fullReport, null, 2));
  } else {
    console.log('\n' + '█'.repeat(70));
    console.log('█  📊 RISULTATO FINALE');
    console.log('█'.repeat(70) + '\n');

    const statusIcon = overallStatus === 'PASS' ? '✅' : overallStatus === 'PARTIAL' ? '⚠️' : '❌';
    const statusColor = overallStatus === 'PASS' ? '\x1b[32m' : overallStatus === 'PARTIAL' ? '\x1b[33m' : '\x1b[31m';

    console.log(`  ${statusIcon} Status: ${statusColor}${overallStatus}\x1b[0m`);
    console.log(`  📊 Score: ${statusColor}${overallScore.toFixed(1)}%\x1b[0m`);
    console.log(`  📝 ${fullReport.overall.summary}`);
    console.log('\n' + '█'.repeat(70) + '\n');
  }

  // 8. Genera report HTML
  if (generateReport) {
    const reportDir = path.join(rootDir, 'test-report');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    generateHTMLReport(fullReport, path.join(reportDir, 'auto-debug-report.html'));
  }

  process.exit(overallStatus === 'FAIL' ? 1 : 0);
}

main().catch(e => {
  console.error('Errore fatale:', e);
  process.exit(1);
});
