import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

// PATCH /api/conversations/[id]  → aggiorna (es. title)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // utente loggato?
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 });
  }

  const convId = params?.id;
  if (!convId) {
    return NextResponse.json({ ok: false, error: "ID conversazione mancante" }, { status: 400 });
  }

  try {
    const patch = await req.json();
    const updates: Record<string, any> = {};

    if (typeof patch?.title === "string") {
      const t = patch.title.trim();
      if (t.length === 0) {
        return NextResponse.json({ ok: false, error: "Titolo vuoto" }, { status: 400 });
      }
      updates.title = t;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "Nessun campo da aggiornare" }, { status: 400 });
    }

    // forza l'update del timestamp (oltre al trigger)
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("conversations")
      .update(updates)
      .eq("id", convId)
      .eq("user_id", auth.user.id) // sicurezza: solo la propria
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, conversation: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Errore inatteso" }, { status: 400 });
  }
}

// DELETE /api/conversations/[id]  → elimina la conversazione
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // utente loggato?
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 });
  }

  const convId = params?.id;
  if (!convId) {
    return NextResponse.json({ ok: false, error: "ID conversazione mancante" }, { status: 400 });
  }

  // prova a cancellare SOLO se è dell'utente
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", convId)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  // NB: non usiamo .select() qui per evitare dipendenza da policy SELECT sul RETURNING
  return NextResponse.json({ ok: true, id: convId });
}
