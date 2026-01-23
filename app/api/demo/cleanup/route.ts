/**
 * API: Cleanup Demo Sessions
 * POST /api/demo/cleanup
 * 
 * Cancella account demo scaduti (più vecchi di 2 ore).
 * Da chiamare periodicamente (cron job) o manualmente.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  // Opzionale: protezione con secret
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    // Permetti comunque chiamate locali/admin
    console.log("[Demo Cleanup] No auth header, proceeding anyway...");
  }

  console.log("[Demo Cleanup] Starting cleanup...");

  try {
    // 1. Trova utenti demo scaduti (creati più di 2 ore fa)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      console.error("[Demo Cleanup] List error:", listError);
      return NextResponse.json({ error: "Errore lista utenti" }, { status: 500 });
    }

    // Filtra utenti demo scaduti
    const expiredDemoUsers = users.users.filter(user => {
      const metadata = user.user_metadata;
      if (!metadata?.is_demo) return false;
      
      const createdAt = metadata.demo_created_at;
      if (!createdAt) return false;
      
      return new Date(createdAt) < new Date(twoHoursAgo);
    });

    console.log("[Demo Cleanup] Found", expiredDemoUsers.length, "expired demo users");

    let deleted = 0;
    let errors = 0;

    // 2. Cancella ogni utente demo scaduto
    for (const user of expiredDemoUsers) {
      try {
        // I dati collegati (accounts, visits, notes) vengono cancellati automaticamente
        // grazie a ON DELETE CASCADE sulle foreign keys
        
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        
        if (error) {
          console.error("[Demo Cleanup] Error deleting user:", user.id, error);
          errors++;
        } else {
          console.log("[Demo Cleanup] Deleted user:", user.id);
          deleted++;
        }
      } catch (e) {
        console.error("[Demo Cleanup] Exception for user:", user.id, e);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      found: expiredDemoUsers.length,
      deleted,
      errors,
      message: `Cancellati ${deleted} account demo scaduti`,
    });

  } catch (error: any) {
    console.error("[Demo Cleanup] Error:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}

// GET per verifica status (senza cancellare)
export async function GET(req: NextRequest) {
  try {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    const demoUsers = users?.users.filter(u => u.user_metadata?.is_demo) || [];
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const expired = demoUsers.filter(u => {
      const createdAt = u.user_metadata?.demo_created_at;
      return createdAt && new Date(createdAt) < twoHoursAgo;
    });

    return NextResponse.json({
      totalDemoUsers: demoUsers.length,
      expiredDemoUsers: expired.length,
      activeDemoUsers: demoUsers.length - expired.length,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
