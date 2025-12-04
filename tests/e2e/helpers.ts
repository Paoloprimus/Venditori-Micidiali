import { Page } from '@playwright/test';

/**
 * Chiude qualsiasi modal/overlay visibile
 */
export async function dismissModals(page: Page) {
  const closeSelectors = [
    'button:has-text("Chiudi")',
    'button:has-text("OK")',
    'button:has-text("Ho capito")',
    'button:has-text("Inizia")',
    'button:has-text("Avanti")',
    'button:has-text("→")',
    '[aria-label="Chiudi"]',
    '[aria-label="Close"]',
    '[role="dialog"] button:first-child',
    '.fixed.inset-0 button',
  ];
  
  for (const selector of closeSelectors) {
    try {
      const closeBtn = page.locator(selector).first();
      if (await closeBtn.isVisible({ timeout: 300 }).catch(() => false)) {
        await closeBtn.click().catch(() => {});
        await page.waitForTimeout(300);
      }
    } catch {
      // Ignora errori
    }
  }
}

/**
 * Aspetta che la pagina sia completamente caricata e chiude i modal
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await dismissModals(page);
  await page.waitForTimeout(300);
}

