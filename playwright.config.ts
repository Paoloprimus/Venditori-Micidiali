import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Carica variabili d'ambiente da .env.test
dotenv.config({ path: '.env.test' });

/**
 * REPING - Playwright E2E Test Configuration
 * 
 * Per eseguire i test:
 * - npx playwright test              (tutti i test)
 * - npx playwright test --ui         (modalità interattiva)
 * - npx playwright test --headed     (browser visibile)
 * - npx playwright test auth.spec.ts (singolo file)
 */

export default defineConfig({
  testDir: './tests/e2e',
  
  /* Timeout per singolo test */
  timeout: 60000,
  
  /* Timeout per expect() */
  expect: {
    timeout: 10000
  },
  
  /* Esegui test in parallelo */
  fullyParallel: false, // false per evitare conflitti su DB
  
  /* Fail fast in CI */
  forbidOnly: !!process.env.CI,
  
  /* Retry solo in CI */
  retries: process.env.CI ? 2 : 0,
  
  /* Reporter */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  /* Configurazione condivisa per tutti i test */
  use: {
    /* Base URL dell'app */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Screenshot su failure */
    screenshot: 'only-on-failure',
    
    /* Video su failure */
    video: 'on-first-retry',
    
    /* Trace per debug */
    trace: 'on-first-retry',
    
    /* Viewport mobile-first */
    viewport: { width: 1280, height: 720 },
  },

  /* Progetto singolo semplificato */
  projects: [
    {
      name: 'tests',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
    },
  ],

  /* 
   * Server di sviluppo - DISABILITATO
   * Avvia l'app manualmente con: npm run dev
   * Prima di eseguire i test
   */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true,
  //   timeout: 120000,
  // },
});

