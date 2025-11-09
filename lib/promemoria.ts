// lib/promemoria.ts
/**
 * ============================================================================
 * LIBRERIA: Gestione Promemoria
 * ============================================================================
 * 
 * CRUD completo per promemoria con crittografia end-to-end
 * 
 * FUNZIONI:
 * - createPromemoria(): Crea nuovo promemoria
 * - fetchPromemoria(): Leggi tutti i promemoria (decifrati)
 * - updatePromemoria(): Modifica promemoria esistente
 * - deletePromemoria(): Elimina promemoria
 * 
 * ============================================================================
 */

import { supabase } from '@/lib/supabase/client';
import type { CryptoService } from '@/lib/crypto/CryptoService';

// ============================================================================
// TYPES
// ============================================================================

export type PromemoriaRecord = {
  id: string;
  user_id: string;
  nota_enc: string;
  nota_iv: string;
  urgente: boolean;
  created_at: string;
  updated_at: string;
};

export type PromemoriaDecrypted = {
  id: string;
  nota: string;
  urgente: boolean;
  created_at: string;
  updated_at: string;
};

export type PromemoriaInput = {
  nota: string;
  urgente: boolean;
};

// ============================================================================
// UTILITY: Conversione hex/base64 per BYTEA
// ============================================================================

/**
 * Converte hex string (da Supabase BYTEA) a base64 per CryptoService
 */
function hexToBase64(hexStr: any): string {
  if (!hexStr || typeof hexStr !== 'string') return '';
  if (!hexStr.startsWith('\\x')) return hexStr;
  
  const hex = hexStr.slice(2);
  const bytes = hex.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
  return btoa(bytes);
}

/**
 * Converte base64 (da CryptoService) a Buffer per Supabase
 */
function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

// ============================================================================
// CREATE
// ============================================================================

export async function createPromemoria(
  crypto: CryptoService,
  input: PromemoriaInput
): Promise<PromemoriaDecrypted> {
  
  // 1. Verifica autenticazione
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Non autenticato');
  }

  // 2. Cifra la nota
  const recordToEncrypt = {
    nota: input.nota,
  };

  const encrypted = await crypto.encryptFields(
    'table:promemoria',
    'promemoria',
    '',
    recordToEncrypt,
    ['nota']
  );

  // Estrai enc e iv
  const notaField = Array.isArray(encrypted) 
    ? encrypted.find((f: any) => f.name === 'nota')
    : null;

  if (!notaField || !notaField.value) {
    throw new Error('Errore cifratura nota');
  }

  const nota_enc = base64ToBuffer(notaField.value);
  const nota_iv = base64ToBuffer(notaField.iv);

  // 3. Salva nel DB
  const { data, error } = await supabase
    .from('promemoria')
    .insert({
      user_id: user.id,
      nota_enc,
      nota_iv,
      urgente: input.urgente,
    })
    .select()
    .single();

  if (error) {
    console.error('[Promemoria] Errore INSERT:', error);
    throw new Error(error.message);
  }

  // 4. Ritorna decifrato
  return {
    id: data.id,
    nota: input.nota,
    urgente: data.urgente,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

// ============================================================================
// READ
// ============================================================================

export async function fetchPromemoria(
  crypto: CryptoService
): Promise<PromemoriaDecrypted[]> {
  
  // 1. Verifica autenticazione
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Non autenticato');
  }

  // 2. Query tutti i promemoria dell'utente
  const { data, error } = await supabase
    .from('promemoria')
    .select('*')
    .eq('user_id', user.id)
    .order('urgente', { ascending: false })
    .order('created_at', { ascending: true }); // Più vecchi prima

  if (error) {
    console.error('[Promemoria] Errore SELECT:', error);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // 3. Decifra tutti
  const decrypted: PromemoriaDecrypted[] = [];

  for (const record of data) {
    try {
      const recordForDecrypt = {
        ...record,
        nota_enc: hexToBase64(record.nota_enc),
        nota_iv: hexToBase64(record.nota_iv),
      };

      const decryptedFields = await crypto.decryptFields(
        'table:promemoria',
        'promemoria',
        '',
        recordForDecrypt,
        ['nota']
      );

      // Estrai nota decifrata
      const notaField = Array.isArray(decryptedFields)
        ? decryptedFields.find((f: any) => f.name === 'nota')
        : null;

      const nota = notaField?.value || '';

      decrypted.push({
        id: record.id,
        nota: String(nota),
        urgente: record.urgente,
        created_at: record.created_at,
        updated_at: record.updated_at,
      });

    } catch (e) {
      console.error('[Promemoria] Errore decifratura:', e);
      // Skip questo record
    }
  }

  return decrypted;
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updatePromemoria(
  crypto: CryptoService,
  id: string,
  input: Partial<PromemoriaInput>
): Promise<PromemoriaDecrypted> {
  
  // 1. Verifica autenticazione
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Non autenticato');
  }

  // 2. Prepara update
  const updateData: any = {};

  // Se cambia la nota, cifra
  if (input.nota !== undefined) {
    const recordToEncrypt = {
      nota: input.nota,
    };

    const encrypted = await crypto.encryptFields(
      'table:promemoria',
      'promemoria',
      '',
      recordToEncrypt,
      ['nota']
    );

    const notaField = Array.isArray(encrypted)
      ? encrypted.find((f: any) => f.name === 'nota')
      : null;

    if (!notaField || !notaField.value) {
      throw new Error('Errore cifratura nota');
    }

    updateData.nota_enc = base64ToBuffer(notaField.value);
    updateData.nota_iv = base64ToBuffer(notaField.iv);
  }

  // Se cambia urgenza
  if (input.urgente !== undefined) {
    updateData.urgente = input.urgente;
  }

  // 3. Update nel DB
  const { data, error } = await supabase
    .from('promemoria')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[Promemoria] Errore UPDATE:', error);
    throw new Error(error.message);
  }

  // 4. Decifra e ritorna
  const recordForDecrypt = {
    ...data,
    nota_enc: hexToBase64(data.nota_enc),
    nota_iv: hexToBase64(data.nota_iv),
  };

  const decryptedFields = await crypto.decryptFields(
    'table:promemoria',
    'promemoria',
    '',
    recordForDecrypt,
    ['nota']
  );

  const notaField = Array.isArray(decryptedFields)
    ? decryptedFields.find((f: any) => f.name === 'nota')
    : null;

  return {
    id: data.id,
    nota: String(notaField?.value || ''),
    urgente: data.urgente,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

// ============================================================================
// DELETE
// ============================================================================

export async function deletePromemoria(id: string): Promise<void> {
  
  // 1. Verifica autenticazione
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Non autenticato');
  }

  // 2. Delete
  const { error } = await supabase
    .from('promemoria')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[Promemoria] Errore DELETE:', error);
    throw new Error(error.message);
  }
}

// ============================================================================
// UTILITY: Fetch solo i primi 3 per widget home
// ============================================================================

export async function fetchPromemoriaForWidget(
  crypto: CryptoService
): Promise<PromemoriaDecrypted[]> {
  
  const all = await fetchPromemoria(crypto);
  
  // Prendi prima gli urgenti (se ci sono)
  const urgenti = all.filter(p => p.urgente);
  
  if (urgenti.length >= 3) {
    return urgenti.slice(0, 3);
  }
  
  // Altrimenti prendi i primi 3 tra urgenti + normali
  return all.slice(0, 3);
}
