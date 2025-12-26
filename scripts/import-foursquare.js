const fs = require('fs');
const path = require('path');

/**
 * IMPORT DA FOURSQUARE PLACES API
 * 
 * API gratuita: 99.000 chiamate/mese
 * https://location.foursquare.com/places/
 * 
 * Setup:
 * 1. Vai su https://location.foursquare.com/developer/
 * 2. Registrati gratuitamente
 * 3. Crea un nuovo progetto
 * 4. Copia l'API Key
 * 5. Aggiungi in .env.local:
 *    FOURSQUARE_API_KEY=your_key_here
 */

const outputDir = path.join(__dirname, '..', 'data-sources');
const outputFile = path.join(outputDir, 'foursquare-verona-horeca.csv');

// Carica API key
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const API_KEY = process.env.FOURSQUARE_API_KEY;

if (!API_KEY) {
  console.error('\n❌ Manca FOURSQUARE_API_KEY nel file .env.local');
  console.log('\n📝 Come ottenere la API Key GRATUITA:');
  console.log('1. Vai su https://location.foursquare.com/developer/');
  console.log('2. Clicca "Sign Up" (o "Log In" se hai già un account)');
  console.log('3. Crea un nuovo progetto');
  console.log('4. Copia la API Key (inizia con "fsq_")');
  console.log('5. Aggiungila al file .env.local:');
  console.log('   FOURSQUARE_API_KEY=fsq_TuaKeyQui\n');
  console.log('📊 Piano gratuito: 99.000 chiamate/mese (~3.300 al giorno)\n');
  process.exit(1);
}

if (!API_KEY.startsWith('fsq_')) {
  console.error('\n⚠️  Attenzione: la API Key dovrebbe iniziare con "fsq_"');
  console.error('Verifica di aver copiato la key corretta da https://location.foursquare.com/developer/\n');
}

// Configurazione ricerca
const SEARCH_CONFIG = {
  // Griglia di ricerca per coprire tutta la provincia (raggio API: 100km max)
  searchPoints: [
    { lat: 45.4384, lon: 10.9916, name: 'Verona centro' },
    { lat: 45.5500, lon: 10.8500, name: 'Nord-Ovest (Bussolengo, Peschiera)' },
    { lat: 45.3500, lon: 11.1500, name: 'Est (Soave, San Bonifacio)' },
    { lat: 45.5500, lon: 11.2000, name: 'Nord-Est (Illasi, Tregnago)' },
  ],
  radius: 15000, // 15km per punto (con overlap)
  categories: [
    13065, // Restaurant
    13003, // Bar
    13034, // Cafe
    13145, // Pizzeria
    13064, // Pub
    13032, // Bakery
  ],
  limit: 50 // Risultati per chiamata
};

async function searchPlaces(lat, lon, categoryId, offset = 0) {
  // V3 API endpoint (richiede API key nell'header)
  const baseUrl = 'https://api.foursquare.com/v3/places/search';
  
  const params = new URLSearchParams({
    ll: `${lat},${lon}`,
    radius: SEARCH_CONFIG.radius,
    categories: categoryId,
    limit: SEARCH_CONFIG.limit,
    offset: offset,
    fields: 'fsq_id,name,location,categories,tel,website,rating'
  });

  try {
    const response = await fetch(`${baseUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': API_KEY, // API key senza prefisso "Bearer"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Debug per capire il problema
      if (response.status === 401) {
        console.error('\n❌ Errore 401: API Key non valida');
        console.error('Verifica che:');
        console.error('1. La key inizi con "fsq_"');
        console.error('2. Sia copiata correttamente (senza spazi)');
        console.error('3. Sia stata creata su https://location.foursquare.com/developer/\n');
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`❌ Errore API Foursquare: ${error.message}`);
    return [];
  }
}

function normalizePlace(place) {
  const location = place.location || {};
  const category = place.categories?.[0] || {};

  return {
    nome: place.name || '',
    tipo: category.name || 'restaurant',
    indirizzo_stradale: location.address || '',
    comune: location.locality || location.region || 'Verona',
    provincia: 'VR',
    cap: location.postcode || '',
    lat: location.geocodes?.main?.latitude || '',
    lon: location.geocodes?.main?.longitude || '',
    tel: place.tel || '',
    website: place.website || '',
    rating: place.rating || '',
    foursquare_id: place.fsq_id || '',
    source: 'foursquare'
  };
}

function writeCSV(records, filePath) {
  if (records.length === 0) {
    console.log('⚠️  Nessun record da salvare');
    return;
  }

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
  console.log('🚀 Import dati HoReCa da FOURSQUARE PLACES API\n');

  if (!API_KEY) {
    console.error('❌ FOURSQUARE_API_KEY non trovata in .env.local');
    console.log('\n📌 Setup richiesto:');
    console.log('1. Vai su https://location.foursquare.com/developer/');
    console.log('2. Registrati gratuitamente (99.000 chiamate/mese gratis)');
    console.log('3. Crea un nuovo progetto');
    console.log('4. Copia la API Key');
    console.log('5. Aggiungi in .env.local:');
    console.log('   FOURSQUARE_API_KEY=fsq_your_key_here\n');
    return;
  }

  console.log(`📍 Punti ricerca: ${SEARCH_CONFIG.searchPoints.length}`);
  console.log(`🔍 Categorie: Restaurant, Bar, Cafe, Pizzeria, Pub, Bakery`);
  console.log(`📏 Raggio per punto: ${SEARCH_CONFIG.radius/1000}km\n`);

  const allPlaces = [];
  const seenIds = new Set();
  let totalCalls = 0;

  for (const point of SEARCH_CONFIG.searchPoints) {
    console.log(`\n📍 Area: ${point.name} (${point.lat}, ${point.lon})`);

    for (const categoryId of SEARCH_CONFIG.categories) {
      const results = await searchPlaces(point.lat, point.lon, categoryId);
      totalCalls++;

      results.forEach(place => {
        if (!seenIds.has(place.fsq_id)) {
          seenIds.add(place.fsq_id);
          allPlaces.push(place);
        }
      });

      console.log(`   Categoria ${categoryId}: +${results.length} (totale unici: ${allPlaces.length})`);

      // Rate limiting: max 100 chiamate/sec (siamo molto sotto)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n✅ Trovati ${allPlaces.length} luoghi unici`);
  console.log(`📞 Chiamate API usate: ${totalCalls} di 99.000/mese`);

  const normalized = allPlaces
    .map(normalizePlace)
    .filter(r => r.nome && r.lat && r.lon);

  // Statistiche
  const comuni = {};
  const tipi = {};
  
  normalized.forEach(r => {
    comuni[r.comune] = (comuni[r.comune] || 0) + 1;
    tipi[r.tipo] = (tipi[r.tipo] || 0) + 1;
  });

  console.log('\n📈 Statistiche per tipo:');
  Object.entries(tipi)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tipo, count]) => {
      console.log(`   ${tipo}: ${count}`);
    });

  console.log('\n🏙️  Top 5 comuni:');
  Object.entries(comuni)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([comune, count]) => {
      console.log(`   ${comune}: ${count}`);
    });

  writeCSV(normalized, outputFile);
  
  console.log('\n✨ Import completato!');
  console.log(`📁 File: ${outputFile}`);
}

run();

