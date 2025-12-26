// app/api/places/[id]/route.ts
// GET /api/places/[id] - Dettaglio singolo POI
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer();
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'place_not_found' }, { status: 404 });
      }
      console.error('Errore query place:', error);
      return NextResponse.json(
        { error: 'query_failed', details: error.message },
        { status: 500 }
      );
    }

    // Check if user has selected this place
    const { data: { user } } = await supabase.auth.getUser();
    let isSelected = false;
    
    if (user) {
      const { data: selectedData } = await supabase
        .from('user_selected_places')
        .select('place_id')
        .eq('user_id', user.id)
        .eq('place_id', id)
        .single();
      
      isSelected = !!selectedData;
    }

    return NextResponse.json({
      ...data,
      is_selected: isSelected,
    });
  } catch (e: any) {
    console.error('Errore API place detail:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

