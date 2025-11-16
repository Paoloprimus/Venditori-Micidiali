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
    
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json(
        { error: "accountIds array richiesto" }, 
        { status: 400 }
      );
    }
    
    // Limita a max 50 account per performance
    if (accountIds.length > 50) {
      return NextResponse.json(
        { error: "Max 50 account per richiesta" }, 
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // ✅ Usa funzione RPC che converte bytea → base64
    const { data, error } = await supabase
      .rpc('get_accounts_base64', {
        account_ids: accountIds
      });
    
    if (error) {
      console.error('[decrypt-batch] Supabase error:', error);
      return NextResponse.json(
        { error: 'Database query failed', details: error.message }, 
        { status: 500 }
      );
    }
    
    // Restituisci dati cifrati in base64 (il frontend li decifrerà)
    return NextResponse.json({ accounts: data || [] }, { status: 200 });
    
  } catch (err: any) {
    console.error('[/api/accounts/decrypt-batch] error:', err);
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
