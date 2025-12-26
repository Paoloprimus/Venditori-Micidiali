#!/usr/bin/env node

/**
 * Script per popolare la tabella places con i dati HoReCa di Verona
 * 
 * Legge: veronahoreca-final.csv
 * Inserisce in: Supabase table `places`
 * 
 * Uso: npx tsx scripts/populate-places.js [--force]
 *      --force: svuota la tabella prima di inserire
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FORCE_MODE = process.argv.includes('--force');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Errore: Variabili SUPABASE non trovate in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Arrotonda coordinate a 8 decimali (limite DB: DECIMAL(10,8) e DECIMAL(11,8))
function roundCoord(value, decimals = 8) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// Tronca stringa a max caratteri
function truncate(str, max) {
  if (!str) return null;
  return str.length > max ? str.substring(0, max) : str;
}

// Pulisce campi corrotti (es. ID OSM finiti in campi sbagliati)
function cleanField(value, type) {
  if (!value) return null;
  
  // Ignora valori che sembrano ID OSM (numeri lunghi > 8 cifre)
  if (/^\d{8,}$/.test(value)) return null;
  
  // Ignora valori che sono tipi OSM
  if (['node', 'way', 'relation'].includes(value.toLowerCase())) return null;
  
  // Ignora valori che sono sottotipi OSM
  if (['coffee_shop', 'ice_cream', 'fast_food'].includes(value.toLowerCase())) return null;
  
  // Per telefoni: deve iniziare con + o numero e contenere solo cifre/spazi
  if (type === 'phone') {
    if (!/^[+\d\s\-()]+$/.test(value)) return null;
    if (value.length < 5) return null; // Troppo corto
  }
  
  // Per website: deve sembrare un URL o essere null
  if (type === 'website') {
    if (!value.startsWith('http') && !value.includes('.')) return null;
  }
  
  // Per email: deve contenere @
  if (type === 'email') {
    if (!value.includes('@')) return null;
  }
  
  return value;
}

// Valida CAP italiano (5 cifre, inizia con 3 per Veneto)
function cleanCAP(value) {
  if (!value) return null;
  const clean = value.trim();
  if (!/^\d{5}$/.test(clean)) return null;
  return clean;
}

// Valida provincia italiana (2 lettere)
function cleanProvincia(value) {
  if (!value) return 'VR';
  const clean = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) return 'VR';
  return clean;
}

// Valida coordinate per Nord Italia
function validateCoords(lat, lon) {
  // Verona: lat ~45.4, lon ~10.9
  // Accetta coordinate nel range Nord Italia
  const validLat = lat >= 44.0 && lat <= 47.5;
  const validLon = lon >= 9.0 && lon <= 14.0;
  return validLat && validLon;
}

async function main() {
  console.log('🚀 POPOLAMENTO DATABASE PLACES\n');
  if (FORCE_MODE) console.log('⚠️  MODALITÀ FORCE: la tabella verrà svuotata\n');

  // 1. Leggi CSV
  console.log('📂 Lettura veronahoreca-final.csv...');
  const csvPath = join(process.cwd(), 'veronahoreca-final.csv');
  const csvContent = readFileSync(csvPath, 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`✅ Trovati ${records.length} record nel CSV\n`);

  // 2. Trasforma records in formato DB (con pulizia dati corrotti)
  console.log('🔄 Trasformazione dati...');
  let skipped = 0;
  
  const places = records.map((record) => {
    const lat = roundCoord(parseFloat(record.lat));
    const lon = roundCoord(parseFloat(record.lon));
    
    return {
      nome: truncate(record.nome, 255) || 'Unnamed',
      tipo: truncate(record.tipo, 50) || null,
      indirizzo_stradale: truncate(record.indirizzo_stradale, 255) || null,
      comune: truncate(record.comune, 100) || null,
      provincia: cleanProvincia(record.provincia),
      cap: cleanCAP(record.cap),
      lat,
      lon,
      telefono: cleanField(truncate(record.telefono, 50), 'phone'),
      website: cleanField(truncate(record.website, 255), 'website'),
      email: cleanField(truncate(record.email, 255), 'email'),
      opening_hours: cleanField(truncate(record.opening_hours, 255), 'hours'),
      source: truncate(record.source, 50) || 'osm',
      verified: false,
      flag_count: 0,
    };
  });

  // Filtra record con coordinate valide per Nord Italia
  const validPlaces = places.filter((p) => {
    const hasValidCoords = !isNaN(p.lat) && !isNaN(p.lon) && validateCoords(p.lat, p.lon);
    if (!hasValidCoords) skipped++;
    return hasValidCoords;
  });

  console.log(`✅ ${validPlaces.length} record validi`);
  if (skipped > 0) console.log(`⚠️  ${skipped} record scartati (coordinate invalide)\n`);
  else console.log('');

  // 3. Controlla se tabella esiste e quanti record ci sono
  const { count: existingCount, error: countError } = await supabase
    .from('places')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Errore nel contare record esistenti:', countError);
    console.log('⚠️  Probabilmente la tabella non esiste. Esegui prima la migration:');
    console.log('   npx supabase migration up\n');
    process.exit(1);
  }

  console.log(`📊 Record esistenti in places: ${existingCount || 0}\n`);

  if (existingCount && existingCount > 0) {
    if (FORCE_MODE) {
      console.log('🗑️  Svuotamento tabella...');
      const { error: deleteError } = await supabase
        .from('places')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) {
        console.error('❌ Errore svuotamento:', deleteError.message);
        process.exit(1);
      }
      console.log('✅ Tabella svuotata\n');
    } else {
      console.log('⚠️  La tabella contiene già dati.');
      console.log('   Usa --force per svuotare e ricaricare\n');
      console.log('   npx tsx scripts/populate-places.js --force\n');
      process.exit(0);
    }
  }

  // 4. Inserisci a batch (200 alla volta per performance)
  console.log('💾 Inserimento dati in Supabase...\n');
  const batchSize = 200;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < validPlaces.length; i += batchSize) {
    const batch = validPlaces.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('places')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`❌ Errore batch ${i / batchSize + 1}:`, error.message);
      errors += batch.length;
    } else {
      inserted += data?.length || 0;
      const progress = Math.round(((i + batch.length) / validPlaces.length) * 100);
      console.log(`   ✅ Batch ${i / batchSize + 1}: +${data?.length || 0} (${progress}%)`);
    }
  }

  console.log(`\n🎉 COMPLETATO!`);
  console.log(`   ✅ Inseriti: ${inserted} POI`);
  console.log(`   ❌ Errori: ${errors}`);

  // 5. Verifica finale
  const { count: finalCount } = await supabase
    .from('places')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 VERIFICA FINALE:`);
  console.log(`   Totale POI nel database: ${finalCount || 0}`);

  // 6. Statistiche per tipo
  const { data: statsData } = await supabase
    .from('places')
    .select('tipo')
    .not('tipo', 'is', null);

  if (statsData) {
    const typeCount = statsData.reduce((acc, { tipo }) => {
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n📈 STATISTICHE PER TIPO:`);
    Object.entries(typeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([tipo, count]) => {
        console.log(`   ${tipo}: ${count}`);
      });
  }

  console.log(`\n✨ Script completato!`);
}

main().catch((error) => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});

