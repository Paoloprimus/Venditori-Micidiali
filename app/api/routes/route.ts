// app/api/routes/route.ts
// GET /api/routes - Lista itinerari dell'utente
// POST /api/routes - Crea nuovo itinerario
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_routes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Errore query routes:', error);
      return NextResponse.json(
        { error: 'query_failed', details: error.message },
        { status: 500 }
      );
    }

    // Per ogni itinerario, arricchisci con i dettagli dei places
    const routesWithPlaces = await Promise.all((data || []).map(async (route: any) => {
      if (!route.places_sequence || route.places_sequence.length === 0) {
        return { ...route, places: [] };
      }

      const { data: placesData } = await supabase
        .from('places')
        .select('id, nome, tipo, lat, lon, indirizzo_stradale, comune')
        .in('id', route.places_sequence);

      // Riordina secondo la sequenza originale
      const placesMap = new Map((placesData || []).map((p: any) => [p.id, p]));
      const orderedPlaces = route.places_sequence
        .map((id: string) => placesMap.get(id))
        .filter(Boolean);

      return { ...route, places: orderedPlaces };
    }));

    return NextResponse.json({
      routes: routesWithPlaces,
      count: routesWithPlaces.length,
    });
  } catch (e: any) {
    console.error('Errore API routes:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { nome, descrizione, places_sequence, color } = body;

    if (!nome) {
      return NextResponse.json({ error: 'nome_required' }, { status: 400 });
    }

    if (!places_sequence || !Array.isArray(places_sequence) || places_sequence.length === 0) {
      return NextResponse.json({ error: 'places_sequence_required' }, { status: 400 });
    }

    // Verifica che tutti i places esistano
    const { data: placesExist, error: placesError } = await supabase
      .from('places')
      .select('id')
      .in('id', places_sequence);

    if (placesError) {
      return NextResponse.json(
        { error: 'places_check_failed', details: placesError.message },
        { status: 500 }
      );
    }

    const existingIds = new Set((placesExist || []).map((p: any) => p.id));
    const missingIds = places_sequence.filter((id: string) => !existingIds.has(id));

    if (missingIds.length > 0) {
      return NextResponse.json({
        error: 'some_places_not_found',
        missing: missingIds,
      }, { status: 400 });
    }

    // Crea itinerario
    const { data: newRoute, error: insertError } = await supabase
      .from('user_routes')
      .insert({
        user_id: user.id,
        nome,
        descrizione: descrizione || null,
        places_sequence,
        color: color || '#3B82F6',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Errore insert route:', insertError);
      return NextResponse.json(
        { error: 'insert_failed', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      route: newRoute,
    });
  } catch (e: any) {
    console.error('Errore API create route:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

