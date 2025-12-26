const fs = require('fs');
const path = require('path');

/**
 * IMPORT DA OPEN DATA COMUNE DI VERONA
 * 
 * Cerca dataset su:
 * - Portale Open Data Comune: https://opendata.comune.verona.it/
 * - CKAN API se disponibile
 * - Dataset licenze commerciali
 */

const outputDir = path.join(__dirname, '..', 'data-sources');
const outputFile = path.join(outputDir, 'opendata-verona-horeca.csv');

// Portali verificati
const OPENDATA_ENDPOINTS = [
  {
    name: 'Open Data Veneto (Regionale)',
    url: 'https://dati.veneto.it/api/3/action/package_search',
    params: { q: 'verona commercio OR attività produttive OR SUAP' }
  },
  {
    name: '37100LAB Verona',
    url: 'https://37100lab.comune.verona.it',
    manual: true // Richiede visita manuale
  }
];

async function searchDatasets() {
  console.log('🔍 Ricerca dataset su portali Open Data...\n');
  
  const foundDatasets = [];

  for (const endpoint of OPENDATA_ENDPOINTS) {
    console.log(`Tentativo ${endpoint.name}...`);
    
    try {
      const params = new URLSearchParams(endpoint.params);
      const response = await fetch(`${endpoint.url}?${params}`, {
        headers: {
          'User-Agent': 'REPING-DataImport/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.result?.results) {
          console.log(`   ✅ Trovati ${data.result.results.length} dataset`);
          foundDatasets.push(...data.result.results.map(d => ({
            source: endpoint.name,
            title: d.title || d.name,
            name: d.name,
            resources: d.resources || []
          })));
        }
      } else {
        console.log(`   ⚠️  ${response.status} - API non disponibile o formato diverso`);
      }
    } catch (error) {
      console.log(`   ❌ Errore: ${error.message}`);
    }
  }

  return foundDatasets;
}

async function downloadResource(resourceUrl) {
  try {
    const response = await fetch(resourceUrl, {
      headers: { 'User-Agent': 'REPING-DataImport/1.0' }
    });
    
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('json')) {
      return await response.json();
    } else if (contentType?.includes('csv') || resourceUrl.endsWith('.csv')) {
      return await response.text();
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

function normalizeRecord(record) {
  // Cerca campi comuni con nomi diversi
  const getName = (r) => 
    r.nome || r.name || r.denominazione || r.ragione_sociale || r.insegna || '';
  
  const getType = (r) => 
    r.tipo || r.type || r.categoria || r.settore || 'commercio';
  
  const getAddress = (r) => 
    r.indirizzo || r.address || r.via || r.indirizzo_stradale || '';
  
  const getCity = (r) => 
    r.comune || r.city || r.citta || 'Verona';
  
  const getLat = (r) => 
    parseFloat(r.lat || r.latitude || r.latitudine || 0);
  
  const getLon = (r) => 
    parseFloat(r.lon || r.lng || r.longitude || r.longitudine || 0);

  return {
    nome: getName(record),
    tipo: getType(record),
    indirizzo_stradale: getAddress(record),
    comune: getCity(record),
    provincia: 'VR',
    cap: record.cap || record.CAP || '',
    lat: getLat(record),
    lon: getLon(record),
    source: 'opendata-comune-vr'
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
  console.log(`💾 Salvati ${records.length} record in ${path.basename(filePath)}`);
}

async function run() {
  console.log('🚀 Import dati HoReCa da OPEN DATA VERONA\n');

  const datasets = await searchDatasets();

  if (datasets.length === 0) {
    console.log('\n⚠️  Nessun dataset trovato automaticamente.');
    console.log('\n📌 SUGGERIMENTO:');
    console.log('Visita manualmente questi portali e cerca dataset su:');
    console.log('   - https://dati.veneto.it/ (Open Data Veneto - Regionale)');
    console.log('   - https://37100lab.comune.verona.it/open-data/ (Progetto comunale)');
    console.log('   - https://www.comune.verona.it/Amministrazione/Uffici/GIS-e-Open-Data');
    console.log('\n   Cerca: "attività produttive", "SUAP", "licenze commercio", "pubblici esercizi"');
    console.log('\nSe trovi un dataset CSV, scaricalo e mettilo in data-sources/');
    return;
  }

  console.log(`\n📦 Dataset trovati: ${datasets.length}\n`);
  
  // Mostra lista
  datasets.forEach((d, i) => {
    console.log(`${i + 1}. ${d.title} (${d.source})`);
    if (d.resources.length > 0) {
      console.log(`   Risorse: ${d.resources.length} file disponibili`);
    }
  });

  // Prova a scaricare risorse CSV/JSON
  console.log('\n📥 Tentativo download risorse...\n');
  
  const allRecords = [];
  
  for (const dataset of datasets) {
    for (const resource of dataset.resources) {
      if (resource.format === 'CSV' || resource.format === 'JSON') {
        console.log(`   Scaricamento: ${resource.name || resource.url}...`);
        const data = await downloadResource(resource.url);
        
        if (data) {
          console.log(`   ✅ Scaricato`);
          // Qui andrebbe parsato e normalizzato
          // TODO: implementare parsing CSV/JSON dinamico
        }
      }
    }
  }

  if (allRecords.length > 0) {
    const normalized = allRecords.map(normalizeRecord).filter(r => r.nome);
    writeCSV(normalized, outputFile);
    console.log('\n✨ Import completato!');
  } else {
    console.log('\n⚠️  Nessun dato scaricabile automaticamente.');
    console.log('Controlla manualmente i portali per dataset in formato CSV/JSON.');
  }
}

run();

