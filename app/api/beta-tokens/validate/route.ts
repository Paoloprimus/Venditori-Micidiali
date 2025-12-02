import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: Valida un token beta (senza usarlo)
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ valid: false, error: "Token mancante" });
    }

    const supabase = createClient();

    // Chiama la funzione check_beta_token
    const { data, error } = await supabase.rpc("check_beta_token", {
      p_token: token.trim().toUpperCase(),
    });

    if (error) {
      console.error("Errore validazione token:", error);
      return NextResponse.json({ valid: false, error: "Errore validazione" });
    }

    return NextResponse.json({ valid: data === true });
  } catch (err) {
    console.error("Errore API validate token:", err);
    return NextResponse.json({ valid: false, error: "Errore interno" });
  }
}

