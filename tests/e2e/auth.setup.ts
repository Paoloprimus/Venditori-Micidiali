import { test as setup, expect } from '@playwright/test';

/**
 * Setup: Login e salvataggio stato autenticazione
 * 
 * Questo file esegue il login una volta e salva lo stato
 * per riutilizzarlo in tutti gli altri test.
 */

// Credenziali test (da variabili d'ambiente o hardcoded per test locali)
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@reping.it';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';
const TEST_PASSPHRASE = process.env.TEST_PASSPHRASE || 'TestPassphrase123!';

setup('authenticate', async ({ page }) => {
  // Vai alla pagina di login
  await page.goto('/login');
  
  // Aspetta che la pagina sia caricata
  await expect(page.locator('text=REPING')).toBeVisible({ timeout: 10000 });
  
  // TODO: Se richiede token beta, gestirlo qui
  // await page.fill('[placeholder*="token"]', 'BETA-TEST-TOKEN');
  
  // Compila form login
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  
  // Click su login
  await page.click('button[type="submit"]');
  
  // Aspetta redirect alla home o richiesta passphrase
  await page.waitForURL(url => 
    url.pathname === '/' || 
    url.pathname.includes('home') ||
    url.toString().includes('passphrase'),
    { timeout: 15000 }
  );
  
  // Se richiede passphrase, inseriscila
  const passphraseInput = page.locator('input[type="password"][placeholder*="passphrase"], input[type="password"][placeholder*="Passphrase"]');
  if (await passphraseInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passphraseInput.fill(TEST_PASSPHRASE);
    await page.click('button:has-text("Sblocca"), button:has-text("Conferma"), button[type="submit"]');
    await page.waitForTimeout(2000);
  }
  
  // Verifica che siamo nella home
  await expect(page).toHaveURL(/\/($|home)/, { timeout: 10000 });
  
  // Salva stato autenticazione
  await page.context().storageState({ path: 'tests/.auth/user.json' });
});

