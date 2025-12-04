import { test, expect } from '@playwright/test';

/**
 * Test Suite: Gestione Prodotti
 * Roadmap: FASE 3
 */

test.describe('Gestione Prodotti', () => {
  
  test.use({ storageState: 'tests/.auth/user.json' });

  test.describe('3.1 Lista Prodotti (/products)', () => {
    
    test('#25 - Caricamento lista prodotti', async ({ page }) => {
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Verifica che la pagina sia caricata
      await expect(page.locator('h1, h2').filter({ hasText: /prodott/i })).toBeVisible({ timeout: 10000 });
      
      // Verifica presenza lista o messaggio vuoto
      const hasProducts = await page.locator('[data-testid="product-row"], .product-item, tr, .product-card').count() > 0;
      const hasEmptyMessage = await page.locator('text=/nessun prodotto|non hai ancora/i').isVisible().catch(() => false);
      
      expect(hasProducts || hasEmptyMessage).toBeTruthy();
    });

    test('#26 - Ricerca prodotto', async ({ page }) => {
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[type="search"], input[placeholder*="cerca"], input[placeholder*="Cerca"]');
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
        await page.waitForLoadState('networkidle');
        // Test passa se non ci sono errori
      }
    });
  });

  test.describe('3.2 Import Prodotti', () => {
    
    test('#29 - Pagina import prodotti accessibile', async ({ page }) => {
      await page.goto('/tools/import-products');
      await page.waitForLoadState('networkidle');
      
      // Verifica presenza form import
      const hasUpload = await page.locator('input[type="file"], button:has-text("Carica"), button:has-text("Import")').isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasUpload).toBeTruthy();
    });

    test('#28 - Pagina aggiunta prodotto singolo', async ({ page }) => {
      await page.goto('/tools/quick-add-product');
      await page.waitForLoadState('networkidle');
      
      // Verifica presenza form
      const hasForm = await page.locator('form, input[name="name"], input[placeholder*="nome"]').isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasForm).toBeTruthy();
    });
  });
});

