import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '../../../../lib/supabase/server';

const Schema = z.object({
  name: z.string().min(2),
  custom: z.record(z.any()).optional()
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  try {
    const body = await req.json();
    const { name, custom } = Schema.parse(body);

    // prendi l'utente loggato
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) throw new Error('Utente non autenticato');

    const { data, error } = await supabase
      .from('accounts')
      .insert({ user_id: user.id, name, custom: custom ?? {} })
      .select('id,name,created_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, account: data });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
