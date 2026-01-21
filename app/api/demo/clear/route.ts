/**
 * API: Clear Demo Data
 * POST /api/demo/clear
 * 
 * Cancella tutti i dati demo (marcati con custom.is_demo = true)
 * Da chiamare prima di importare i clienti veri.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();
  
  // Auth check
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  }

  try {
    const results = {
      clients: 0,
      visits: 0,
      notes: 0,
    };

    // 1. Trova tutti gli account demo dell'utente
    const { data: demoAccounts, error: findError } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("custom->>is_demo", "true");

    if (findError) {
      throw new Error(`Errore ricerca account demo: ${findError.message}`);
    }

    if (!demoAccounts || demoAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nessun dato demo da cancellare",
        ...results,
      });
    }

    const accountIds = demoAccounts.map(a => a.id);

    // 2. Cancella le visite associate (CASCADE dovrebbe farlo, ma per sicurezza)
    const { count: visitsDeleted } = await supabase
      .from("visits")
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .in("account_id", accountIds);
    
    results.visits = visitsDeleted || 0;

    // 3. Cancella le note associate
    const { count: notesDeleted } = await supabase
      .from("notes")
      .delete({ count: "exact" })
      .in("account_id", accountIds);
    
    results.notes = notesDeleted || 0;

    // 4. Cancella gli account demo
    const { count: clientsDeleted, error: deleteError } = await supabase
      .from("accounts")
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .eq("custom->>is_demo", "true");

    if (deleteError) {
      throw new Error(`Errore cancellazione account: ${deleteError.message}`);
    }

    results.clients = clientsDeleted || 0;

    // Aggiorna localStorage per rimuovere flag usedDemo
    // (questo viene fatto client-side)

    return NextResponse.json({
      success: true,
      message: `Cancellati ${results.clients} clienti, ${results.visits} visite, ${results.notes} note demo`,
      ...results,
    });

  } catch (error: any) {
    console.error("[Demo Clear] Error:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}

// GET per verificare se ci sono dati demo
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServer();
  
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  }

  try {
    const { count } = await supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("custom->>is_demo", "true");

    return NextResponse.json({
      hasDemoData: (count || 0) > 0,
      demoCount: count || 0,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
