/**
 * API per rigenerare tutti i suggerimenti di Napoleone
 * Cancella i vecchi e ne crea di nuovi con lo stile assertivo
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Ottieni l'utente dalla request (se autenticato)
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Cancella TUTTI i suggerimenti esistenti per questo utente
    const { error: deleteError } = await supabaseAdmin
      .from('napoleon_suggestions')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[Napoleon Regenerate] Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Suggerimenti cancellati. Ricarica la pagina per generarne di nuovi.' 
    });

  } catch (e) {
    console.error('[Napoleon Regenerate] Error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

