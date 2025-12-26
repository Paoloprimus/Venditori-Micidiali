const fs = require('fs');
const path = require('path');

/**
 * IMPORT DA WIKIDATA - Query SPARQL per HoReCa Verona
 * 
 * Usa il servizio pubblico SPARQL di Wikidata per trovare:
 * - Ristoranti, bar, hotel, pizzerie a Verona
 * - Con coordinate geografiche
 * 
 * API: https://query.wikidata.org/sparql
 */

const outputDir = path.join(__dirname, '..', 'data-sources');
const outputFile = path.join(outputDir, 'wikidata-verona-horeca.csv');

// Query SPARQL per trovare locali HoReCa a Verona
const SPARQL_QUERY = `
SELECT DISTINCT ?item ?itemLabel ?typeLabel ?address ?coord ?website ?phone WHERE {
  # Cerca ristoranti, bar, hotel, pizzerie
  VALUES ?type { 
    wd:Q11707 # ristorante
    wd:Q30022 # cafe/bar
    wd:Q27686 # hotel
    wd:Q177054 # pizzeria
    wd:Q1228881 # pub
    wd:Q2642629 # gelateria
    wd:Q65968 # pasticceria
  }
  
  ?item wdt:P31 ?type . # istanza di
  
  # Situato a Verona o provincia
  {
    ?item wdt:P131 wd:Q2028 . # Verona città
  } UNION {
    ?item wdt:P131 ?comune .
    ?comune wdt:P131 wd:Q16232 . # Provincia di Verona
  }
  
  # Coordinate obbligatorie
  ?item wdt:P625 ?coord .
  
  # Opzionali
  OPTIONAL { ?item wdt:P6375 ?address . }
  OPTIONAL { ?item wdt:P856 ?website . }
  OPTIONAL { ?item wdt:P1329 ?phone . }
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "it,en". }
}
ORDER BY ?itemLabel
LIMIT 1000
`;

async function fetchWikidata() {
  console.log('🔍 Query Wikidata per HoReCa Verona...\n');
  
  const url = 'https://query.wikidata.org/sparql';
  const params = new URLSearchParams({
    query: SPARQL_QUERY,
    format: 'json'
  });

  try {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'User-Agent': 'REPING-DataImport/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results.bindings;
  } catch (error) {
    console.error('❌ Errore fetching Wikidata:', error.message);
    return [];
  }
}

function parseCoordinates(coordString) {
  // Format: "Point(lon lat)"
  const match = coordString.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
  if (match) {
    return {
      lon: parseFloat(match[1]),
      lat: parseFloat(match[2])
    };
  }
  return null;
}

function normalizeResults(results) {
  return results.map(item => {
    const coords = item.coord ? parseCoordinates(item.coord.value) : null;
    
    return {
      nome: item.itemLabel?.value || '',
      tipo: item.typeLabel?.value || '',
      indirizzo_stradale: item.address?.value || '',
      comune: 'Verona', // Tutti sono in provincia VR
      provincia: 'VR',
      cap: '',
      lat: coords?.lat || '',
      lon: coords?.lon || '',
      website: item.website?.value || '',
      phone: item.phone?.value || '',
      source: 'wikidata',
      wikidata_id: item.item?.value || ''
    };
  }).filter(record => record.lat && record.lon); // Solo con coordinate
}

function writeCSV(records, filePath) {
  if (records.length === 0) {
    console.log('⚠️  Nessun record trovato');
    return;
  }

  // Crea directory se non esiste
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const headers = Object.keys(records[0]);
  const csvContent = [
    headers.join(','),
    ...records.map(row => 
      headers.map(h => {
        const val = String(row[h] || '').replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    )
  ].join('\n');

  fs.writeFileSync(filePath, csvContent, 'utf-8');
  console.log(`\n💾 Salvati ${records.length} record in ${path.basename(filePath)}`);
}

async function run() {
  console.log('🚀 Import dati HoReCa da WIKIDATA\n');
  console.log('Query: Ristoranti, bar, hotel, pizzerie in provincia di Verona');
  console.log('Limite: 1000 risultati\n');

  const results = await fetchWikidata();
  
  if (results.length === 0) {
    console.log('❌ Nessun risultato da Wikidata');
    return;
  }

  console.log(`✅ Ricevuti ${results.length} risultati da Wikidata`);
  
  const normalized = normalizeResults(results);
  console.log(`📊 Normalizzati ${normalized.length} record con coordinate valide`);

  // Statistiche per tipo
  const tipi = {};
  normalized.forEach(r => {
    tipi[r.tipo] = (tipi[r.tipo] || 0) + 1;
  });

  console.log('\n📈 Statistiche per tipo:');
  Object.entries(tipi)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tipo, count]) => {
      console.log(`   ${tipo}: ${count}`);
    });

  writeCSV(normalized, outputFile);
  
  console.log('\n✨ Import completato!');
  console.log(`File salvato: ${outputFile}`);
}

run();

