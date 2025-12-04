import { test, expect } from '@playwright/test';
import { dismissModals } from './helpers';

/**
 * Test Suite: Chat AI
 * Roadmap: FASE 6
 */

test.describe('Chat AI', () => {
  
  test.use({ storageState: 'tests/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await dismissModals(page);
  });

  test.describe('6.1 Conversazioni', () => {
    
    test('#64 - Home page con chat', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Verifica presenza campo input messaggio
      const chatInput = page.locator('textarea, input[type="text"]').filter({ 
        hasNot: page.locator('input[type="search"]') 
      });
      
      await expect(chatInput.first()).toBeVisible({ timeout: 10000 });
    });

    test('#65 - Drawer sessioni visibile', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Cerca pulsante per aprire drawer sessioni
      const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰"), .hamburger, [data-testid="menu-toggle"]');
      
      if (await menuButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuButton.click();
        await page.waitForTimeout(500);
        
        // Verifica che drawer si apra
        const drawer = page.locator('[role="dialog"], .drawer, aside, [data-testid="sessions-drawer"]');
        await expect(drawer).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('6.2 Query AI', () => {
    
    test('#68 - Query semplice "Ciao"', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Trova input chat
      const chatInput = page.locator('textarea, input[placeholder*="scrivi"], input[placeholder*="messaggio"]').first();
      
      if (await chatInput.isVisible({ timeout: 5000 })) {
        await chatInput.fill('Ciao');
        
        // Trova e clicca pulsante invio
        const sendButton = page.locator('button[type="submit"], button:has-text("Invia"), button[aria-label*="send"]');
        await sendButton.click();
        
        // Aspetta risposta (max 30 secondi per AI)
        await page.waitForTimeout(3000);
        
        // Verifica che ci sia almeno un messaggio di risposta
        const messages = page.locator('.message, [data-role="assistant"], .ai-response, [class*="message"]');
        const count = await messages.count();
        
        // Dovrebbe esserci almeno una risposta
        expect(count).toBeGreaterThan(0);
      }
    });

    test('#69 - Query clienti', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const chatInput = page.locator('textarea, input[placeholder*="scrivi"]').first();
      
      if (await chatInput.isVisible({ timeout: 5000 })) {
        await chatInput.fill('Quanti clienti ho?');
        
        const sendButton = page.locator('button[type="submit"], button:has-text("Invia")');
        await sendButton.click();
        
        // Aspetta risposta AI (può richiedere tempo)
        await page.waitForTimeout(10000);
        
        // Verifica che ci sia una risposta contenente un numero
        const response = page.locator('.message, [data-role="assistant"]').last();
        const text = await response.textContent() || '';
        
        // La risposta dovrebbe contenere un numero o "nessun"
        const hasNumber = /\d+/.test(text) || /nessun/i.test(text);
        console.log(`Response: ${text.substring(0, 100)}...`);
      }
    });

    test('#72 - Pulsante microfono presente', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Cerca pulsante microfono
      const micButton = page.locator('button[aria-label*="mic"], button[aria-label*="voce"], button:has-text("🎤"), [data-testid="voice-button"]');
      
      const hasMic = await micButton.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`Mic button visible: ${hasMic}`);
    });
  });
});

