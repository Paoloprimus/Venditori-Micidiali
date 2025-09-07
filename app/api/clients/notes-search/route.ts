// app/api/clients/notes-search/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const account = (searchParams.get('account') || '').trim();
    const topic   = (searchParams.get('topic') || '').trim();
    if (!account || !topic) return NextResponse.json({ items: [] });

    // 1) trova l'account dell'utente
    const { data: acc, error: aErr } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('user_id', user.id)
      .ilike('name', `%${account}%`)
      .limit(1)
      .single();

    if (aErr || !acc) return NextResponse.json({ items: [] });

    // 2) cerca nelle note (assumo colonna 'content' testuale)
    const { data: notes, error: nErr } = await supabase
      .from('notes')
      .select('id, content')
      .eq('account_id', acc.id)
      .ilike('content', `%${topic}%`)
      .order('id', { ascending: false })
      .limit(3);

    if (nErr) return NextResponse.json({ error: 'search_failed', details: nErr.message }, { status: 500 });

    const items = (notes ?? []).map(n => ({
      snippet: String(n.content).slice(0, 200),
    }));
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', details: e?.message ?? String(e) }, { status: 500 });
  }
}
