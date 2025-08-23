import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '../../../../lib/supabase/server';
import { embedText } from '../../../../lib/embeddings';
import type { MemorySearchHit } from '../../../../lib/types.copilot';

const Schema = z.object({
  query: z.string().min(2),
  account_id: z.string().uuid().nullable().optional(),
  k: z.number().int().min(1).max(20).default(5)
});

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  try {
    const body = await req.json();
    const { query, account_id, k } = Schema.parse(body);

    const embedding = await embedText(query);
    // Call RPC function match_notes
    const { data, error } = await supabase.rpc('match_notes', {
      query_embedding: embedding,
      match_count: k,
      account: account_id ?? null
    });

    if (error) throw error;

    // Optionally hydrate note bodies
    const ids = (data || []).map((d:any) => d.note_id);
    let bodies: Record<string,string> = {};
    if (ids.length) {
      const { data: notes } = await supabase.from('notes').select('id, body').in('id', ids);
      (notes || []).forEach((n:any) => { bodies[n.id] = n.body; });
    }

    const hits: MemorySearchHit[] = (data || []).map((d:any) => ({
      note_id: d.note_id,
      similarity: d.similarity,
      body: bodies[d.note_id]
    }));

    return NextResponse.json({ ok: true, hits });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
