import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'veronahoreca-final.csv');
    const fileContent = readFileSync(filePath, 'utf-8');
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    // Converti e filtra solo record con coordinate valide
    const points = records
      .map((record: any) => ({
        nome: record.nome || '',
        tipo: record.tipo || '',
        indirizzo_stradale: record.indirizzo_stradale || '',
        comune: record.comune || '',
        provincia: record.provincia || '',
        cap: record.cap || '',
        lat: parseFloat(record.lat),
        lon: parseFloat(record.lon),
        telefono: record.telefono || '',
        website: record.website || '',
        email: record.email || '',
        source: record.source || '',
      }))
      .filter((point: any) => 
        !isNaN(point.lat) && 
        !isNaN(point.lon) &&
        point.lat !== 0 &&
        point.lon !== 0
      );

    return NextResponse.json(points);
  } catch (error) {
    console.error('Errore lettura veronahoreca-final.csv:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}


