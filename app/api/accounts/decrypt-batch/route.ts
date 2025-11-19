// app/api/accounts/decrypt-batch/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Endpoint per recuperare dati cifrati degli account in batch
 * Usa service_role_key per bypassare RLS
 * ✅ Gestisce TUTTI i formati: hex PostgreSQL, Buffer JSON, stringhe dirette
 */
export async function POST(req: NextRequest) {
  try {
    // ✅ STEP 1: Autentica l'utente
    const supabaseAuth = await createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      console.error('❌ [API-BATCH] Utente non autenticato');
      return NextResponse.json(
        { error: "Non autenticato" }, 
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    const body = await req.json();
    const accountIds: string[] = body?.accountIds || [];
    
    console.log('🔍 [API-BATCH] ========== INIZIO ==========');
    console.log('🔍 [API-BATCH] User ID:', userId.substring(0, 8) + '...');
    console.log('🔍 [API-BATCH] Request per', accountIds.length, 'account IDs');
    console.log('🔍 [API-BATCH] IDs:', accountIds.map(id => id.substring(0, 8) + '...'));
    
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      console.error('❌ [API-BATCH] accountIds mancante o vuoto');
      return NextResponse.json(
        { error: "accountIds array richiesto" }, 
        { status: 400 }
      );
    }
    
    // Limita a max 50 account per performance
    if (accountIds.length > 50) {
      console.error('❌ [API-BATCH] Troppi account IDs:', accountIds.length);
      return NextResponse.json(
        { error: "Max 50 account per richiesta" }, 
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    console.log('🔍 [API-BATCH] Query diretta su accounts (con filtro user_id)...');
    
    // ✅ Query DIRETTA con FILTRO USER_ID
    const { data: rawData, error } = await supabase
      .from('accounts')
      .select('id, name_enc, name_iv, name_bi')
      .in('id', accountIds)
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ [API-BATCH] Supabase error:', error);
      return NextResponse.json(
        { error: 'Database query failed', details: error.message }, 
        { status: 500 }
      );
    }
    
    // 🔄 Converti in formato base64 stringa per compatibilità frontend
    const data = rawData?.map(account => {
      const converted: any = { ...account };
      
      // ✅ Gestisci TUTTI i formati possibili per name_enc
      if (account.name_enc) {
        // CASO 1: Oggetto Buffer JSON da PostgreSQL
        if (typeof account.name_enc === 'object' && (account.name_enc as any).type === 'Buffer') {
          console.log('🔍 [API-BATCH] Formato Buffer JSON rilevato per', account.id.substring(0, 8));
          const bufferData = (account.name_enc as any).data;
          const bytes = Buffer.from(bufferData);
          converted.name_enc = bytes.toString('utf8');
        }
        // CASO 2: Hex PostgreSQL con prefisso \x
        else if (typeof account.name_enc === 'string' && account.name_enc.startsWith('\\x')) {
          console.log('🔍 [API-BATCH] Formato hex rilevato per', account.id.substring(0, 8));
          const hexStr = account.name_enc.slice(2);
          const bytes = Buffer.from(hexStr, 'hex');
          converted.name_enc = bytes.toString('utf8');
        }
        // CASO 3: Stringa diretta (già in formato corretto)
        else if (typeof account.name_enc === 'string') {
          console.log('🔍 [API-BATCH] Formato stringa diretta per', account.id.substring(0, 8));
          converted.name_enc = account.name_enc;
        }
        else {
          console.warn('⚠️ [API-BATCH] Formato sconosciuto per name_enc:', typeof account.name_enc);
        }
      }
      
      // ✅ Gestisci name_iv
      if (account.name_iv) {
        if (typeof account.name_iv === 'object' && (account.name_iv as any).type === 'Buffer') {
          const bufferData = (account.name_iv as any).data;
          const bytes = Buffer.from(bufferData);
          converted.name_iv = bytes.toString('utf8');
        }
        else if (typeof account.name_iv === 'string' && account.name_iv.startsWith('\\x')) {
          const hexStr = account.name_iv.slice(2);
          const bytes = Buffer.from(hexStr, 'hex');
          converted.name_iv = bytes.toString('utf8');
        }
        else if (typeof account.name_iv === 'string') {
          converted.name_iv = account.name_iv;
        }
      }
      
      // ✅ Gestisci name_bi
      if (account.name_bi) {
        if (typeof account.name_bi === 'object' && (account.name_bi as any).type === 'Buffer') {
          const bufferData = (account.name_bi as any).data;
          const bytes = Buffer.from(bufferData);
          converted.name_bi = bytes.toString('utf8');
        }
        else if (typeof account.name_bi === 'string' && account.name_bi.startsWith('\\x')) {
          const hexStr = account.name_bi.slice(2);
          const bytes = Buffer.from(hexStr, 'hex');
          converted.name_bi = bytes.toString('utf8');
        }
        else if (typeof account.name_bi === 'string') {
          converted.name_bi = account.name_bi;
        }
      }
      
      return converted;
    });
    
    console.log('✅ [API-BATCH] Query OK, accounts trovati:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('🔍 [API-BATCH] Primo account:', {
        id: data[0].id?.substring(0, 8) + '...',
        hasNameEnc: !!data[0].name_enc,
        nameEncType: typeof data[0].name_enc,
        nameEncLength: data[0].name_enc?.length,
        nameEncPrefix: data[0].name_enc?.substring(0, 30),
        hasNameIv: !!data[0].name_iv,
        nameIvLength: data[0].name_iv?.length,
        nameIvPrefix: data[0].name_iv?.substring(0, 30),
        hasNameBi: !!data[0].name_bi,
        nameBiLength: data[0].name_bi?.length,
        nameBiPrefix: data[0].name_bi?.substring(0, 30)
      });
    } else {
      console.warn('⚠️ [API-BATCH] Nessun account trovato nel DB per questo user_id');
    }
    
    console.log('🔍 [API-BATCH] ========== FINE ==========');
    
    // Restituisci dati cifrati in base64 (il frontend li decifrerà)
    return NextResponse.json({ accounts: data || [] }, { status: 200 });
    
  } catch (err: any) {
    console.error('❌ [API-BATCH] Exception:', err);
    console.error('❌ [API-BATCH] Stack:', err?.stack);
    return NextResponse.json(
      { error: err?.message || 'Internal error' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with JSON body { accountIds: [...] }" }, 
    { status: 405 }
  );
}
