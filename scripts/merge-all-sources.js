const fs = require('fs');
const path = require('path');

/**
 * MERGE INTELLIGENTE DI TUTTE LE FONTI HORECA
 * 
 * Unisce:
 * 1. veronahoreca.csv (dati originali)
 * 2. osm-verona-horeca.csv (OpenStreetMap)
 * 3. wikidata-verona-horeca.csv (Wikidata)
 * 
 * Deduplicazione:
 * - Stesse coordinate entro 50m = stesso locale
 * - Nome molto simile + stesso comune = stesso locale
 * 
 * Merge campi:
 * - Priorità: originali > OSM > Wikidata
 * - Prende il valore più completo per ogni campo
 */

const dataDir = path.join(__dirname, '..');
const sourcesDir = path.join(__dirname, '..', 'data-sources');
const outputFile = path.join(dataDir, 'veronahoreca-final.csv');

// File sorgenti (percorsi assoluti per evitare problemi)
const SOURCES = [
  { file: path.join(dataDir, 'veronahoreca.csv'), priority: 1, name: 'Originali' },
  { file: path.join(sourcesDir, 'osm-verona-horeca.csv'), priority: 2, name: 'OpenStreetMap' },
  { file: path.join(sourcesDir, 'wikidata-verona-horeca.csv'), priority: 3, name: 'Wikidata' },
];

// Calcola distanza tra due coordinate (in metri)
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Raggio Terra in metri
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Normalizza nome per confronto
function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
    .replace(/[^a-z0-9]/g, '') // Solo alfanumerici
    .trim();
}

// Similarità tra due nomi (0-1)
function nameSimilarity(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (n1 === n2) return 1;
  if (!n1 || !n2) return 0;
  
  // Levenshtein distance semplificata
  const longer = n1.length > n2.length ? n1 : n2;
  const shorter = n1.length > n2.length ? n2 : n1;
  
  if (longer.includes(shorter)) return 0.8;
  
  // Conta caratteri in comune
  const common = shorter.split('').filter(c => longer.includes(c)).length;
  return common / longer.length;
}

// Verifica se due record sono duplicati
function isDuplicate(rec1, rec2, threshold = 50) {
  // 1. Distanza geografica < 50m
  const dist = distanceMeters(rec1.lat, rec1.lon, rec2.lat, rec2.lon);
  if (dist < threshold) return true;
  
  // 2. Nome simile + stesso comune
  if (rec1.comune && rec2.comune) {
    const sameCity = normalizeName(rec1.comune) === normalizeName(rec2.comune);
    const similarName = nameSimilarity(rec1.nome, rec2.nome) > 0.85;
    if (sameCity && similarName) return true;
  }
  
  return false;
}

// Merge di due record (prende i valori migliori)
function mergeRecords(existing, newRec) {
  const merged = { ...existing };
  
  // Per ogni campo, prende il valore più completo
  Object.keys(newRec).forEach(key => {
    const existingVal = String(existing[key] || '').trim();
    const newVal = String(newRec[key] || '').trim();
    
    // Priorità al valore più lungo/completo
    if (!existingVal && newVal) {
      merged[key] = newVal;
    } else if (newVal && newVal.length > existingVal.length) {
      // Aggiorna solo se il nuovo è più completo
      if (key === 'telefono' || key === 'website' || key === 'email') {
        merged[key] = newVal;
      }
    }
  });
  
  return merged;
}

// Legge un CSV e lo converte in array di oggetti
function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File non trovato: ${filePath}`);
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
    const record = {};
    
    headers.forEach((header, idx) => {
      record[header] = (values[idx] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"');
    });
    
    // Converte lat/lon in numeri
    record.lat = parseFloat(record.lat) || 0;
    record.lon = parseFloat(record.lon) || 0;
    
    if (record.lat && record.lon) {
      records.push(record);
    }
  }
  
  return records;
}

// Normalizza i campi di un record
function normalizeRecord(record, source) {
  return {
    nome: record.nome || record.name || 'Senza nome',
    tipo: record.tipo || record.type || 'altro',
    indirizzo_stradale: record.indirizzo_stradale || record.indirizzo || '',
    comune: record.comune || record.city || '',
    provincia: record.provincia || 'VR',
    cap: record.cap || record.postcode || '',
    lat: record.lat,
    lon: record.lon,
    telefono: record.telefono || record.tel || record.phone || '',
    website: record.website || '',
    email: record.email || '',
    source: source,
  };
}

async function main() {
  console.log('🚀 MERGE INTELLIGENTE DI TUTTE LE FONTI HORECA\n');
  
  const allRecords = [];
  const sourceStats = {};
  
  // Carica tutti i file
  for (const source of SOURCES) {
    console.log(`📂 Caricamento: ${source.name} (${source.file})...`);
    const records = readCSV(source.file);
    
    if (records.length > 0) {
      const normalized = records.map(r => normalizeRecord(r, source.name));
      allRecords.push(...normalized);
      sourceStats[source.name] = records.length;
      console.log(`   ✅ ${records.length} record caricati\n`);
    } else {
      console.log(`   ⚠️  Nessun record trovato\n`);
    }
  }
  
  console.log(`📊 Totale record caricati: ${allRecords.length}\n`);
  console.log('🔄 Deduplicazione in corso...\n');
  
  // Deduplicazione
  const unique = [];
  const duplicates = [];
  
  for (const record of allRecords) {
    let found = false;
    
    for (let i = 0; i < unique.length; i++) {
      if (isDuplicate(unique[i], record)) {
        // Merge con il record esistente
        unique[i] = mergeRecords(unique[i], record);
        duplicates.push(record);
        found = true;
        break;
      }
    }
    
    if (!found) {
      unique.push(record);
    }
  }
  
  console.log(`✅ Record unici: ${unique.length}`);
  console.log(`🔗 Duplicati rimossi: ${duplicates.length}\n`);
  
  // Statistiche finali
  const finalStats = {};
  unique.forEach(r => {
    finalStats[r.tipo] = (finalStats[r.tipo] || 0) + 1;
  });
  
  console.log('📈 Statistiche per tipo:');
  Object.entries(finalStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tipo, count]) => {
      console.log(`   ${tipo.padEnd(15)}: ${count}`);
    });
  console.log(`   ${'TOTALE'.padEnd(15)}: ${unique.length}\n`);
  
  // Statistiche per comune
  const comuniStats = {};
  unique.forEach(r => {
    if (r.comune) {
      comuniStats[r.comune] = (comuniStats[r.comune] || 0) + 1;
    }
  });
  
  console.log('🏙️  Top 10 comuni:');
  Object.entries(comuniStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([comune, count]) => {
      console.log(`   ${comune.padEnd(25)}: ${count}`);
    });
  
  // Salva CSV finale
  const headers = [
    'nome', 'tipo', 'indirizzo_stradale', 'comune', 'provincia', 'cap',
    'lat', 'lon', 'telefono', 'website', 'email', 'source'
  ];
  
  const csvRows = [
    headers.join(','),
    ...unique.map(r => 
      headers.map(h => {
        const val = String(r[h] || '');
        return val.includes(',') || val.includes('"') 
          ? `"${val.replace(/"/g, '""')}"` 
          : val;
      }).join(',')
    )
  ];
  
  fs.writeFileSync(outputFile, csvRows.join('\n'), 'utf-8');
  
  console.log(`\n✨ Merge completato!`);
  console.log(`📁 File finale: ${outputFile}`);
  console.log(`📊 Record totali: ${unique.length}`);
  console.log(`\n🔍 Fonti utilizzate:`);
  Object.entries(sourceStats).forEach(([source, count]) => {
    console.log(`   ${source}: ${count} record`);
  });
  console.log('');
}

main().catch(console.error);


