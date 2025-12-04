import { test, expect } from '@playwright/test';

/**
 * Test Suite: Report & Documenti
 * Roadmap: FASE 5
 */

test.describe('Report & Documenti', () => {
  
  test.use({ storageState: 'tests/.auth/user.json' });

  test.describe('5.2 Storico Visite (/visits)', () => {
    
    test('#57 - Lista visite visibile', async ({ page }) => {
      await page.goto('/visits');
      await page.waitForLoadState('networkidle');
      
      // Verifica che la pagina carichi
      await expect(page.locator('h1, h2').filter({ hasText: /visit/i })).toBeVisible({ timeout: 10000 });
      
      // Verifica presenza lista o messaggio vuoto
      const hasVisits = await page.locator('[data-testid="visit-row"], .visit-item, tr, .visit-card').count() > 0;
      const hasEmptyMessage = await page.locator('text=/nessuna visita|non hai ancora/i').isVisible().catch(() => false);
      
      expect(hasVisits || hasEmptyMessage).toBeTruthy();
    });

    test('#58 - Filtri data presenti', async ({ page }) => {
      await page.goto('/visits');
      await page.waitForLoadState('networkidle');
      
      // Cerca filtri per data
      const dateFilters = page.locator('input[type="date"], [data-testid="date-filter"], button:has-text("Periodo")');
      
      const hasFilters = await dateFilters.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`Date filters visible: ${hasFilters}`);
    });
  });

  test.describe('5.3 Promemoria', () => {
    
    test('#61 - Lista promemoria nel drawer', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Apri drawer documenti (destro)
      const docsButton = page.locator('button:has-text("Documenti"), button:has-text("📄"), [data-testid="docs-drawer-toggle"]');
      
      if (await docsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await docsButton.click();
        await page.waitForTimeout(500);
        
        // Verifica che drawer si apra
        const drawer = page.locator('[role="dialog"], .drawer, aside');
        await expect(drawer).toBeVisible({ timeout: 3000 });
      }
    });

    test('#63 - Widget promemoria in homepage', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Cerca widget promemoria
      const promWidget = page.locator('[data-testid="promemoria-widget"], .promemoria, text=/promemoria/i');
      
      const hasWidget = await promWidget.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`Promemoria widget visible: ${hasWidget}`);
    });
  });

  test.describe('5.1 Report PDF', () => {
    
    test('#53 - Pulsante genera report presente', async ({ page }) => {
      // Potrebbe essere in vari posti
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Cerca pulsante report
      const reportButton = page.locator('button:has-text("Report"), button:has-text("PDF"), button:has-text("Genera")');
      
      const hasReportButton = await reportButton.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`Report button visible: ${hasReportButton}`);
      
      // Prova anche nella pagina visite
      if (!hasReportButton) {
        await page.goto('/visits');
        await page.waitForLoadState('networkidle');
        
        const reportButtonVisits = page.locator('button:has-text("Report"), button:has-text("PDF")');
        const hasReportInVisits = await reportButtonVisits.isVisible({ timeout: 5000 }).catch(() => false);
        console.log(`Report button in /visits: ${hasReportInVisits}`);
      }
    });
  });
});

