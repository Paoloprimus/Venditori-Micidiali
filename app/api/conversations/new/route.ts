import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(_req: NextRequest) {
  const supabase = createClient();
  try {
    // Recupera utente loggato
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error("Utente non autenticato");

    // Titolo di default leggibile (con data/ora)
    const defaultTitle = "Nuova sessione " + new Date().toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Inserisci nuova conversazione
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: defaultTitle,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, conversation: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 400 }
    );
  }
}
