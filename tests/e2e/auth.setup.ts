import { test as setup, expect } from '@playwright/test';

/**
 * Setup: Login e salvataggio stato autenticazione
 * 
 * Questo file esegue il login una volta e salva lo stato
 * per riutilizzarlo in tutti gli altri test.
 */

// Credenziali test (da variabili d'ambiente)
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@reping.it';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';
const TEST_PASSPHRASE = process.env.TEST_PASSPHRASE || 'TestPassphrase123!';

setup('authenticate', async ({ page }) => {
  // Vai alla pagina di login
  await page.goto('/login');
  
  // Aspetta che la pagina sia caricata (cerca qualsiasi elemento del form)
  await page.waitForSelector('input[type="email"], input[type="password"]', { timeout: 15000 });
  
  // Compila form login
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  
  // Click su login
  await page.click('button[type="submit"]');
  
  // Aspetta redirect alla home
  await page.waitForURL(url => 
    url.pathname === '/' || 
    url.pathname.includes('home'),
    { timeout: 20000 }
  );
  
  // Aspetta che la pagina si stabilizzi
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Se c'è un modal di passphrase, gestiscilo
  const passphraseInput = page.locator('input[type="password"]').first();
  if (await passphraseInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await passphraseInput.fill(TEST_PASSPHRASE);
    const confirmBtn = page.locator('button:has-text("Sblocca"), button:has-text("Conferma"), button[type="submit"]').first();
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(2000);
    }
  }
  
  // Chiudi qualsiasi modal/overlay visibile (Welcome Modal, etc.)
  // Cerca pulsanti comuni di chiusura
  const closeSelectors = [
    'button:has-text("Chiudi")',
    'button:has-text("OK")',
    'button:has-text("Ho capito")',
    'button:has-text("Inizia")',
    'button:has-text("Avanti")',
    'button:has-text("→")',
    '[aria-label="Chiudi"]',
    '[aria-label="Close"]',
    'button.close',
    '.modal button',
    '[role="dialog"] button',
  ];
  
  for (const selector of closeSelectors) {
    const closeBtn = page.locator(selector).first();
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }
  
  // Aspetta che eventuali overlay scompaiano
  await page.waitForTimeout(1000);
  
  // Verifica che siamo nella home
  await expect(page).toHaveURL(/\/($|home)/, { timeout: 10000 });
  
  // Salva stato autenticazione
  await page.context().storageState({ path: 'tests/.auth/user.json' });
});

