// app/api/places/[id]/visit/route.ts
// POST /api/places/[id]/visit - Registra visita a un POI
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const { id: place_id } = params;

    if (!place_id) {
      return NextResponse.json({ error: 'place_id_required' }, { status: 400 });
    }

    // Verifica che il place sia nei "Miei Luoghi"
    const { data: selectedPlace, error: selectError } = await supabase
      .from('user_selected_places')
      .select('place_id')
      .eq('user_id', user.id)
      .eq('place_id', place_id)
      .single();

    if (selectError || !selectedPlace) {
      // Se non è selezionato, lo aggiungiamo automaticamente (se c'è spazio)
      const { data: canAdd } = await supabase.rpc('can_add_active_place');

      if (!canAdd) {
        return NextResponse.json({
          error: 'not_selected_and_limit_reached',
          message: 'Questo POI non è nei tuoi luoghi e hai raggiunto il limite. Selezionalo prima o rimuovi altri.',
        }, { status: 403 });
      }

      // Aggiungi automaticamente
      await supabase
        .from('user_selected_places')
        .insert({
          user_id: user.id,
          place_id,
          last_visited: new Date().toISOString(),
        });
    } else {
      // Aggiorna last_visited
      const { error: updateError } = await supabase
        .from('user_selected_places')
        .update({ last_visited: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('place_id', place_id);

      if (updateError) {
        console.error('Errore update last_visited:', updateError);
        return NextResponse.json(
          { error: 'update_failed', details: updateError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      visited_at: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('Errore API visit place:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

