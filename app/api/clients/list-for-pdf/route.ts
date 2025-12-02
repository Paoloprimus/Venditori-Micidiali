// app/api/clients/list-for-pdf/route.ts
// Endpoint per ottenere lista clienti per generazione PDF

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decryptText } from "@/lib/crypto/serverEncryption";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityFilter = searchParams.get('city');
    const tipoFilter = searchParams.get('tipo');
    
    // Get user from session
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }
    
    const adminSupabase = getSupabaseAdmin();
    
    // Prima: conta TUTTI i clienti dell'utente (senza filtri)
    const { count: totalCount } = await adminSupabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`);
    
    console.log("[list-for-pdf] Total clients for user:", totalCount);
    
    // Query clienti con filtri (nota: 'name' non esiste, solo name_enc/name_iv)
    let query = adminSupabase
      .from("accounts")
      .select("id, city, tipo_locale, notes, name_enc, name_iv, created_at")
      .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`);
    
    if (cityFilter) {
      // Usa "inizia con" invece di "contiene" per evitare falsi positivi
      // Es: "Verona" trova "Verona" ma NON "Villafranca di Verona"
      query = query.ilike("city", `${cityFilter}%`);
    }
    if (tipoFilter) {
      query = query.ilike("tipo_locale", `%${tipoFilter}%`);
    }
    
    const { data: accounts, error } = await query.limit(500);
    
    // Debug: mostra alcune città per capire il formato
    const { data: sampleCities } = await adminSupabase
      .from("accounts")
      .select("city")
      .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`)
      .not("city", "is", null)
      .limit(10);
    
    console.log("[list-for-pdf] Query result:", { 
      userId: user.id, 
      totalClientsForUser: totalCount,
      cityFilter, 
      tipoFilter, 
      accountsFound: accounts?.length || 0,
      sampleCities: sampleCities?.map(c => c.city),
      firstAccount: accounts?.[0] ? { id: accounts[0].id, city: accounts[0].city } : null
    });
    
    if (error) {
      console.error("[list-for-pdf] Query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Decifra nomi e aggrega dati visite
    const clients = await Promise.all((accounts || []).map(async (acc: any) => {
      // Nome: usa plain se disponibile, altrimenti prova a decifrare
      let name = 'Cliente';
      if (acc.name) {
        // Nome in chiaro (legacy o non cifrato)
        name = acc.name;
      } else if (acc.name_enc && acc.name_iv) {
        // Nome cifrato - nota: accounts usa formato diverso senza tag
        // Il frontend decifra client-side, qui usiamo placeholder
        name = `[CLIENT:${acc.id}]`;
      }
      
      // Ottieni statistiche visite
      const { data: visits } = await adminSupabase
        .from("visits")
        .select("data_visita, importo_vendita")
        .eq("account_id", acc.id)
        .order("data_visita", { ascending: false });
      
      const visitCount = visits?.length || 0;
      const lastVisit = visits?.[0]?.data_visita 
        ? new Date(visits[0].data_visita).toLocaleDateString('it-IT') 
        : null;
      const totalSales = (visits || []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);
      
      return {
        id: acc.id,
        name,
        name_enc: acc.name_enc,
        name_iv: acc.name_iv,
        city: acc.city,
        tipo: acc.tipo_locale,
        notes: acc.notes,
        visit_count: visitCount,
        last_visit: lastVisit,
        total_sales: totalSales,
        created_at: acc.created_at
      };
    }));
    
    return NextResponse.json({ 
      clients,
      count: clients.length,
      filters: { city: cityFilter, tipo: tipoFilter }
    });
    
  } catch (err: any) {
    console.error("[list-for-pdf] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

