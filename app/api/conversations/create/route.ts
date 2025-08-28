export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const passedTitle =
    typeof body?.title === "string" && body.title.trim().length
      ? body.title.trim()
      : null;

  // PATCH A: se l’utente non ha passato un titolo, non generiamo nulla qui.
  // Inseriamo titolo vuoto: sarà rinominato automaticamente al primo messaggio.
  const title = passedTitle ?? "";

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: u.user.id, title })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "DB_INSERT_CONV", details: error?.message ?? "fail" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, conversation: data });
}
