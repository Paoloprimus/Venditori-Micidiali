import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  // Prende la conversazione più recente
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, total_tokens_in, total_tokens_out, total_cost")
    .is("deleted_at", null)
    .eq("user_id", u.user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conv) return NextResponse.json({ tokensIn: 0, tokensOut: 0, costTotal: 0 });

  return NextResponse.json({
    conversationId: conv.id,
    tokensIn: Number(conv.total_tokens_in ?? 0),
    tokensOut: Number(conv.total_tokens_out ?? 0),
    costTotal: Number(conv.total_cost ?? 0)
  });
}
