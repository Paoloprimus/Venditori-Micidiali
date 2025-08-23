import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '../../../../lib/supabase/server'; // adjust if different
import type { CustomFieldsProposal } from '../../../../lib/types.copilot';

const ApplySchema = z.object({
  proposal: z.record(z.array(z.object({
    field_key: z.string().min(1),
    field_label: z.string().min(1),
    field_type: z.enum(['text','number','boolean','date','enum']),
    options: z.array(z.string()).optional(),
    help: z.string().optional()
  })))
});

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  try {
    const body = await req.json();
    const { proposal } = ApplySchema.parse(body);

    const rows: any[] = [];
    for (const [entity, defs] of Object.entries(proposal as CustomFieldsProposal)) {
      for (const def of defs) {
        rows.push({
          entity,
          field_key: def.field_key,
          field_label: def.field_label,
          field_type: def.field_type,
          options: def.options ?? [],
          help: def.help ?? null
        });
      }
    }
    if (rows.length === 0) return NextResponse.json({ ok: false, error: 'Empty proposal' }, { status: 400 });

    const { error } = await supabase.from('custom_fields_registry').upsert(rows, { onConflict: 'entity,field_key' });
    if (error) throw error;
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
