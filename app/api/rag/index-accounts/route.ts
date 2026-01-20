// app/api/rag/index-accounts/route.ts
// API per indicizzare gli account di un utente per RAG

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { embedText } from '@/lib/embeddings';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 secondi per batch grandi

function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

function buildAccountContent(account: {
  name?: string | null;
  city?: string | null;
  notes?: string | null;
  tipo_locale?: string | null;
}): string {
  const parts: string[] = [];
  if (account.name) parts.push(`Nome: ${account.name}`);
  if (account.city) parts.push(`Città: ${account.city}`);
  if (account.tipo_locale) parts.push(`Tipo: ${account.tipo_locale}`);
  if (account.notes) parts.push(`Note: ${account.notes}`);
  return parts.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabaseAdmin();
    
    // Verifica autenticazione
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 });
    }
    
    // Carica accounts con name popolato
    const { data: accounts, error: loadError } = await sb
      .from('accounts')
      .select('id, name, city, notes, tipo_locale')
      .eq('user_id', user.id)
      .not('name', 'is', null);
    
    if (loadError) {
      return NextResponse.json({ error: 'LOAD_FAILED', details: loadError.message }, { status: 500 });
    }
    
    const stats = { total: accounts?.length || 0, indexed: 0, skipped: 0, errors: 0 };
    
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ ok: true, stats });
    }
    
    // Carica embeddings esistenti per check hash
    const { data: existingEmb } = await sb
      .from('account_embeddings')
      .select('account_id, content_hash')
      .in('account_id', accounts.map(a => a.id));
    
    const existingMap = new Map(existingEmb?.map(e => [e.account_id, e.content_hash]) || []);
    
    // Indicizza ogni account
    for (const account of accounts) {
      const content = buildAccountContent(account);
      
      if (content.length < 10) {
        stats.skipped++;
        continue;
      }
      
      const contentHash = hashContent(content);
      
      // Skip se già indicizzato con stesso hash
      if (existingMap.get(account.id) === contentHash) {
        stats.skipped++;
        continue;
      }
      
      try {
        const embedding = await embedText(content);
        
        const { error: upsertError } = await sb
          .from('account_embeddings')
          .upsert({
            account_id: account.id,
            embedding: embedding,
            content_hash: contentHash,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'account_id',
          });
        
        if (upsertError) {
          console.error(`[RAG:API] Errore upsert ${account.id}:`, upsertError);
          stats.errors++;
        } else {
          stats.indexed++;
        }
      } catch (e) {
        console.error(`[RAG:API] Errore embedding ${account.id}:`, e);
        stats.errors++;
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 50));
    }
    
    return NextResponse.json({ ok: true, stats });
    
  } catch (e: any) {
    console.error('[RAG:API] Errore:', e);
    return NextResponse.json({ error: e?.message || 'INTERNAL' }, { status: 500 });
  }
}
