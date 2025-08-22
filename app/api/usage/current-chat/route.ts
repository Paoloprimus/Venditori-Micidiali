import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");

  if (conversationId) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, total_tokens_in, total_tokens_out, total_cost, deleted_at")
      .eq("id", conversationId)
      .eq("user_id", u.user.id)
      .maybeSingle();

    if (!conv || conv.deleted_at) return NextResponse.json({ error: "INVALID_CONVERSATION" }, { status: 400 });

    return NextResponse.json({
      conversationId: conv.id,
      tokensIn: Number(conv.total_tokens_in ?? 0),
      tokensOut: Number(conv.total_tokens_out ?? 0),
      costTotal: Number(conv.total_cost ?? 0)
    });
  }

  // fallback: ultima conversazione
  const { data: last } = await supabase
    .from("conversations")
    .select("id, total_tokens_in, total_tokens_out, total_cost")
    .is("deleted_at", null)
    .eq("user_id", u.user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!last) return NextResponse.json({ tokensIn: 0, tokensOut: 0, costTotal: 0 });

  return NextResponse.json({
    conversationId: last.id,
    tokensIn: Number(last.total_tokens_in ?? 0),
    tokensOut: Number(last.total_tokens_out ?? 0),
    costTotal: Number(last.total_cost ?? 0)
  });
}
