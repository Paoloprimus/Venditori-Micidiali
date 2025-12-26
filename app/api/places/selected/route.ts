// app/api/places/selected/route.ts
// GET /api/places/selected - I "Miei Luoghi" dell'utente
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    // Query con join per ottenere i dettagli dei places
    const { data, error } = await supabase
      .from('user_selected_places')
      .select(`
        place_id,
        added_at,
        last_visited,
        places (
          id,
          nome,
          tipo,
          indirizzo_stradale,
          comune,
          provincia,
          cap,
          lat,
          lon,
          telefono,
          website,
          email,
          opening_hours
        )
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Errore query selected places:', error);
      return NextResponse.json(
        { error: 'query_failed', details: error.message },
        { status: 500 }
      );
    }

    // Flatten the result
    const places = (data || []).map((item: any) => ({
      ...item.places,
      added_at: item.added_at,
      last_visited: item.last_visited,
    }));

    // Ottieni anche il conteggio e il limite
    const { data: countData } = await supabase.rpc('get_selected_places_count');
    
    // Ottieni limite dal profilo utente
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const { data: limitsData } = await supabase
      .from('service_limits')
      .select('max_active_places')
      .eq('role', profileData?.role || 'agente')
      .single();

    return NextResponse.json({
      places,
      count: countData || places.length,
      limit: limitsData?.max_active_places || 100,
    });
  } catch (e: any) {
    console.error('Errore API selected places:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

