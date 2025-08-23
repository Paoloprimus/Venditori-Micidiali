import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '../../../../lib/supabase/server';

const Schema = z.object({
  title: z.string().min(2),
  sku: z.string().optional(),
  base_price: z.number().optional(),
  custom: z.record(z.any()).optional()
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  try {
    const body = await req.json();
    const { title, sku, base_price, custom } = Schema.parse(body);

    const { data, error } = await supabase
      .from('products')
      .insert({ title, sku: sku ?? null, base_price: base_price ?? null, custom: custom ?? {} })
      .select('id,title,base_price')
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, product: data });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
