// app/api/accounts/decrypt-batch/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Endpoint per recuperare dati cifrati degli account in batch
 * Usa service_role_key per bypassare RLS
 * ✅ Converte bytea → base64 per compatibilità con CryptoService
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accountIds: string[] = body?.accountIds || [];
    
    console.log('🔍 [API-BATCH] ========== INIZIO ==========');
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
    
    console.log('🔍 [API-BATCH] Chiamo get_accounts_base64...');
    
    // ✅ Usa funzione RPC che converte bytea → base64
    const { data, error } = await supabase
      .rpc('get_accounts_base64', {
        account_ids: accountIds
      });
    
    if (error) {
      console.error('❌ [API-BATCH] Supabase error:', error);
      return NextResponse.json(
        { error: 'Database query failed', details: error.message }, 
        { status: 500 }
      );
    }
    
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
      console.warn('⚠️ [API-BATCH] Nessun account trovato nel DB');
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
