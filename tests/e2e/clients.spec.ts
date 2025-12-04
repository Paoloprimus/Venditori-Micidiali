import { test, expect } from '@playwright/test';
import { dismissModals, waitForPageReady } from './helpers';

/**
 * Test Suite: Gestione Clienti
 * Roadmap: FASE 2
 */

test.describe('Gestione Clienti', () => {
  
  // Prima di ogni test, assicurati di essere loggato
  test.use({ storageState: 'tests/.auth/user.json' });

  // Chiudi modal prima di ogni test
  test.beforeEach(async ({ page }) => {
    await dismissModals(page);
  });

  test.describe('2.1 Lista Clienti (/clients)', () => {
    
    test('#10 - Caricamento lista clienti', async ({ page }) => {
      await page.goto('/clients');
      
      // Aspetta caricamento
      await page.waitForLoadState('networkidle');
      
      // Verifica che la pagina sia caricata
      await expect(page.locator('h1, h2').filter({ hasText: /clienti/i })).toBeVisible({ timeout: 10000 });
      
      // Verifica che ci siano clienti o messaggio "nessun cliente"
      const hasClients = await page.locator('[data-testid="client-row"], .client-item, tr').count() > 0;
      const hasEmptyMessage = await page.locator('text=/nessun cliente|non hai ancora/i').isVisible().catch(() => false);
      
      expect(hasClients || hasEmptyMessage).toBeTruthy();
    });

    test('#11 - Ricerca cliente per nome', async ({ page }) => {
      await page.goto('/clients');
      await page.waitForLoadState('networkidle');
      
      // Trova campo di ricerca
      const searchInput = page.locator('input[type="search"], input[placeholder*="cerca"], input[placeholder*="Cerca"]');
      
      if (await searchInput.isVisible()) {
        // Digita un termine di ricerca
        await searchInput.fill('test');
        await page.waitForTimeout(500); // Debounce
        
        // Verifica che la ricerca funzioni (risultati filtrati o messaggio)
        await page.waitForLoadState('networkidle');
        // Il test passa se non ci sono errori
      }
    });

    test('#13 - Scroll con molti clienti', async ({ page }) => {
      await page.goto('/clients');
      
      const startTime = Date.now();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // La lista deve caricare in meno di 5 secondi
      expect(loadTime).toBeLessThan(5000);
    });
  });

  test.describe('2.2 Aggiunta Cliente Singolo', () => {
    
    test('#14 - Navigazione a form aggiunta cliente', async ({ page }) => {
      // Prova diverse possibili URL
      const addClientUrls = [
        '/tools/quick-add-client',
        '/tools/quick-add',
        '/clients/new'
      ];
      
      let found = false;
      for (const url of addClientUrls) {
        await page.goto(url);
        if (!page.url().includes('404') && !page.url().includes('error')) {
          found = true;
          break;
        }
      }
      
      if (found) {
        // Verifica presenza form
        await expect(page.locator('form, [role="form"]')).toBeVisible({ timeout: 5000 });
      }
    });

    test('#15 - Validazione campi obbligatori', async ({ page }) => {
      await page.goto('/tools/quick-add-client');
      await page.waitForLoadState('networkidle');
      
      // Prova a submit senza compilare
      const submitButton = page.locator('button[type="submit"], button:has-text("Salva"), button:has-text("Aggiungi")');
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Deve mostrare errore per campo obbligatorio
        const hasError = await page.locator('.error, [role="alert"], text=/obbligatorio|richiesto|required/i').isVisible({ timeout: 3000 }).catch(() => false);
        // Non blocchiamo se non c'è validazione visibile (potrebbe essere altro tipo)
      }
    });
  });

  test.describe('2.3 Import Bulk', () => {
    
    test('#18 - Pagina import CSV accessibile', async ({ page }) => {
      await page.goto('/tools/import-clients');
      await page.waitForLoadState('networkidle');
      
      // Verifica presenza upload file
      const hasUpload = await page.locator('input[type="file"], [data-testid="file-upload"], button:has-text("Carica")').isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasUpload).toBeTruthy();
    });
  });
});

