import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  try {
    const patch = await req.json();
    const updates: any = {};
    if (typeof patch?.title === "string") {
      updates.title = patch.title.trim();
    }
    // se non c'è nulla da aggiornare
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "Nessun campo da aggiornare" }, { status: 400 });
    }
    // forza aggiornamento timestamp (in aggiunta al trigger)
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("conversations")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, conversation: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
