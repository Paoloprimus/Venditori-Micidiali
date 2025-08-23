import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  try {
    const { data, error } = await supabase.from('proposals').select('*').eq('id', params.id).single();
    if (error) throw error;
    return NextResponse.json({ ok: true, proposal: data });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  try {
    const patch = await req.json();
    const { data, error } = await supabase.from('proposals').update(patch).eq('id', params.id).select('*').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, proposal: data });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
