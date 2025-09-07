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
    const topic   = (searchParams.get('topic')   || '').trim();
    if (!account || !topic) return NextResponse.json({ items: [] });

    // 1) Trova l’account dell’utente
    const { data: acc, error: aErr } = await supabase
      .from('accounts')
      .select('id, name, custom')
      .eq('user_id', user.id)
      .ilike('name', `%${account}%`)
      .limit(1)
      .single();

    if (aErr || !acc) return NextResponse.json({ items: [] });

    // 2) Cerca nelle note (colonna "body" secondo l’handoff)
    const { data: notes, error: nErr } = await supabase
      .from('notes')
      .select('id, body')
      .eq('account_id', acc.id)
      .ilike('body', `%${topic}%`)
      .order('id', { ascending: false })
      .limit(3);

    if (nErr) {
      return NextResponse.json({ error: 'search_failed', details: nErr.message }, { status: 500 });
    }

    const items: Array<{ snippet: string; source: 'notes' | 'custom' }> = [];
    (notes ?? []).forEach(n => items.push({ snippet: String((n as any).body).slice(0, 200), source: 'notes' }));

    // 3) Fallback: scandisci alcuni campi testuali dentro accounts.custom
    const custom = (acc as any).custom || {};
    const topicLower = topic.toLowerCase();

    const collect = (v: any): string[] => {
      if (!v) return [];
      if (Array.isArray(v)) return v.map(x => String(x));
      return [String(v)];
    };

    const fieldsToScan = [
      ...collect(custom.note),
      ...collect(custom.interessi),
      ...collect(custom.tabu),
      ...collect(custom.ultimo_esito),
      ...collect(custom.prodotti_interesse),
      ...collect(custom.ultimi_volumi),
      ...collect(custom.pagamento),
    ];

    for (const s of fieldsToScan) {
      const str = String(s);
      if (str.toLowerCase().includes(topicLower)) {
        items.push({ snippet: str.slice(0, 200), source: 'custom' });
      }
    }

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', details: e?.message ?? String(e) }, { status: 500 });
  }
}
