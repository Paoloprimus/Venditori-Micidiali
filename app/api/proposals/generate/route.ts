import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '../../../../lib/supabase/server';
import { openai } from '../../../../lib/openai';
import type { ProposalPayload } from '../../../../lib/types.copilot';

const Schema = z.object({
  account_id: z.string().uuid(),
  contact_id: z.string().uuid().nullable().optional(),
  products: z.array(z.object({ id: z.string().uuid(), qta: z.number().positive().default(1) })),
  obiettivi: z.string().optional(),
  preferenze: z.string().optional()
});

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  try {
    const body = await req.json();
    const { account_id, contact_id, products, obiettivi, preferenze } = Schema.parse(body);

    // Load profiles
    const { data: account } = await supabase.from('accounts').select('*').eq('id', account_id).single();
    const { data: contact } = contact_id ? await supabase.from('contacts').select('*').eq('id', contact_id).single() : { data: null };
    const productIds = products.map(p => p.id);
    const { data: prods } = productIds.length ? await supabase.from('products').select('*').in('id', productIds) : { data: [] };

    // Get top-k notes for RAG (internal call by invoking the RPC directly)
    const { data: notesData } = await supabase.rpc('match_notes', { query_embedding: null, match_count: 0, account: account_id });
    // Fallback simple: take latest few notes if RPC needs embedding; in MVP we skip if null.

    const context = {
      account, contact,
      products: prods?.map(p => ({ id: p.id, title: p.title, sku: p.sku, base_price: p.base_price, custom: p.custom })) || [],
      righe: products,
      obiettivi: obiettivi || '',
      preferenze: preferenze || '',
      note_sample: (notesData || []).slice(0,3)
    };

    const sys = `Sei un co-pilot vendite per PMI. Genera proposte chiare, orientate al valore, in italiano professionale. 
Produci JSON valido nello schema richiesto. Non inventare prezzi se non forniti; lascia prezzo_unit null se assente.`;

    const user = `CONTEX: ${JSON.stringify(context, null, 2)}
OUTPUT SCHEMA:
{
  "titolo": string,
  "intro": string,
  "punti_valore": string[],
  "tabella_voci": [{"prodotto": string, "sku": string?, "qta": number, "prezzo_unit": number?, "sconti": string?, "subtotale": number?}],
  "riepilogo_prezzi": {"totale": number?, "sconto": number?, "iva": number?, "totale_ivato": number?},
  "termini_pagamento": string?,
  "SLA": string?,
  "CTA": string?,
  "email_accompagnamento": string?
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL_NAME || 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user }
      ]
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const payload = JSON.parse(content) as ProposalPayload;

    const { data: proposal, error } = await supabase.from('proposals').insert({
      account_id, contact_id: contact_id || null, payload, status: 'draft'
    }).select('id').single();

    if (error) throw error;
    return NextResponse.json({ ok: true, id: proposal.id, payload });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
