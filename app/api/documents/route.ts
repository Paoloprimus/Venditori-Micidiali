// app/api/documents/route.ts
// API endpoint per gestire i documenti

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/documents
 * Recupera la lista dei documenti dell'utente
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }

    // Leggi parametri query
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const limit = searchParams.get('limit');

    // Query base
    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Applica filtri
    if (type) {
      query = query.eq('document_type', type);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Errore query documenti:', error);
      return NextResponse.json(
        { error: 'Errore caricamento documenti', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ documents: data || [] });

  } catch (error: any) {
    console.error('Errore GET /api/documents:', error);
    return NextResponse.json(
      { error: 'Errore server', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents
 * Crea un nuovo documento (salva metadata)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }

    // Leggi body
    const body = await request.json();
    const {
      document_type,
      title,
      filename,
      file_path,
      metadata,
      file_size
    } = body;

    // Validazione
    if (!document_type || !title || !filename || !file_path) {
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }

    if (!['report_planning', 'lista_clienti'].includes(document_type)) {
      return NextResponse.json(
        { error: 'Tipo documento non valido' },
        { status: 400 }
      );
    }

    // Inserisci documento
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        document_type,
        title,
        filename,
        file_path,
        metadata: metadata || {},
        file_size: file_size || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Errore insert documento:', error);
      return NextResponse.json(
        { error: 'Errore salvataggio documento', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ document: data }, { status: 201 });

  } catch (error: any) {
    console.error('Errore POST /api/documents:', error);
    return NextResponse.json(
      { error: 'Errore server', details: error.message },
      { status: 500 }
    );
  }
}
