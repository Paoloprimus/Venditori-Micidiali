// app/api/places/select/route.ts
// POST /api/places/select - Aggiungi a "Miei Luoghi"
// DELETE /api/places/select - Rimuovi da "Miei Luoghi"
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getTierFromRole, getUpgradeMessage, type UserRole } from '@/lib/tiers';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { place_id } = body;

    if (!place_id) {
      return NextResponse.json({ error: 'place_id_required' }, { status: 400 });
    }

    // Verifica che il place esista
    const { data: placeExists, error: placeError } = await supabase
      .from('places')
      .select('id')
      .eq('id', place_id)
      .single();

    if (placeError || !placeExists) {
      return NextResponse.json({ error: 'place_not_found' }, { status: 404 });
    }

    // Verifica se già selezionato
    const { data: alreadySelected } = await supabase
      .from('user_selected_places')
      .select('place_id')
      .eq('user_id', user.id)
      .eq('place_id', place_id)
      .single();

    if (alreadySelected) {
      return NextResponse.json({ error: 'already_selected' }, { status: 409 });
    }

    // Verifica limite tier usando la funzione DB
    const { data: canAdd } = await supabase.rpc('can_add_active_place');

    if (!canAdd) {
      // Ottieni info per messaggio upgrade
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = (profileData?.role || 'agente') as UserRole;
      const tier = getTierFromRole(role);
      const upgradeMessage = getUpgradeMessage(role, 'places');

      return NextResponse.json({
        error: 'limit_reached',
        message: upgradeMessage,
        currentLimit: tier.limits.maxActivePlaces,
      }, { status: 403 });
    }

    // Aggiungi alla selezione
    const { error: insertError } = await supabase
      .from('user_selected_places')
      .insert({
        user_id: user.id,
        place_id,
      });

    if (insertError) {
      console.error('Errore insert selected place:', insertError);
      return NextResponse.json(
        { error: 'insert_failed', details: insertError.message },
        { status: 500 }
      );
    }

    // Ottieni conteggio aggiornato
    const { data: newCount } = await supabase.rpc('get_selected_places_count');

    return NextResponse.json({
      success: true,
      count: newCount,
    });
  } catch (e: any) {
    console.error('Errore API select place:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const place_id = searchParams.get('place_id');

    if (!place_id) {
      return NextResponse.json({ error: 'place_id_required' }, { status: 400 });
    }

    // Rimuovi dalla selezione
    const { error: deleteError } = await supabase
      .from('user_selected_places')
      .delete()
      .eq('user_id', user.id)
      .eq('place_id', place_id);

    if (deleteError) {
      console.error('Errore delete selected place:', deleteError);
      return NextResponse.json(
        { error: 'delete_failed', details: deleteError.message },
        { status: 500 }
      );
    }

    // Ottieni conteggio aggiornato
    const { data: newCount } = await supabase.rpc('get_selected_places_count');

    return NextResponse.json({
      success: true,
      count: newCount,
    });
  } catch (e: any) {
    console.error('Errore API deselect place:', e);
    return NextResponse.json(
      { error: 'unexpected', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

