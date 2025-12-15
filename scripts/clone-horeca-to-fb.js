#!/usr/bin/env node
/**
 * Script per clonare le 27 pagine SEO HoReCa in versione Food & Beverage
 * 
 * Trasformazioni applicate:
 * - HoReCa → Food & Beverage (F&B)
 * - horeca → food-beverage
 * - agenti-horeca-[città] → agenti-food-beverage-[città]
 * - Metadata e contenuti adattati
 */

const fs = require('fs');
const path = require('path');

// Configurazione
const SOURCE_BASE = 'app/site';
const CITIES_PATTERN = /agenti-horeca-([a-z]+)$/;

// Mappature di sostituzione
const REPLACEMENTS = {
  // Testo visibile
  'HoReCa': 'Food & Beverage (F&B)',
  'Horeca': 'Food & Beverage',
  'HORECA': 'FOOD & BEVERAGE',
  
  // URL e path
  'horeca': 'food-beverage',
  'agenti-horeca': 'agenti-food-beverage',
  
  // Metadata specifici
  'Agenti HoReCa': 'Agenti Food & Beverage',
  'agenti horeca': 'agenti food & beverage',
  'Agente HoReCa': 'Agente Food & Beverage',
  'agente horeca': 'agente food & beverage',
  
  // Contesti specifici
  'clienti HoReCa': 'clienti Food & Beverage',
  'per Agenti HoReCa': 'per Agenti Food & Beverage',
  'settore HoReCa': 'settore Food & Beverage',
};

function replaceContent(content) {
  let result = content;
  
  // Applica tutte le sostituzioni in ordine (più specifiche prima)
  for (const [oldText, newText] of Object.entries(REPLACEMENTS)) {
    result = result.split(oldText).join(newText);
  }
  
  return result;
}

function clonePage(sourcePath, targetPath) {
  // Leggi il file sorgente
  const content = fs.readFileSync(sourcePath, 'utf8');
  
  // Applica le sostituzioni
  const newContent = replaceContent(content);
  
  // Crea la directory target se non esiste
  const targetDir = path.dirname(targetPath);
  fs.mkdirSync(targetDir, { recursive: true });
  
  // Scrivi il nuovo file
  fs.writeFileSync(targetPath, newContent, 'utf8');
  
  console.log(`✅ Clonato: ${sourcePath} → ${targetPath}`);
}

function main() {
  console.log('🚀 Inizio clonazione pagine HoReCa → Food & Beverage...\n');
  
  // Trova tutte le directory agenti-horeca-*
  const sitePath = path.join(process.cwd(), SOURCE_BASE);
  const entries = fs.readdirSync(sitePath, { withFileTypes: true });
  
  let clonedCount = 0;
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const match = entry.name.match(CITIES_PATTERN);
    if (!match) continue;
    
    const city = match[1];
    const sourceDirName = entry.name;
    const targetDirName = `agenti-food-beverage-${city}`;
    
    // Path completi
    const sourceDir = path.join(sitePath, sourceDirName);
    const targetDir = path.join(sitePath, targetDirName);
    
    // Clona la struttura
    const pagePath = path.join(sourceDir, 'pianificazione-percorsi', 'page.tsx');
    const targetPagePath = path.join(targetDir, 'pianificazione-percorsi', 'page.tsx');
    
    if (fs.existsSync(pagePath)) {
      clonePage(pagePath, targetPagePath);
      clonedCount++;
    } else {
      console.warn(`⚠️  File non trovato: ${pagePath}`);
    }
  }
  
  console.log(`\n✨ Clonazione completata! ${clonedCount} pagine create.`);
  console.log('\n📝 Prossimo step: git add, commit e push');
}

// Esegui
main();

