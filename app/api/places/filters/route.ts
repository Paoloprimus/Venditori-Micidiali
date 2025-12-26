// app/api/places/filters/route.ts
// GET /api/places/filters - Lista tipi e comuni disponibili per i filtri
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    // Ottieni tipi unici
    const { data: tipiData, error: tipiError } = await supabase
      .from('places')
      .select('tipo')
      .not('tipo', 'is', null)
      .order('tipo');

    if (tipiError) {
      console.error('Errore query tipi:', tipiError);
    }

    // Conta per tipo
    const tipiCount: Record<string, number> = {};
    (tipiData || []).forEach((row: any) => {
      if (row.tipo) {
        tipiCount[row.tipo] = (tipiCount[row.tipo] || 0) + 1;
      }
    });

    const tipi = Object.entries(tipiCount)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count);

    // Ottieni comuni unici
    const { data: comuniData, error: comuniError } = await supabase
      .from('places')
      .select('comune, provincia')
      .not('comune', 'is', null)
      .order('comune');

    if (comuniError) {
      console.error('Errore query comuni:', comuniError);
    }

    // Conta per comune
    const comuniCount: Record<string, { count: number; provincia: string }> = {};
    (comuniData || []).forEach((row: any) => {
      if (row.comune) {
        if (!comuniCount[row.comune]) {
          comuniCount[row.comune] = { count: 0, provincia: row.provincia || 'VR' };
        }
        comuniCount[row.comune].count++;
      }
    });

    const comuni = Object.entries(comuniCount)
      .map(([comune, { count, provincia }]) => ({ comune, provincia, count }))
      .sort((a, b) => b.count - a.count);

    // Ottieni province uniche
    const { data: provinceData } = await supabase
      .from('places')
      .select('provincia')
      .not('provincia', 'is', null);

    const provinceCount: Record<string, number> = {};
    (provinceData || []).forEach((row: any) => {
      if (row.provincia) {
        provinceCount[row.provincia] = (provinceCount[row.provincia] || 0) + 1;
      }
    });

    const province = Object.entries(provinceCount)
      .map(([provincia, count]) => ({ provincia, count }))
      .sort((a, b) => b.count - a.count);

    // Statistiche generali
    const { count: totalCount } = await supabase
      .from('places')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      tipi,
      comuni,
      province,
      total: totalCount || 0,
    });
  } catch (e: any) {
    console.error('Errore API filters:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

