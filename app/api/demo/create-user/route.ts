import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Crea un utente demo già confermato usando service_role
 * POST /api/demo/create-user
 */
export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase config" },
        { status: 500 }
      );
    }

    // Client admin con service_role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Genera credenziali temporanee
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const email = `demo-${timestamp}-${randomId}@reping.app`;
    const password = `demo-${randomId}-${timestamp}`;

    // Crea utente già confermato
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Già confermato!
      user_metadata: {
        full_name: "Demo User",
        is_demo: true,
      },
    });

    if (error) {
      console.error("[Demo] Create user error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Restituisci credenziali per il login
    return NextResponse.json({
      email,
      password,
      userId: data.user.id,
    });

  } catch (err: any) {
    console.error("[Demo] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
