// lib/rag/indexer.ts
// Indicizzazione accounts per RAG (name + notes + city)

import { embedText } from '../embeddings';
import { supabase } from '../supabase/client';
import crypto from 'crypto';

/**
 * Genera un hash del contenuto per sapere se l'embedding è aggiornato
 */
function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Costruisce il testo da indicizzare per un account
 */
export function buildAccountContent(account: {
  name?: string | null;
  city?: string | null;
  notes?: string | null;
  tipo_locale?: string | null;
}): string {
  const parts: string[] = [];
  
  if (account.name) {
    parts.push(`Nome: ${account.name}`);
  }
  if (account.city) {
    parts.push(`Città: ${account.city}`);
  }
  if (account.tipo_locale) {
    parts.push(`Tipo: ${account.tipo_locale}`);
  }
  if (account.notes) {
    parts.push(`Note: ${account.notes}`);
  }
  
  return parts.join('\n');
}

/**
 * Indicizza un singolo account
 */
export async function indexAccount(accountId: string, content: string): Promise<boolean> {
  try {
    const contentHash = hashContent(content);
    
    // Verifica se l'embedding esiste già e se è aggiornato
    const { data: existing } = await supabase
      .from('account_embeddings')
      .select('content_hash')
      .eq('account_id', accountId)
      .single();
    
    if (existing?.content_hash === contentHash) {
      console.log(`[RAG] Account ${accountId.slice(0, 8)}... già indicizzato`);
      return true;
    }
    
    // Genera embedding
    const embedding = await embedText(content);
    
    // Upsert in account_embeddings
    const { error } = await supabase
      .from('account_embeddings')
      .upsert({
        account_id: accountId,
        embedding: embedding,
        content_hash: contentHash,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'account_id',
      });
    
    if (error) {
      console.error(`[RAG] Errore indexing account ${accountId}:`, error);
      return false;
    }
    
    console.log(`[RAG] Account ${accountId.slice(0, 8)}... indicizzato`);
    return true;
  } catch (e) {
    console.error(`[RAG] Errore embedding account ${accountId}:`, e);
    return false;
  }
}

/**
 * Indicizza tutti gli account di un utente
 */
export async function indexAllAccountsForUser(userId: string): Promise<{
  total: number;
  indexed: number;
  skipped: number;
  errors: number;
}> {
  const stats = { total: 0, indexed: 0, skipped: 0, errors: 0 };
  
  // Carica tutti gli account con name popolato
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, name, city, notes, tipo_locale')
    .eq('user_id', userId)
    .not('name', 'is', null);
  
  if (error || !accounts) {
    console.error('[RAG] Errore caricamento accounts:', error);
    return stats;
  }
  
  stats.total = accounts.length;
  
  for (const account of accounts) {
    const content = buildAccountContent(account);
    
    // Skip se non c'è contenuto significativo
    if (content.length < 10) {
      stats.skipped++;
      continue;
    }
    
    const success = await indexAccount(account.id, content);
    if (success) {
      stats.indexed++;
    } else {
      stats.errors++;
    }
    
    // Rate limiting: 1 richiesta ogni 100ms
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`[RAG] Indicizzazione completata:`, stats);
  return stats;
}

/**
 * Rimuove embedding per un account eliminato
 */
export async function removeAccountIndex(accountId: string): Promise<void> {
  await supabase
    .from('account_embeddings')
    .delete()
    .eq('account_id', accountId);
}
