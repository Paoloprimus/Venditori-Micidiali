const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

/**
 * Script per unire venetoristoranti.csv e veronabarcaffe.csv
 * filtrando solo i record di Verona (comune o provincia)
 */

const desktopPath = '/Users/paolo.olivato/Desktop';
const inputFile1 = path.join(desktopPath, 'venetoristoranti.csv');
const inputFile2 = path.join(desktopPath, 'veronabarcaffe.csv');
// Salva nel workspace invece che Desktop (sandbox restriction)
const outputFile = path.join(__dirname, '..', 'veronahoreca.csv');

function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File non trovato: ${filePath}`);
    return [];
  }

  console.log(`📖 Lettura ${path.basename(filePath)}...`);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  try {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true, // Permette righe con numero diverso di colonne
    });
    console.log(`   ✅ Letti ${records.length} record`);
    return records;
  } catch (error) {
    console.error(`   ❌ Errore parsing: ${error.message}`);
    return [];
  }
}

function isVerona(record) {
  // Controlla se comune o provincia contengono "verona" (case-insensitive)
  const comune = (record.comune || record.city || '').toLowerCase();
  const provincia = (record.provincia || record.province || record.prov || '').toLowerCase();
  
  return comune.includes('verona') || provincia.includes('verona') || provincia === 'vr';
}

function normalizeRecord(record) {
  // Normalizza i nomi delle colonne (possono variare tra i file)
  return {
    nome: record.nome || record.name || record.Nome || '',
    tipo: record.tipo || record.type || record.Tipo || '',
    indirizzo_stradale: record.indirizzo_stradale || record.indirizzo || record.address || record.via || '',
    comune: record.comune || record.city || record.Comune || '',
    provincia: record.provincia || record.province || record.prov || record.Provincia || '',
    cap: record.cap || record.CAP || record.postcode || '',
    lat: record.lat || record.latitude || record.Latitude || '',
    lon: record.lon || record.longitude || record.Longitude || record.lng || '',
  };
}

function writeCSV(records, filePath) {
  if (records.length === 0) {
    console.error('❌ Nessun record da scrivere');
    return;
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
  console.log(`💾 Salvato ${records.length} record in ${path.basename(filePath)}`);
}

async function run() {
  console.log('🚀 Unione file HoReCa Verona\n');

  // Leggi i due file
  const records1 = readCSV(inputFile1);
  const records2 = readCSV(inputFile2);

  if (records1.length === 0 && records2.length === 0) {
    console.error('❌ Nessun file trovato o entrambi vuoti');
    return;
  }

  // Normalizza e filtra per Verona
  console.log('\n🔍 Filtro per Verona...');
  const verona1 = records1.map(normalizeRecord).filter(isVerona);
  const verona2 = records2.map(normalizeRecord).filter(isVerona);

  console.log(`   ${path.basename(inputFile1)}: ${verona1.length} record di Verona`);
  console.log(`   ${path.basename(inputFile2)}: ${verona2.length} record di Verona`);

  // Unisci (rimuovi duplicati basandoti su nome + indirizzo)
  const allRecords = [...verona1, ...verona2];
  const uniqueRecords = [];
  const seen = new Set();

  for (const record of allRecords) {
    const key = `${record.nome.toLowerCase()}_${record.indirizzo_stradale.toLowerCase()}_${record.comune.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRecords.push(record);
    }
  }

  console.log(`\n📊 Totale dopo deduplicazione: ${uniqueRecords.length} record unici\n`);

  // Salva
  writeCSV(uniqueRecords, outputFile);

  // Statistiche finali
  console.log('\n📈 Statistiche:');
  const tipi = {};
  uniqueRecords.forEach(r => {
    const tipo = r.tipo || 'non specificato';
    tipi[tipo] = (tipi[tipo] || 0) + 1;
  });

  Object.entries(tipi)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tipo, count]) => {
      console.log(`   ${tipo}: ${count}`);
    });

  console.log(`\n✨ Completato! File salvato in:\n   ${outputFile}`);
}

run();

