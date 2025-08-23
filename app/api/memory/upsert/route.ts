import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '../../../../lib/supabase/server';
import { embedText } from '../../../../lib/embeddings';

const Schema = z.object({
  account_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  body: z.string().min(5)
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  try {
    const body = await req.json();
    const payload = Schema.parse(body);

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        account_id: payload.account_id ?? null,
        contact_id: payload.contact_id ?? null,
        body: payload.body,
        custom: {}
      })
      .select('id, body')
      .single();

    if (error) throw error;

    // Embed and upsert into notes_embeddings
    const embedding = await embedText(note.body);
    const { error: embErr } = await supabase
      .from('notes_embeddings')
      .upsert({ note_id: note.id, embedding });

    if (embErr) throw embErr;

    return NextResponse.json({ ok: true, note_id: note.id });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
