// app/api/clients/count/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr || !user) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  // Conta i record di accounts dell’utente
  const { count, error } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: count ?? 0 });
}
