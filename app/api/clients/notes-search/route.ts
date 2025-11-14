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
    if (!topic) return NextResponse.json({ items: [] });

    // ✅ NUOVO: Cerca direttamente nelle note dell'utente per topic
    // Non cerchiamo più il cliente per nome (cifrato), ma filtriamo le note per topic
    const { data: notes, error: nErr } = await supabase
      .from('notes')
      .select('id, body, account_id, accounts!inner(id, city, tipo_locale)')
      .ilike('body', `%${topic}%`)
      .order('id', { ascending: false })
      .limit(10);

    if (nErr) {
      return NextResponse.json({ error: 'search_failed', details: nErr.message }, { status: 500 });
    }

    const items: Array<{ snippet: string; source: 'notes' | 'custom'; context?: string }> = [];
    
    // Aggiungi note trovate con contesto del cliente
    (notes ?? []).forEach(n => {
      const accounts = (n as any).accounts;
      const context = accounts ? `${accounts.tipo_locale} a ${accounts.city}` : '';
      items.push({ 
        snippet: String((n as any).body).slice(0, 200), 
        source: 'notes',
        context 
      });
    });

    // Se l'utente ha specificato un account hint, cerca anche in accounts.custom
    if (account) {
      const { data: accs } = await supabase
        .from('accounts')
        .select('id, custom, city, tipo_locale')
        .eq('user_id', user.id)
        .ilike('city', `%${account}%`)
        .limit(5);

      const topicLower = topic.toLowerCase();
      
      for (const acc of (accs ?? [])) {
        const custom = (acc as any).custom || {};
        const context = `${acc.tipo_locale} a ${acc.city}`;
        
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
            items.push({ snippet: str.slice(0, 200), source: 'custom', context });
          }
        }
      }
    }

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', details: e?.message ?? String(e) }, { status: 500 });
  }
}
