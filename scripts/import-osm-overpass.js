const fs = require('fs');
const path = require('path');

/**
 * IMPORT DA OPENSTREETMAP - OVERPASS API
 * 
 * API 100% GRATUITA - NO LIMITI per query ragionevoli
 * https://overpass-api.de/
 * 
 * Scarica tutti i locali HoReCa della provincia di Verona
 * direttamente da OpenStreetMap (database collaborativo)
 */

const outputDir = path.join(__dirname, '..', 'data-sources');
const outputFile = path.join(outputDir, 'osm-verona-horeca.csv');

// Bounding box provincia di Verona [Sud, Ovest, Nord, Est]
const VERONA_BBOX = [45.2, 10.7, 45.7, 11.4];

// Query Overpass per tutti i tipi di locali HoReCa
const OVERPASS_QUERY = `
[out:json][timeout:60];
(
  // Ristoranti
  node["amenity"="restaurant"](${VERONA_BBOX.join(',')});
  way["amenity"="restaurant"](${VERONA_BBOX.join(',')});
  
  // Bar
  node["amenity"="bar"](${VERONA_BBOX.join(',')});
  way["amenity"="bar"](${VERONA_BBOX.join(',')});
  
  // Caffè
  node["amenity"="cafe"](${VERONA_BBOX.join(',')});
  way["amenity"="cafe"](${VERONA_BBOX.join(',')});
  
  // Pub
  node["amenity"="pub"](${VERONA_BBOX.join(',')});
  way["amenity"="pub"](${VERONA_BBOX.join(',')});
  
  // Fast food
  node["amenity"="fast_food"](${VERONA_BBOX.join(',')});
  way["amenity"="fast_food"](${VERONA_BBOX.join(',')});
  
  // Birrerie
  node["amenity"="biergarten"](${VERONA_BBOX.join(',')});
  way["amenity"="biergarten"](${VERONA_BBOX.join(',')});
  
  // Pasticcerie/Bakery
  node["shop"="bakery"](${VERONA_BBOX.join(',')});
  way["shop"="bakery"](${VERONA_BBOX.join(',')});
  
  // Gelaterie
  node["amenity"="ice_crea"](${VERONA_BBOX.join(',')});
  way["amenity"="ice_cream"](${VERONA_BBOX.join(',')});
);
out center tags;
`;

async function fetchOSMData() {
  const url = 'https://overpass-api.de/api/interpreter';
  
  console.log('🌍 Interrogazione OpenStreetMap Overpass API...');
  console.log(`📍 Bounding Box: ${VERONA_BBOX.join(', ')}`);
  console.log('⏳ Attendi 10-30 secondi...\n');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.elements || [];
  } catch (error) {
    console.error('❌ Errore durante il fetch:', error.message);
    return [];
  }
}

function normalizeOSMElement(element) {
  const tags = element.tags || {};
  
  // Determina il tipo
  let tipo = 'altro';
  if (tags.amenity === 'restaurant') tipo = 'ristorante';
  else if (tags.amenity === 'bar') tipo = 'bar';
  else if (tags.amenity === 'cafe') tipo = 'caffè';
  else if (tags.amenity === 'pub') tipo = 'pub';
  else if (tags.amenity === 'fast_food') tipo = 'fast_food';
  else if (tags.amenity === 'biergarten') tipo = 'birreria';
  else if (tags.shop === 'bakery') tipo = 'panetteria';
  else if (tags.amenity === 'ice_cream') tipo = 'gelateria';
  
  // Coordinate (per "way" usa il centroide)
  const lat = element.lat || element.center?.lat;
  const lon = element.lon || element.center?.lon;
  
  // Indirizzo
  const street = tags['addr:street'] || '';
  const housenumber = tags['addr:housenumber'] || '';
  const indirizzo = street && housenumber 
    ? `${street}, ${housenumber}` 
    : street || '';
  
  return {
    nome: tags.name || 'Senza nome',
    tipo: tipo,
    indirizzo_stradale: indirizzo,
    comune: tags['addr:city'] || '',
    provincia: 'VR',
    cap: tags['addr:postcode'] || '',
    lat: lat || 0,
    lon: lon || 0,
    telefono: tags.phone || tags['contact:phone'] || '',
    website: tags.website || tags['contact:website'] || '',
    email: tags.email || tags['contact:email'] || '',
    orari: tags.opening_hours || '',
    cucina: tags.cuisine || '',
    osm_id: element.id || '',
    osm_type: element.type || 'node',
  };
}

async function main() {
  console.log('🚀 IMPORT HORECA DA OPENSTREETMAP\n');
  
  // Crea directory output
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Fetch dati
  const elements = await fetchOSMData();
  
  if (elements.length === 0) {
    console.log('⚠️  Nessun dato ricevuto\n');
    return;
  }
  
  console.log(`✅ Ricevuti ${elements.length} elementi da OSM\n`);
  
  // Normalizza
  const places = elements
    .map(normalizeOSMElement)
    .filter(p => p.lat && p.lon); // Solo con coordinate valide
  
  // Statistiche per tipo
  const stats = {};
  places.forEach(p => {
    stats[p.tipo] = (stats[p.tipo] || 0) + 1;
  });
  
  console.log('📊 Statistiche per tipo:');
  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tipo, count]) => {
      console.log(`   ${tipo.padEnd(15)}: ${count}`);
    });
  console.log(`   ${'TOTALE'.padEnd(15)}: ${places.length}\n`);
  
  // Top comuni
  const comuni = {};
  places.forEach(p => {
    if (p.comune) {
      comuni[p.comune] = (comuni[p.comune] || 0) + 1;
    }
  });
  console.log('🏙️  Top 10 comuni:');
  Object.entries(comuni)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([comune, count]) => {
      console.log(`   ${comune.padEnd(20)}: ${count}`);
    });
  
  // Salva CSV
  const headers = [
    'nome', 'tipo', 'indirizzo_stradale', 'comune', 'provincia', 'cap',
    'lat', 'lon', 'telefono', 'website', 'email', 'orari', 'cucina',
    'osm_id', 'osm_type'
  ];
  
  const csvRows = [
    headers.join(','),
    ...places.map(p => 
      headers.map(h => {
        const val = String(p[h] || '');
        // Escape virgole e virgolette
        return val.includes(',') || val.includes('"') 
          ? `"${val.replace(/"/g, '""')}"` 
          : val;
      }).join(',')
    )
  ];
  
  fs.writeFileSync(outputFile, csvRows.join('\n'), 'utf-8');
  
  console.log(`\n✨ Import completato!`);
  console.log(`📁 File: ${outputFile}`);
  console.log(`📊 Record salvati: ${places.length}\n`);
}

main().catch(console.error);


