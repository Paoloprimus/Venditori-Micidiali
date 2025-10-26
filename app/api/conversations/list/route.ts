// app/api/conversations/list/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../../lib/supabase/server";
import { decryptText } from "../../../../lib/crypto/serverEncryption";

export async function GET(req: Request) {
  const supabase = createSupabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) {
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

  const { data, error } = await supabase
    .from("conversations")
    .select("id, subject_enc, subject_iv, subject_tag, title, updated_at")
    .eq("user_id", u.user.id)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: "DB_LIST", details: error.message },
      { status: 500 }
    );
  }

  // 🔓 DECIFRA i title
  const items = (data || []).map((row) => {
    let title = "Senza titolo";
    
    // Prova a decifrare se cifrato
    if (row.subject_enc && row.subject_iv && row.subject_tag) {
      try {
        title = decryptText(row.subject_enc, row.subject_iv, row.subject_tag);
      } catch {
        title = "[Errore decifratura]";
      }
    } 
    // Fallback su campo vecchio in chiaro (retrocompatibilità)
    else if (row.title) {
      title = row.title;
    }

    return {
      id: row.id,
      title,
      updated_at: row.updated_at,
    };
  });

  const nextOffset = data && data.length === limit ? offset + limit : null;

  return NextResponse.json({
    items,
    nextOffset,
  });
}
