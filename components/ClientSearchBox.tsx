'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';

type ClientResult = {
  id: string;
  name: string;
  city: string;
  tipo_locale: string;
};

type Props = {
  onSelect: (clientId: string) => void;
  placeholder?: string;
};

/**
 * Componente di ricerca clienti con decifratura client-side
 * Supporta ricerca per nome (cifrato), città e tipo locale
 */
export default function ClientSearchBox({ onSelect, placeholder = 'Cerca cliente...' }: Props) {
  const { crypto, ready } = useCrypto();
  const actuallyReady = ready || !!(crypto as any)?.isUnlocked?.();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientResult[]>([]);
  const [allClients, setAllClients] = useState<ClientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Carica e decifra tutti i clienti una volta
  const loadClients = useCallback(async () => {
    if (!crypto || !actuallyReady || loadedOnce) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name_enc, name_iv, city, tipo_locale')
        .order('created_at', { ascending: false })
        .limit(200); // Limite ragionevole
      
      if (error) throw error;
      
      // Funzione per convertire hex a base64
      const hexToBase64 = (hexStr: any): string => {
        if (!hexStr || typeof hexStr !== 'string') return '';
        if (!hexStr.startsWith('\\x')) return hexStr;
        const hex = hexStr.slice(2);
        const bytes = hex.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
        return bytes;
      };

      // Decifra i nomi
      await (crypto as any).getOrCreateScopeKeys('table:accounts');
      
      const decrypted: ClientResult[] = [];
      
      for (const acc of (data || [])) {
        try {
          let name = '';
          
          if (acc.name_enc && acc.name_iv) {
            const recordForDecrypt = {
              name_enc: hexToBase64(acc.name_enc),
              name_iv: hexToBase64(acc.name_iv),
            };
            
            const toObj = (x: any): Record<string, unknown> =>
              Array.isArray(x)
                ? x.reduce((o: Record<string, unknown>, it: any) => {
                    if (it && typeof it === 'object' && 'name' in it) o[it.name] = it.value ?? '';
                    return o;
                  }, {})
                : ((x ?? {}) as Record<string, unknown>);
            
            const decAny = await (crypto as any).decryptFields(
              'table:accounts',
              'accounts',
              acc.id,
              recordForDecrypt,
              ['name']
            );
            
            const dec = toObj(decAny);
            name = String(dec.name ?? '');
          }
          
          decrypted.push({
            id: acc.id,
            name,
            city: acc.city || '',
            tipo_locale: acc.tipo_locale || '',
          });
        } catch (e) {
          // Skip errori di decifratura singola
          console.warn('[ClientSearchBox] Decrypt error for', acc.id);
        }
      }
      
      setAllClients(decrypted);
      setLoadedOnce(true);
    } catch (e: any) {
      console.error('[ClientSearchBox] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [crypto, actuallyReady, loadedOnce]);

  // Carica clienti quando crypto è pronto
  useEffect(() => {
    if (actuallyReady && !loadedOnce) {
      loadClients();
    }
  }, [actuallyReady, loadedOnce, loadClients]);

  // Filtra risultati
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    
    const q = query.toLowerCase();
    const filtered = allClients.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.tipo_locale.toLowerCase().includes(q)
    ).slice(0, 10);
    
    setResults(filtered);
  }, [query, allClients]);

  // Se crypto non è pronto, mostra messaggio
  if (!actuallyReady) {
    return (
      <div style={{ padding: 12, background: '#fef3c7', borderRadius: 6, fontSize: 12 }}>
        🔐 Sblocca i dati per cercare per nome
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 6,
          border: '1px solid #d1d5db',
          fontSize: 14,
          marginBottom: 8,
        }}
      />
      
      {loading && (
        <div style={{ fontSize: 12, color: '#6b7280', padding: 8 }}>
          ⏳ Caricamento clienti...
        </div>
      )}
      
      {!loading && results.length > 0 && (
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                marginBottom: 4,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 500 }}>{c.name || 'Cliente senza nome'}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                {c.tipo_locale && <span>🏪 {c.tipo_locale}</span>}
                {c.tipo_locale && c.city && <span> • </span>}
                {c.city && <span>📍 {c.city}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
      
      {!loading && query.length >= 2 && results.length === 0 && loadedOnce && (
        <div style={{ fontSize: 12, color: '#9ca3af', padding: 8, textAlign: 'center' }}>
          Nessun cliente trovato
        </div>
      )}
      
      {query.length > 0 && query.length < 2 && (
        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
          Digita almeno 2 caratteri
        </div>
      )}
    </div>
  );
}

