// app/api/clients/search/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q) return NextResponse.json({ items: [] });

    const { data, error } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('user_id', user.id)
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(5);

    if (error) return NextResponse.json({ error: 'search_failed', details: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', details: e?.message ?? String(e) }, { status: 500 });
  }
}
