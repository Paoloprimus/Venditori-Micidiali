// app/api/places/route.ts
// GET /api/places - Lista POI pubblici con filtri
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    
    // Parse query params
    const { searchParams } = new URL(req.url);
    const comune = searchParams.get('comune');
    const provincia = searchParams.get('provincia');
    const tipo = searchParams.get('tipo');
    const search = searchParams.get('search');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const radius = searchParams.get('radius'); // km
    const limit = parseInt(searchParams.get('limit') || '500');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('places')
      .select('*', { count: 'exact' });

    // Filtri
    if (provincia) {
      query = query.eq('provincia', provincia.toUpperCase());
    }
    
    if (comune) {
      query = query.ilike('comune', `%${comune}%`);
    }
    
    if (tipo) {
      query = query.eq('tipo', tipo);
    }
    
    if (search) {
      query = query.or(`nome.ilike.%${search}%,indirizzo_stradale.ilike.%${search}%`);
    }

    // Bounding box per ricerca geografica (se lat/lon/radius forniti)
    if (lat && lon && radius) {
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      const radiusKm = parseFloat(radius);
      
      // Approssimazione: 1 grado lat ≈ 111km, 1 grado lon ≈ 111km * cos(lat)
      const latDelta = radiusKm / 111;
      const lonDelta = radiusKm / (111 * Math.cos(latNum * Math.PI / 180));
      
      query = query
        .gte('lat', latNum - latDelta)
        .lte('lat', latNum + latDelta)
        .gte('lon', lonNum - lonDelta)
        .lte('lon', lonNum + lonDelta);
    }

    // Ordinamento e paginazione
    query = query
      .order('nome', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Errore query places:', error);
      return NextResponse.json(
        { error: 'query_failed', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      places: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (e: any) {
    console.error('Errore API places:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

