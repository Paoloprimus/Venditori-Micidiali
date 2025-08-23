import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '../../../../lib/supabase/server';

const Schema = z.object({
  account_id: z.string().uuid(),
  full_name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  custom: z.record(z.any()).optional()
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  try {
    const body = await req.json();
    const { account_id, full_name, email, phone, custom } = Schema.parse(body);

    // opzionale: verifica ownership dell'account via RLS (già ci pensa RLS)
    const { data, error } = await supabase
      .from('contacts')
      .insert({ account_id, full_name, email: email ?? null, phone: phone ?? null, custom: custom ?? {} })
      .select('id,full_name,account_id')
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, contact: data });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
