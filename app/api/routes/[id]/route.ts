// app/api/routes/[id]/route.ts
// GET /api/routes/[id] - Dettaglio itinerario
// PUT /api/routes/[id] - Modifica itinerario
// DELETE /api/routes/[id] - Elimina itinerario
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const { id } = params;

    const { data: route, error } = await supabase
      .from('user_routes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'route_not_found' }, { status: 404 });
      }
      console.error('Errore query route:', error);
      return NextResponse.json(
        { error: 'query_failed', details: error.message },
        { status: 500 }
      );
    }

    // Arricchisci con i dettagli dei places
    let places: any[] = [];
    if (route.places_sequence && route.places_sequence.length > 0) {
      const { data: placesData } = await supabase
        .from('places')
        .select('id, nome, tipo, lat, lon, indirizzo_stradale, comune, telefono, website')
        .in('id', route.places_sequence);

      const placesMap = new Map((placesData || []).map((p: any) => [p.id, p]));
      places = route.places_sequence
        .map((id: string) => placesMap.get(id))
        .filter(Boolean);
    }

    return NextResponse.json({
      ...route,
      places,
    });
  } catch (e: any) {
    console.error('Errore API route detail:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { nome, descrizione, places_sequence, color } = body;

    // Verifica che l'itinerario appartenga all'utente
    const { data: existing, error: checkError } = await supabase
      .from('user_routes')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'route_not_found' }, { status: 404 });
    }

    // Prepara update
    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (descrizione !== undefined) updateData.descrizione = descrizione;
    if (color !== undefined) updateData.color = color;
    
    if (places_sequence !== undefined) {
      if (!Array.isArray(places_sequence)) {
        return NextResponse.json({ error: 'places_sequence_must_be_array' }, { status: 400 });
      }
      
      // Verifica che tutti i places esistano
      if (places_sequence.length > 0) {
        const { data: placesExist } = await supabase
          .from('places')
          .select('id')
          .in('id', places_sequence);

        const existingIds = new Set((placesExist || []).map((p: any) => p.id));
        const missingIds = places_sequence.filter((pid: string) => !existingIds.has(pid));

        if (missingIds.length > 0) {
          return NextResponse.json({
            error: 'some_places_not_found',
            missing: missingIds,
          }, { status: 400 });
        }
      }
      
      updateData.places_sequence = places_sequence;
    }

    // Esegui update
    const { data: updated, error: updateError } = await supabase
      .from('user_routes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Errore update route:', updateError);
      return NextResponse.json(
        { error: 'update_failed', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      route: updated,
    });
  } catch (e: any) {
    console.error('Errore API update route:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const { id } = params;

    // Elimina (RLS garantisce che sia dell'utente)
    const { error: deleteError } = await supabase
      .from('user_routes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Errore delete route:', deleteError);
      return NextResponse.json(
        { error: 'delete_failed', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (e: any) {
    console.error('Errore API delete route:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

