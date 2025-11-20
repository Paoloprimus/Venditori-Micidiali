// app/api/visits/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = await req.json();
    const { dataInizio, dataFine } = body;

    if (!dataInizio || !dataFine) {
      return NextResponse.json({ error: 'Date mancanti' }, { status: 400 });
    }

    // Query visite nel periodo
    const { data: visits, error: visitsError } = await supabase
      .from('visits')
      .select('id, importo_vendita')
      .eq('user_id', user.id)
      .gte('data_visita', `${dataInizio}T00:00:00`)
      .lte('data_visita', `${dataFine}T23:59:59`);

    if (visitsError) {
      console.error('[Preview] Errore query visite:', visitsError);
      return NextResponse.json({ error: visitsError.message }, { status: 500 });
    }

    const numVisite = visits?.length || 0;
    const fatturatoTotale = visits?.reduce((sum, v) => {
      return sum + (v.importo_vendita ? parseFloat(v.importo_vendita as any) : 0);
    }, 0) || 0;

    return NextResponse.json({
      numVisite,
      fatturatoTotale,
    });

  } catch (error: any) {
    console.error('[Preview] Errore:', error);
    return NextResponse.json(
      { error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
