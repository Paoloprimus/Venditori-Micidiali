export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { LLM_MODEL } from "../../../../lib/openai";

export async function POST(req: Request) {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const body = await req.json().catch(() => null) as { title?: string } | null;
  const title = (body?.title || "Nuova chat").trim() || "Nuova chat";

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: u.user.id, title, model: LLM_MODEL })
    .select("id, title, updated_at, total_cost")
    .single();

  if (error) return NextResponse.json({ error: "DB_CREATE", details: error.message }, { status: 500 });
  return NextResponse.json({ conversation: data });
}
