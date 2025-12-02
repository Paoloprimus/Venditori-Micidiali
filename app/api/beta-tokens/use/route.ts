import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: Usa un token beta (dopo signup riuscito)
export async function POST(req: NextRequest) {
  try {
    const { token, userId } = await req.json();

    if (!token || !userId) {
      return NextResponse.json({ success: false, error: "Token o userId mancante" });
    }

    const supabase = createClient();

    // Chiama la funzione use_beta_token
    const { data, error } = await supabase.rpc("use_beta_token", {
      p_token: token.trim().toUpperCase(),
      p_user_id: userId,
    });

    if (error) {
      console.error("Errore uso token:", error);
      return NextResponse.json({ success: false, error: "Errore uso token" });
    }

    return NextResponse.json({ success: data === true });
  } catch (err) {
    console.error("Errore API use token:", err);
    return NextResponse.json({ success: false, error: "Errore interno" });
  }
}

