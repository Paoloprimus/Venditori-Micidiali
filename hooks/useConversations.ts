// hooks/useConversations.ts
// PATCH: Sostituire la funzione decryptClientPlaceholders (righe 12-127) con questa versione corretta:

/**
 * Decifra i placeholder [CLIENT:uuid] o [CLIENT:uuid|enc|iv|bi] nella risposta dell'assistente
 */
async function decryptClientPlaceholders(text: string): Promise<string> {
  // Pattern esteso: [CLIENT:uuid] o [CLIENT:uuid|name_enc|name_iv|name_bi]
  const clientPattern = /\[CLIENT:([a-f0-9-]+)(?:\|([^|\]]+)\|([^|\]]+)\|([^|\]]+))?\]/g;
  const matches = [...text.matchAll(clientPattern)];
  
  if (matches.length === 0) return text;
  
  // Ottieni crypto service
  const crypto = (window as any).cryptoSvc;
  if (!crypto || typeof crypto.decryptFields !== 'function') {
    console.warn('[decryptClientPlaceholders] CryptoService non disponibile');
    return text;
  }
  
  // Raggruppa UUID da recuperare (quelli senza dati inline)
  const uuidsToFetch: string[] = [];
  const matchesMap = new Map<string, RegExpMatchArray>();
  
  for (const match of matches) {
    const accountId = match[1];
    const hasInlineData = match[2] && match[3] && match[4];
    
    matchesMap.set(accountId, match);
    
    if (!hasInlineData) {
      uuidsToFetch.push(accountId);
    }
  }
  
  // ✅ Recupera dati cifrati in batch tramite API
  let accountsData = new Map<string, any>();
  
  if (uuidsToFetch.length > 0) {
    try {
      const response = await fetch('/api/accounts/decrypt-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds: uuidsToFetch })
      });
      
      if (!response.ok) {
        console.error('[decryptClientPlaceholders] Batch fetch failed:', response.status);
      } else {
        const { accounts } = await response.json();
        for (const acc of accounts || []) {
          accountsData.set(acc.id, acc);
        }
      }
    } catch (error) {
      console.error('[decryptClientPlaceholders] Batch fetch error:', error);
    }
  }
  
  let result = text;
  
  // Decifra ogni placeholder
  for (const [accountId, match] of matchesMap) {
    const placeholder = match[0];
    const nameEnc = match[2];
    const nameIv = match[3];
    const nameBi = match[4];  // ✅ name_bi (tag per GCM)
    
    try {
      let clientName: string;
      
      // Se ci sono dati cifrati inline, usali direttamente
      if (nameEnc && nameIv && nameBi) {
        const encryptedData = {
          id: accountId,
          name_enc: nameEnc,
          name_iv: nameIv,
          name_bi: nameBi  // ✅ Usa name_bi
        };
        
        const decrypted = await crypto.decryptFields(
          'table:accounts',
          'accounts',
          '',
          encryptedData,
          ['name']
        );
        
        clientName = decrypted.name || 'Cliente sconosciuto';
        
      } else {
        // Usa dati recuperati in batch
        const account = accountsData.get(accountId);
        
        if (!account || !account.name_enc) {
          console.warn(`[decryptClientPlaceholders] Account ${accountId} non trovato o senza dati`);
          clientName = 'Cliente sconosciuto';
        } else {
          const decrypted = await crypto.decryptFields(
            'table:accounts',
            'accounts',
            '',
            account,
            ['name']
          );
          
          clientName = decrypted.name || 'Cliente sconosciuto';
        }
      }
      
      // Sostituisci placeholder con nome reale
      result = result.replace(placeholder, clientName);
      
    } catch (error) {
      console.error(`[decryptClientPlaceholders] Errore decifratura ${accountId}:`, error);
      result = result.replace(placeholder, 'Cliente sconosciuto');
    }
  }
  
  return result;
}
