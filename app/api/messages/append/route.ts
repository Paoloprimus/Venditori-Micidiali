// app/api/messages/append/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  conversationId: string;
  userText: string;
  assistantText: string;
};

export async function POST(req: NextRequest) {
  try {
    const { conversationId, userText, assistantText } = (await req.json()) as Body;

    if (!conversationId || !userText || !assistantText) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // prendo l'owner della conversazione
    const conv = await sb
      .from("conversations")
      .select("user_id")
      .eq("id", conversationId)
      .single();

    if (conv.error || !conv.data?.user_id) {
      return NextResponse.json({ error: "CONVERSATION_NOT_FOUND" }, { status: 404 });
    }
    const ownerUserId = conv.data.user_id;

    // inserisco i due messaggi in ordine

const now = new Date();
const later = new Date(now.getTime() + 1); // +1 ms

const { error: insErr } = await sb.from("messages").insert([
  {
    conversation_id: conversationId,
    user_id: ownerUserId,
    role: "user",
    content: userText,
    created_at: now.toISOString(),
  },
  {
    conversation_id: conversationId,
    user_id: ownerUserId,
    role: "assistant",
    content: assistantText,
    created_at: later.toISOString(),
  },
]);

    if (insErr) {
      return NextResponse.json({ error: "INSERT_FAILED", details: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "INTERNAL" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST." }, { status: 405 });
}
