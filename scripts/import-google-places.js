const fs = require('fs');
const path = require('path');

/**
 * IMPORT DA GOOGLE PLACES API
 * 
 * Usa Google Places API (Nearby Search) per trovare HoReCa a Verona
 * 
 * Setup:
 * 1. Vai su https://console.cloud.google.com/
 * 2. Abilita "Places API"
 * 3. Crea API Key
 * 4. Aggiungi la key in .env.local:
 *    GOOGLE_PLACES_API_KEY=your_key_here
 * 
 * Free tier: $200/mese (~40.000 richieste)
 */

const outputDir = path.join(__dirname, '..', 'data-sources');
const outputFile = path.join(outputDir, 'google-places-verona-horeca.csv');

// Carica API key da environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Centro Verona + raggio 25km copre tutta la provincia
const SEARCH_CONFIG = {
  location: { lat: 45.4384, lng: 10.9916 }, // Centro Verona
  radius: 25000, // 25km
  types: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway']
};

async function searchNearby(type, pageToken = null) {
  const baseUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  
  const params = new URLSearchParams({
    location: `${SEARCH_CONFIG.location.lat},${SEARCH_CONFIG.location.lng}`,
    radius: SEARCH_CONFIG.radius,
    type: type,
    key: API_KEY
  });

  if (pageToken) {
    params.set('pagetoken', pageToken);
  }

  try {
    const response = await fetch(`${baseUrl}?${params}`);
    const data = await response.json();

    if (data.status === 'REQUEST_DENIED') {
      throw new Error(`API Key invalida o Places API non abilitata: ${data.error_message}`);
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn(`⚠️  Status: ${data.status}`);
    }

    return {
      results: data.results || [],
      nextPageToken: data.next_page_token
    };
  } catch (error) {
    console.error(`❌ Errore API Google Places: ${error.message}`);
    return { results: [], nextPageToken: null };
  }
}

async function getPlaceDetails(placeId) {
  const baseUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
  
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_address,formatted_phone_number,website,geometry',
    key: API_KEY
  });

  try {
    const response = await fetch(`${baseUrl}?${params}`);
    const data = await response.json();
    return data.result || null;
  } catch (error) {
    return null;
  }
}

function normalizeResult(place) {
  // Estrai comune dall'indirizzo
  const addressParts = (place.vicinity || place.formatted_address || '').split(',');
  let comune = 'Verona';
  if (addressParts.length >= 2) {
    // Ultimo elemento prima del CAP è di solito la città
    const cityPart = addressParts[addressParts.length - 2]?.trim() || '';
    if (cityPart && cityPart.length < 30) {
      comune = cityPart.replace(/\d{5}/, '').trim(); // Rimuovi CAP
    }
  }

  return {
    nome: place.name || '',
    tipo: place.types?.[0] || 'restaurant',
    indirizzo_stradale: place.vicinity || place.formatted_address || '',
    comune: comune,
    provincia: 'VR',
    cap: '',
    lat: place.geometry?.location?.lat || '',
    lon: place.geometry?.location?.lng || '',
    rating: place.rating || '',
    user_ratings_total: place.user_ratings_total || '',
    website: place.website || '',
    phone: place.formatted_phone_number || '',
    google_place_id: place.place_id || '',
    source: 'google-places'
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
  console.log('🚀 Import dati HoReCa da GOOGLE PLACES API\n');

  if (!API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY non trovata in .env.local');
    console.log('\n📌 Setup richiesto:');
    console.log('1. Vai su https://console.cloud.google.com/');
    console.log('2. Abilita "Places API"');
    console.log('3. Crea una API Key');
    console.log('4. Aggiungi in .env.local:');
    console.log('   GOOGLE_PLACES_API_KEY=your_key_here\n');
    return;
  }

  console.log(`📍 Area: Centro Verona + ${SEARCH_CONFIG.radius/1000}km raggio`);
  console.log(`🔍 Tipi: ${SEARCH_CONFIG.types.join(', ')}\n`);

  const allPlaces = [];
  const seenIds = new Set();

  for (const type of SEARCH_CONFIG.types) {
    console.log(`\n🔎 Ricerca tipo: ${type}...`);
    
    let pageToken = null;
    let pageCount = 0;

    do {
      if (pageToken) {
        // Google richiede attesa di 2 secondi tra richieste con pageToken
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const { results, nextPageToken } = await searchNearby(type, pageToken);
      
      results.forEach(place => {
        if (!seenIds.has(place.place_id)) {
          seenIds.add(place.place_id);
          allPlaces.push(place);
        }
      });

      pageCount++;
      console.log(`   Pagina ${pageCount}: +${results.length} luoghi (totale unici: ${allPlaces.length})`);

      pageToken = nextPageToken;

    } while (pageToken && pageCount < 3); // Max 3 pagine per tipo (60 risultati)
  }

  console.log(`\n✅ Trovati ${allPlaces.length} luoghi unici`);

  const normalized = allPlaces.map(normalizeResult).filter(r => r.nome && r.lat && r.lon);
  
  // Statistiche
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
  console.log(`📊 Costo stimato: ~$${(allPlaces.length * 0.017).toFixed(2)} (Nearby Search)`);
}

run();

