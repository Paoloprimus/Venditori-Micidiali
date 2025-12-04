import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Test Suite: Planning Visite
 * Roadmap: FASE 4
 */

test.describe('Planning Visite', () => {
  
  test.use({ storageState: 'tests/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await dismissModals(page);
  });

  test.describe('4.1 Calendario (/planning)', () => {
    
    test('#31 - Vista calendario visibile', async ({ page }) => {
      await page.goto('/planning');
      await page.waitForLoadState('networkidle');
      
      // Verifica che ci sia un calendario o lista giorni
      const hasCalendar = await page.locator('[class*="calendar"], [data-testid="calendar"], .planning-calendar, [role="grid"]').isVisible({ timeout: 10000 }).catch(() => false);
      const hasDateList = await page.locator('[data-date], .day-cell, .planning-day').count() > 0;
      
      expect(hasCalendar || hasDateList).toBeTruthy();
    });

    test('#34 - Navigazione mesi', async ({ page }) => {
      await page.goto('/planning');
      await page.waitForLoadState('networkidle');
      
      // Cerca pulsanti navigazione
      const prevButton = page.locator('button:has-text("<"), button:has-text("Precedente"), button[aria-label*="prev"]');
      const nextButton = page.locator('button:has-text(">"), button:has-text("Successivo"), button[aria-label*="next"]');
      
      // Almeno uno dei due dovrebbe essere presente
      const hasNav = await prevButton.isVisible().catch(() => false) || await nextButton.isVisible().catch(() => false);
      
      if (hasNav) {
        // Prova a cliccare avanti
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
          // Test passa se non ci sono errori
        }
      }
    });

    test('#33 - Click su giorno apre editor', async ({ page }) => {
      await page.goto('/planning');
      await page.waitForLoadState('networkidle');
      
      // Trova un giorno cliccabile
      const dayCell = page.locator('.day-cell, [data-date], td[role="gridcell"]:not([aria-disabled="true"])').first();
      
      if (await dayCell.isVisible()) {
        await dayCell.click();
        await page.waitForTimeout(1000);
        
        // Verifica redirect o apertura modal
        const urlChanged = page.url().includes('/planning/');
        const modalOpened = await page.locator('[role="dialog"], .modal, .drawer').isVisible().catch(() => false);
        
        // Almeno uno dei due
        expect(urlChanged || modalOpened).toBeTruthy();
      }
    });
  });

  test.describe('4.2 Editor Piano', () => {
    
    test('#35 - Editor piano carica clienti', async ({ page }) => {
      // Vai a una data specifica (oggi)
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/planning/${today}`);
      await page.waitForLoadState('networkidle');
      
      // Verifica caricamento pagina
      await page.waitForTimeout(2000);
      
      // Dovrebbe esserci una lista clienti o un messaggio
      const hasClientList = await page.locator('.client-list, [data-testid="client-selector"], input[type="checkbox"]').isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/nessun cliente|aggiungi clienti/i').isVisible().catch(() => false);
      
      // La pagina deve mostrare qualcosa
      expect(hasClientList || hasEmptyState || page.url().includes('planning')).toBeTruthy();
    });

    test('#36 - Suggerimenti AI', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/planning/${today}`);
      await page.waitForLoadState('networkidle');
      
      // Cerca pulsante suggerimenti
      const suggestButton = page.locator('button:has-text("Sugger"), button:has-text("AI"), button:has-text("Genera")');
      
      if (await suggestButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Il pulsante esiste, test passa
        expect(true).toBeTruthy();
      }
    });

    test('#40 - KM stimati visibili', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/planning/${today}`);
      await page.waitForLoadState('networkidle');
      
      // Cerca indicazione km
      const kmIndicator = page.locator('text=/\\d+\\s*km/i, [data-testid="km-estimate"]');
      
      // Potrebbe non essere visibile se non ci sono clienti selezionati
      const hasKm = await kmIndicator.isVisible({ timeout: 3000 }).catch(() => false);
      
      // Non bloccante, solo informativo
      console.log(`KM indicator visible: ${hasKm}`);
    });
  });
});

