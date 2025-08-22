export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../../lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const body = await req.json().catch(() => null) as { title?: string } | null;
  const title = (body?.title || "").trim();
  if (!title) return NextResponse.json({ error: "EMPTY_TITLE" }, { status: 400 });

  const { error } = await supabase
    .from("conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", u.user.id);

  if (error) return NextResponse.json({ error: "DB_RENAME", details: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const { error } = await supabase
    .from("conversations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", u.user.id);

  if (error) return NextResponse.json({ error: "DB_DELETE", details: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
