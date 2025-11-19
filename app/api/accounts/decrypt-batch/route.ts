// app/api/accounts/decrypt-batch/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Endpoint per recuperare dati cifrati degli account in batch
 * Usa service_role_key per bypassare RLS
 * ✅ Converte bytea → utf8 per ottenere le stringhe base64 originali
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
    
    // 🔄 Converti hex PostgreSQL → UTF-8 per ottenere le stringhe base64 originali
    const data = rawData?.map(account => {
      const converted: any = { ...account };
      
      // ✅ TUTTI convertiti con utf8 (non base64!)
      // Perché nel DB sono salvate stringhe base64, PostgreSQL le ritorna come hex
      
      if (account.name_enc && typeof account.name_enc === 'string' && account.name_enc.startsWith('\\x')) {
        const hexStr = account.name_enc.slice(2);
        const bytes = Buffer.from(hexStr, 'hex');
        converted.name_enc = bytes.toString('utf8');  // ✅ utf8
      }
      
      if (account.name_iv && typeof account.name_iv === 'string' && account.name_iv.startsWith('\\x')) {
        const hexStr = account.name_iv.slice(2);
        const bytes = Buffer.from(hexStr, 'hex');
        converted.name_iv = bytes.toString('utf8');  // ✅ utf8 (NON base64!)
      }
      
      if (account.name_bi && typeof account.name_bi === 'string' && account.name_bi.startsWith('\\x')) {
        const hexStr = account.name_bi.slice(2);
        const bytes = Buffer.from(hexStr, 'hex');
        converted.name_bi = bytes.toString('utf8');  // ✅ utf8 (NON base64!)
      }
      
      return converted;
    });
    
    console.log('✅ [API-BATCH] Query OK, accounts trovati:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('🔍 [API-BATCH] Primo account:', {
        id: data[0].id?.substring(0, 8) + '...',
        hasNameEnc: !!data[0].name_enc,
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
