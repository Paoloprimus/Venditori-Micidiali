// app/api/documents/[id]/route.ts
// API endpoint per eliminare un singolo documento

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/documents/[id]
 * Elimina un documento (solo metadata, non il file fisico)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const documentId = params.id;

    // Verifica che il documento esista e appartenga all'utente
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('id', documentId)
      .single();

    if (fetchError || !existingDoc) {
      return NextResponse.json(
        { error: 'Documento non trovato' },
        { status: 404 }
      );
    }

    if (existingDoc.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      );
    }

    // Elimina documento
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Errore delete documento:', deleteError);
      return NextResponse.json(
        { error: 'Errore eliminazione documento', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Errore DELETE /api/documents/[id]:', error);
    return NextResponse.json(
      { error: 'Errore server', details: error.message },
      { status: 500 }
    );
  }
}
