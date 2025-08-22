export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 200);

  if (!conversationId) return NextResponse.json({ error: "MISSING_CONV_ID" }, { status: 400 });

  // Validate ownership
  const { data: conv, error: convErr } = await supabase
    .from("conversations").select("id").eq("id", conversationId).eq("user_id", u.user.id).maybeSingle();
  if (convErr || !conv) return NextResponse.json({ error: "INVALID_CONVERSATION" }, { status: 400 });

  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: "DB_LIST_MSG", details: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
