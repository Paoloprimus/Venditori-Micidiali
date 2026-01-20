// tests/auto-debug/health.ts
// Health checks: verifica che le API e i servizi siano raggiungibili

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latencyMs: number;
  message: string;
  details?: any;
}

export interface HealthReport {
  timestamp: string;
  checks: HealthCheckResult[];
  overallStatus: 'healthy' | 'unhealthy' | 'degraded';
}

/**
 * Verifica connessione Supabase
 */
async function checkSupabase(baseUrl: string): Promise<HealthCheckResult> {
  const start = Date.now();
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return {
        name: 'Supabase',
        status: 'unhealthy',
        latencyMs: 0,
        message: 'NEXT_PUBLIC_SUPABASE_URL non configurato',
      };
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    const latencyMs = Date.now() - start;
    
    return {
      name: 'Supabase',
      status: response.ok || response.status === 400 ? 'healthy' : 'unhealthy',
      latencyMs,
      message: response.ok || response.status === 400 
        ? `Raggiungibile (${latencyMs}ms)` 
        : `Errore: ${response.status}`,
    };
  } catch (e: any) {
    return {
      name: 'Supabase',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: `Connessione fallita: ${e.message}`,
    };
  }
}

/**
 * Verifica app locale
 */
async function checkLocalApp(baseUrl: string): Promise<HealthCheckResult> {
  const start = Date.now();
  
  try {
    const response = await fetch(baseUrl, { method: 'HEAD' });
    const latencyMs = Date.now() - start;

    return {
      name: 'App Locale',
      status: response.ok ? 'healthy' : 'unhealthy',
      latencyMs,
      message: response.ok 
        ? `Running su ${baseUrl} (${latencyMs}ms)` 
        : `Non raggiungibile: ${response.status}`,
    };
  } catch (e: any) {
    return {
      name: 'App Locale',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: `App non in esecuzione su ${baseUrl}`,
      details: 'Avvia l\'app con: npm run dev',
    };
  }
}

/**
 * Verifica chiave OpenAI
 */
async function checkOpenAI(): Promise<HealthCheckResult> {
  const start = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      name: 'OpenAI',
      status: 'degraded',
      latencyMs: 0,
      message: 'OPENAI_API_KEY non configurato (RAG non funzionerà)',
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const latencyMs = Date.now() - start;

    return {
      name: 'OpenAI',
      status: response.ok ? 'healthy' : 'degraded',
      latencyMs,
      message: response.ok 
        ? `API raggiungibile (${latencyMs}ms)` 
        : `Errore API: ${response.status}`,
    };
  } catch (e: any) {
    return {
      name: 'OpenAI',
      status: 'degraded',
      latencyMs: Date.now() - start,
      message: `Connessione fallita: ${e.message}`,
    };
  }
}

/**
 * Verifica chiave Anthropic
 */
async function checkAnthropic(): Promise<HealthCheckResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      name: 'Anthropic',
      status: 'degraded',
      latencyMs: 0,
      message: 'ANTHROPIC_API_KEY non configurato (LLM fallback non funzionerà)',
    };
  }

  // Non facciamo una vera chiamata per non consumare crediti
  return {
    name: 'Anthropic',
    status: 'healthy',
    latencyMs: 0,
    message: 'API key configurata',
  };
}

/**
 * Esegue tutti gli health checks
 */
export async function runHealthChecks(baseUrl: string = 'http://localhost:3000'): Promise<HealthReport> {
  const checks = await Promise.all([
    checkLocalApp(baseUrl),
    checkSupabase(baseUrl),
    checkOpenAI(),
    checkAnthropic(),
  ]);

  const unhealthy = checks.filter(c => c.status === 'unhealthy');
  const degraded = checks.filter(c => c.status === 'degraded');

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  if (unhealthy.length > 0) overallStatus = 'unhealthy';
  else if (degraded.length > 0) overallStatus = 'degraded';

  return {
    timestamp: new Date().toISOString(),
    checks,
    overallStatus,
  };
}

/**
 * Stampa report health
 */
export function printHealthReport(report: HealthReport): void {
  console.log('\n' + '═'.repeat(70));
  console.log('  🏥 HEALTH CHECKS');
  console.log('═'.repeat(70) + '\n');

  for (const check of report.checks) {
    const icon = check.status === 'healthy' ? '✅' 
      : check.status === 'degraded' ? '⚠️' : '❌';
    const latency = check.latencyMs > 0 ? ` [${check.latencyMs}ms]` : '';
    console.log(`  ${icon} ${check.name.padEnd(20)} ${check.message}${latency}`);
    if (check.details) {
      console.log(`     └─ ${check.details}`);
    }
  }

  console.log('\n' + '─'.repeat(70));
  const statusIcon = report.overallStatus === 'healthy' ? '✅' 
    : report.overallStatus === 'degraded' ? '⚠️' : '❌';
  console.log(`  ${statusIcon} Overall Status: ${report.overallStatus.toUpperCase()}`);
  console.log('─'.repeat(70) + '\n');
}
