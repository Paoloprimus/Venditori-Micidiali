const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

/**
 * Script per arricchire un CSV con indirizzi partendo da coordinate GPS.
 * Usa OpenStreetMap (Nominatim) - Gratuito.
 * 
 * ISTRUZIONI:
 * 1. Assicurati che il file "risultato_completo.csv" sia sul Desktop.
 * 2. Esegui: node scripts/reverse-geocode.js
 */

// Percorsi file (Desktop dell'utente)
const inputPath = '/Users/paolo.olivato/Desktop/veronabarcaffe.csv';
const outputPath = '/Users/paolo.olivato/Desktop/vernabarcaffe_con_indirizzi.csv';

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'REPING-CSV-Tool/1.0'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const addr = data.address || {};

    return {
      indirizzo_stradale: addr.road || addr.pedestrian || addr.highway || '',
      comune: addr.city || addr.town || addr.village || addr.municipality || '',
      provincia: addr.county || '',
      cap: addr.postcode || ''
    };
  } catch (error) {
    console.error(`  ❌ Errore per ${lat}, ${lon}:`, error.message);
    return { indirizzo_stradale: '', comune: '', provincia: '', cap: '' };
  }
}

async function run() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Errore: Il file non esiste in ${inputPath}`);
    console.log(`Ho cercato qui: ${inputPath}`);
    return;
  }

  console.log('📖 Lettura file CSV...');
  const fileContent = fs.readFileSync(inputPath, 'utf-8');
  
  try {
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true // Gestisce eventuali Byte Order Mark di Excel
    });

    console.log(`🚀 Trovate ${records.length} righe da processare.\n`);

    const results = [];
    
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      // Prova diversi nomi comuni per lat/lon
      const lat = row.lat || row.latitude || row.Latitude || row.LAT;
      const lon = row.lon || row.longitude || row.Longitude || row.LON || row.lng;

      process.stdout.write(`[${i + 1}/${records.length}] Elaborazione ${lat}, ${lon}... `);

      if (lat && lon) {
        const geoInfo = await reverseGeocode(lat, lon);
        results.push({ ...row, ...geoInfo });
        console.log('✅');
      } else {
        results.push({ ...row, indirizzo_stradale: '', comune: '', provincia: '', cap: '' });
        console.log('⚠️ Coordinate mancanti');
      }

      // Rispetta il limite di 1 richiesta al secondo di Nominatim
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    // Scrittura CSV finale
    console.log(`\n💾 Salvataggio in corso...`);
    
    if (results.length > 0) {
      const headers = Object.keys(results[0]);
      const csvContent = [
        headers.join(','),
        ...results.map(row => headers.map(h => {
          const val = String(row[h] || '').replace(/"/g, '""');
          return `"${val}"`;
        }).join(','))
      ].join('\n');

      fs.writeFileSync(outputPath, csvContent);
      console.log(`✨ Completato! Il file è stato salvato in:\n   ${outputPath}`);
    }

  } catch (error) {
    console.error('❌ Errore durante il parsing del CSV:', error.message);
  }
}

run();
