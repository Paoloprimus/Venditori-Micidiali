import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const Entities = ['accounts','contacts','products'] as const;
const FieldTypes = ['text','number','boolean','date','enum'] as const;

const InputSchema = z.object({
  prompt: z.string().min(3)
});

// "LLM" placeholder: deterministic extraction draft using heuristics.
// In produzione, sostituisci con chiamata al modello e schema guard.
function proposeFromNL(prompt: string) {
  // Molto semplice: cerca pattern tipo "cliente/contatto, campo X di tipo Y..."
  // In MVP, restituiamo un esempio guidato se non vengono riconosciuti pattern.
  const proposal = {
    contacts: [{ field_key: 'priorita', field_label: 'Priorità', field_type: 'enum', options: ['alta','media','bassa'] }],
    products: [{ field_key: 'garanzia_mesi', field_label: 'Garanzia (mesi)', field_type: 'number' }],
    accounts: []
  };
  return proposal;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = InputSchema.parse(body);
    const proposal = proposeFromNL(prompt);
    return NextResponse.json({ ok: true, proposal });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
