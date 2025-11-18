// lib/crypto/CryptoService.ts
"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** ---------- Tipi ---------- */
type KdfParams = { algo: "pbkdf2"; iterations: number; hash: "SHA-256" };

type ScopeKeys = {
  DEK: Uint8Array;        // Data-Encryption Key (32B)
  BI: Uint8Array | null;  // Blind-Index key (32B) opzionale
};

type ProfileRow = {
  wrapped_master_key: string | null;      // base64 (bytea)
  wrapped_master_key_iv?: string | null;  // base64 (bytea)
  kdf_salt: string | null;                // base64 (bytea)
  kdf_params: KdfParams | null;
};

type EncryptionRow = {
  id: string;
  user_id: string;
  scope: string;
  dek_wrapped: string;
  dek_wrapped_iv: string;
  bi_wrapped: string | null;
  bi_wrapped_iv: string | null;
  created_at?: string;
};

/** ---------- Utils byte/base64 ---------- */
function toBase64(u8: Uint8Array): string {
  if (typeof window === "undefined") return Buffer.from(u8).toString("base64");
  let s = "";
  u8.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}
function isBase64Like(s: string): boolean {
  return /^[A-Za-z0-9+/=]+$/.test(s);
}
function tryFromBase64(b64: string): Uint8Array | null {
  try {
    if (typeof window === "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  } catch {
    return null;
  }
}
function tryFromHexMaybePrefixed(s: string): Uint8Array | null {
  const hex = s.startsWith("\\x") ? s.slice(2) : s.startsWith("0x") ? s.slice(2) : s;
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null;
  const u8 = new Uint8Array(hex.length / 2);
  for (let i = 0; i < u8.length; i++) u8[i] = parseInt(hex.substr(i * 2, 2), 16);
  return u8;
}
/* function fromBase64Safe(input: string): Uint8Array {
  if (!input) return new Uint8Array();
  // alcuni record legacy possono essere stati salvati come hex
  const b64 = input.trim();
  let u8: Uint8Array | null = null;
  if (isBase64Like(b64)) u8 = tryFromBase64(b64);
  if (!u8) u8 = tryFromHexMaybePrefixed(b64);
  if (!u8) throw new Error("Dato cifrato non è base64/hex valido");
  return u8;
} */

function fromBase64Safe(input: string): Uint8Array {
  if (!input) return new Uint8Array();

  // 1) base64 "pulito"
  const b64 = input.trim();
  if (/^[A-Za-z0-9+/=]+$/.test(b64)) {
    // base64 diretto
    return tryFromBase64(b64) ?? new Uint8Array();
  }

  // 2) fallback: \xHEX o 0xHEX
  const hex = tryFromHexMaybePrefixed(b64);
  if (!hex) throw new Error("Dato cifrato non è base64/hex valido");

  // ATTENZIONE: molti record sono HEX dell'ASCII di una stringa base64.
  // Se 'hex' è tutto ASCII stampabile e "sembra" base64, decodiamolo ancora.
  let ascii = "";
  let allAscii = true;
  for (let i = 0; i < hex.length; i++) {
    const c = hex[i];
    if (c < 0x20 || c > 0x7E) { allAscii = false; break; }
    ascii += String.fromCharCode(c);
  }

  if (allAscii && /^[A-Za-z0-9+/=]+$/.test(ascii)) {
    const b = tryFromBase64(ascii);
    if (b) return b; // HEX -> ASCII (base64) -> BYTES
  }

  // altrimenti trattiamo l'HEX come bytes "veri"
  return hex;
}



/** ---------- Buffer helpers (fix AAD & bytes) ---------- */
function asBytes(x: unknown): Uint8Array {
  if (x instanceof Uint8Array) return x;
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  if (ArrayBuffer.isView(x)) {
    const v = x as ArrayBufferView;
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }
  return new TextEncoder().encode(String(x ?? ""));
}
function ensureIv(iv?: ArrayBufferView | ArrayBuffer | Uint8Array): Uint8Array {
  if (iv) {
    const v = asBytes(iv);
    if (v.byteLength === 12) return v;
  }
  const iv12 = new Uint8Array(12);
  crypto.getRandomValues(iv12);
  return iv12;
}

/** ---------- WebCrypto helpers ---------- */
async function importAesKey(raw: Uint8Array, usages: KeyUsage[] = ["encrypt", "decrypt"]): Promise<CryptoKey> {
  return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, usages);
}
async function aesGcmEncrypt(
  keyBytes: Uint8Array,
  iv: Uint8Array | ArrayBufferView | ArrayBuffer,
  plaintext: Uint8Array | ArrayBufferView | ArrayBuffer,
  aad?: unknown
): Promise<Uint8Array> {
  const key = await importAesKey(asBytes(keyBytes));
  const nonce = ensureIv(iv);
  const data = asBytes(plaintext);
  const params: AesGcmParams = { name: "AES-GCM", iv: nonce, tagLength: 128 };
  const aadBytes = aad == null ? undefined : asBytes(aad);
  if (aadBytes && aadBytes.byteLength > 0) (params as any).additionalData = aadBytes;
  const ct = await crypto.subtle.encrypt(params, key, data);
  return new Uint8Array(ct);
}
async function aesGcmDecrypt(
  keyBytes: Uint8Array,
  iv: Uint8Array | ArrayBufferView | ArrayBuffer,
  ciphertext: Uint8Array | ArrayBufferView | ArrayBuffer,
  aad?: unknown
): Promise<Uint8Array> {
  const key = await importAesKey(asBytes(keyBytes));
  const nonce = ensureIv(iv);
  const data = asBytes(ciphertext);
  const params: AesGcmParams = { name: "AES-GCM", iv: nonce, tagLength: 128 };
  const aadBytes = aad == null ? undefined : asBytes(aad);
  if (aadBytes && aadBytes.byteLength > 0) (params as any).additionalData = aadBytes;
  const pt = await crypto.subtle.decrypt(params, key, data);
  return new Uint8Array(pt);
}

/** ---------- Envelope (wrap/unwrap) con AES-GCM ---------- */
async function wrapKey(rawToWrap: Uint8Array, kek: Uint8Array): Promise<{ wrapped: string; nonce: string }> {
  const nonce = ensureIv();
  const wrapped = await aesGcmEncrypt(kek, nonce, rawToWrap);
  return { wrapped: toBase64(wrapped), nonce: toBase64(nonce) };
}
async function unwrapKey(wrapped_b64: string, nonce_b64: string, kek: Uint8Array): Promise<Uint8Array> {
  const ct = fromBase64Safe(wrapped_b64);
  const iv = fromBase64Safe(nonce_b64);
  return await aesGcmDecrypt(kek, iv, ct);
}

/** ---------- KDF / HKDF / HMAC ---------- */
async function deriveKEK(passphrase: string, salt: Uint8Array, params: KdfParams): Promise<Uint8Array> {
  if (params.algo !== "pbkdf2") throw new Error("KDF non supportato: usa pbkdf2");
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: params.iterations, hash: params.hash },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}
async function hmacSha256(keyBytes: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, msg);
  return new Uint8Array(sig);
}
function canonicalizeForBI(input: string): Uint8Array {
  const s = input.trim().toLowerCase().normalize("NFKC");
  return new TextEncoder().encode(s);
}

// Singleton globale per evitare che si ricrei tra pagine
let globalCryptoInstance: CryptoService | null = null;

/** ---------- CryptoService ---------- */
export class CryptoService {
  private sb: SupabaseClient;
  private accountId: string | null;
  private MK: Uint8Array | null = null; // Master Key
  private kekSalt?: Uint8Array;
  private kdfParams?: KdfParams;
  private wrappedMkNonce?: string;
  private scopeCache: Record<string, ScopeKeys> = {};

constructor(sb?: SupabaseClient, accountId: string | null = null) {
  this.sb =
    sb ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  this.accountId = accountId;
  
  // Se esiste già un'istanza globale sbloccata, copia il suo stato
  if (globalCryptoInstance && globalCryptoInstance.MK) {
    this.MK = globalCryptoInstance.MK;
    this.kekSalt = globalCryptoInstance.kekSalt;
    this.kdfParams = globalCryptoInstance.kdfParams;
    this.wrappedMkNonce = globalCryptoInstance.wrappedMkNonce;
    this.scopeCache = globalCryptoInstance.scopeCache;
  }
  // Salva questa istanza come globale
  globalCryptoInstance = this;
} 
  public isUnlocked(): boolean {
  return this.MK !== null;
}
  private async getUserId(): Promise<string> {
    const { data, error } = await this.sb.auth.getUser();
    if (error || !data.user) throw new Error("Utente non autenticato");
    return data.user.id;
  }

  /** 1) Sblocco con passphrase */
  public async unlockWithPassphrase(passphrase: string): Promise<void> {
    console.log('🔐 [DEBUG] === INIZIO unlockWithPassphrase ===');
    
    const userId = await this.getUserId();
    console.log('🔐 [DEBUG] UserID:', userId);
    
    const { data: prof, error } = await this.sb
      .from("profiles")
      .select("wrapped_master_key, wrapped_master_key_iv, kdf_salt, kdf_params")
      .eq("id", userId)
      .single();
    
    if (error) {
      console.error('🔐 [DEBUG] ERRORE query profilo:', error);
      throw new Error("Profilo non trovato o accesso negato");
    }

    const p = prof as unknown as ProfileRow;
    console.log('🔐 [DEBUG] Stato profilo dal DB:', {
      has_mk: p.wrapped_master_key !== null,
      has_iv: p.wrapped_master_key_iv !== null,
      has_salt: p.kdf_salt !== null,
      kdf_params: p.kdf_params
    });

    const kdfParams: KdfParams = p.kdf_params ?? { algo: "pbkdf2", iterations: 310_000, hash: "SHA-256" };
    const salt: Uint8Array = p.kdf_salt ? fromBase64Safe(p.kdf_salt) : crypto.getRandomValues(new Uint8Array(16));
    console.log('🔐 [DEBUG] KDF params:', kdfParams);
    console.log('🔐 [DEBUG] Salt:', salt.length, 'bytes');

    const KEK = await deriveKEK(passphrase, salt, kdfParams);
    console.log('🔐 [DEBUG] KEK derivata:', KEK.length, 'bytes');

    if (p.wrapped_master_key) {
      console.log('🔐 [DEBUG] Entrando in branch UNWRAP MK esistente');
      const ivB64 = p.wrapped_master_key_iv;
      if (!ivB64) throw new Error("Manca 'wrapped_master_key_iv' in profiles");
      
      console.log('🔐 [DEBUG] Tentativo unwrap MK...');
      try {
        this.MK = await unwrapKey(p.wrapped_master_key, ivB64, KEK);
        console.log('🔐 [DEBUG] UNWRAP SUCCESSO! MK:', this.MK?.length, 'bytes');
        this.kekSalt = salt;
        this.kdfParams = kdfParams;
        this.wrappedMkNonce = ivB64;
        console.log('🔐 [DEBUG] === FINE unlockWithPassphrase (SUCCESSO) ===');
        return;
      } catch (unwrapError) {
        console.error('🔐 [DEBUG] ERRORE durante unwrap:', unwrapError);
        console.log('🔐 [DEBUG] === FINE unlockWithPassphrase (ERRORE) ===');
        throw unwrapError;
      }
    }


  /* console.log('🔐 [DEBUG] Entrando in branch GENERAZIONE nuova MK - DISABILITATA');
  // NON generare MK, lascia tutti i campi NULL
  this.MK = new Uint8Array(32); // MK vuota per testing
  console.log('🔐 [DEBUG] MK impostata come vuota per testing');
  console.log('🔐 [DEBUG] === FINE unlockWithPassphrase (SUCCESSO FORZATO) ===');
  return; */
    
     // 👇 Generazione nuova MK
    console.log('🔐 [DEBUG] Entrando in branch GENERAZIONE nuova MK');
    const MK = crypto.getRandomValues(new Uint8Array(32));
    console.log('🔐 [DEBUG] Nuova MK generata:', MK.length, 'bytes');
    
     const { wrapped, nonce } = await wrapKey(MK, KEK);
     console.log('🔐 [DEBUG] MK wrappata, tentativo salvataggio nel database...');

     const { error: upErr } = await this.sb
       .from("profiles")
       .update({
         wrapped_master_key: wrapped,
         wrapped_master_key_iv: nonce,
         kdf_salt: toBase64(salt),
         kdf_params: kdfParams,
       })
       .eq("id", userId);
       console.log('🔐 [DEBUG] Risultato UPDATE MK:', { error: upErr, hasError: !!upErr });

     if (upErr) {
       console.error('🔐 [DEBUG] ERRORE durante salvataggio MK:', upErr);
       console.log('🔐 [DEBUG] === FINE unlockWithPassphrase (ERRORE) ===');
       throw upErr;
     }

     console.log('🔐 [DEBUG] MK salvata con successo, impostando stato interno...');
     this.MK = MK;
     this.kekSalt = salt;
     this.kdfParams = kdfParams;
     this.wrappedMkNonce = nonce;
    // Aggiorna il singleton globale
    globalCryptoInstance = this;
     console.log('🔐 [DEBUG] === FINE unlockWithPassphrase (SUCCESSO) ==='); 
  } 

  /** 2) Chiavi per scope (DEK/BI) — **per-utente** */
  public async getOrCreateScopeKeys(scope: string): Promise<void> {
    if (!this.MK) throw new Error("Cifratura non sbloccata");
    if (this.scopeCache[scope]) return;

    const user_id = await this.getUserId();

    // ✅ CERCA SOLO LE CHIAVI DELL'UTENTE CORRENTE
    // ⚠️ IMPORTANTE: prende la chiave PIÙ VECCHIA (ascending: true) perché i dati legacy
    // sono stati cifrati con la prima chiave creata, non con l'ultima!
    const { data: row, error } = await this.sb
      .from("encryption_keys")
      .select("id, user_id, scope, dek_wrapped, dek_wrapped_iv, bi_wrapped, bi_wrapped_iv, created_at")
      .eq("user_id", user_id)
      .eq("scope", scope)
      .order("created_at", { ascending: true })  // ✅ PIÙ VECCHIA = prima usata
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (row) {
      const r = row as EncryptionRow;
      const DEK = await unwrapKey(r.dek_wrapped, r.dek_wrapped_iv, this.MK);
      const BI = r.bi_wrapped ? await unwrapKey(r.bi_wrapped, r.bi_wrapped_iv!, this.MK) : null;
      this.scopeCache[scope] = { DEK, BI };
      return;
    }

    // genera nuove per QUESTO utente
    const DEK = crypto.getRandomValues(new Uint8Array(32));
    const BI  = crypto.getRandomValues(new Uint8Array(32));

    const { wrapped: dek_wrapped, nonce: dek_wrapped_iv } = await wrapKey(DEK, this.MK);
    const { wrapped: bi_wrapped,  nonce: bi_wrapped_iv  } = await wrapKey(BI,  this.MK);

// Calcola un fingerprint dalla MK
const mkHash = await crypto.subtle.digest('SHA-256', this.MK!);
const kek_fingerprint = toBase64(new Uint8Array(mkHash)).substring(0, 16);
    
const { error: insErr } = await this.sb
  .from("encryption_keys")
  .upsert(
    { user_id, scope, dek_wrapped, dek_wrapped_iv, bi_wrapped, bi_wrapped_iv, kek_fingerprint },
    { onConflict: "user_id,scope", ignoreDuplicates: true }
  );

// accetta i “duplicati” come OK: niente eccezione nei casi di conflitto
if (insErr && insErr.code !== "23505" && insErr.code !== "409") throw insErr;


    this.scopeCache[scope] = { DEK, BI };
  }

  /** 3) Encrypt/Decrypt JSON */
  public async encryptJSON(scope: string, table: string, field: string, recordId: string, obj: any) {
    if (!this.scopeCache[scope]) throw new Error(`Scope non inizializzato: ${scope}`);
    const { DEK } = this.scopeCache[scope];
    const nonce = ensureIv();
    const aad = asBytes(`${table}|${field}|${recordId}`);
    const plaintext = asBytes(JSON.stringify(obj));
    const ciphertext = await aesGcmEncrypt(DEK, nonce, plaintext, aad);
    return { enc_b64: toBase64(ciphertext), iv_b64: toBase64(nonce) };
  }
public async decryptJSON(
  scope: string,
  table: string,
  field: string,
  recordId: string,
  enc_b64: string,
  iv_b64: string
) {
  // 🔧 DEV-compat: se l’“encrypted” è in realtà testo "enc(...)" (anche se arrivato in HEX/BASE64),
  // estrai e ritorna subito, senza richiedere chiavi o AES-GCM.
  try {
    const encBytes = fromBase64Safe(enc_b64);             // accetta sia base64 che \xHEX
    const asStr = new TextDecoder().decode(encBytes);     // prova a leggerlo come stringa
    if (asStr.startsWith("enc(") && asStr.endsWith(")")) {
      return asStr.slice(4, -1);                          // contenuto tra le parentesi
    }
  } catch {
    // ignora: se fallisce, prosegui con il percorso normale AES-GCM
  }

  // 🔐 percorso normale AES-GCM con FALLBACK AAD per dati legacy
  if (!this.scopeCache[scope]) throw new Error(`Scope non inizializzato: ${scope}`);
  const { DEK } = this.scopeCache[scope];
  
  // Prova 3 formati AAD in ordine (per compatibilità con dati vecchi)
  const aadFormats = [
    `${table}|${field}|${recordId}`,  // Formato attuale
    `${table}|${field}`,               // Formato legacy senza recordId
    '',                                 // Nessun AAD (formato molto vecchio)
  ];
  
  const ivBytes = fromBase64Safe(iv_b64);
  const encBytes = fromBase64Safe(enc_b64);
  
  for (let i = 0; i < aadFormats.length; i++) {
    try {
      const aad = aadFormats[i] ? asBytes(aadFormats[i]) : undefined;
      const plaintext = await aesGcmDecrypt(DEK, ivBytes, encBytes, aad);
      
      // Se arriviamo qui, la decriptazione ha avuto successo
      if (i > 0) {
        console.warn(`⚠️ [CryptoService] Decriptato con AAD legacy (formato ${i}): ${aadFormats[i] || 'vuoto'}`);
      }
      
      return JSON.parse(new TextDecoder().decode(plaintext));
    } catch (error) {
      // Se non è l'ultimo tentativo, continua a provare
      if (i < aadFormats.length - 1) {
        continue;
      }
      // Ultimo tentativo fallito, lancia l'errore originale
      throw error;
    }
  }
  
  // Non dovrebbe mai arrivare qui, ma per sicurezza
  throw new Error('Decriptazione fallita con tutti i formati AAD');
}

  /** 4) Blind Index (uguaglianza) */
  public async computeBlindIndex(scope: string, value: string): Promise<string> {
    if (!this.scopeCache[scope]) throw new Error(`Scope non inizializzato: ${scope}`);
    const { BI } = this.scopeCache[scope];
    if (!BI) throw new Error(`BI non configurato per scope: ${scope}`);
    const canon = canonicalizeForBI(value);
    const mac = await hmacSha256(BI, canon);
    return toBase64(mac);
  }

  /** 5) Helpers multipli (campi *_enc / *_iv)
   *  Compat: supporta SIA (row + fieldNames[]) SIA (mappa { field: {enc, iv} })
   */

// Dentro la tua classe CryptoService

    public async encryptFields(
      scope: string,
      table: string,
      recordId: string | null,
      fields: Record<string, string | null | undefined>
    ) {
      const out: Record<string, unknown> = {};
      const rowId = recordId ?? ""; // se non lo hai ancora, passa stringa vuota (ma meglio passarlo quando possibile)
    
      for (const [field, val] of Object.entries(fields)) {
        if (val == null) continue;
        const { enc_b64, iv_b64 } = await this.encryptJSON(scope, table, field, rowId, val);
        out[`${field}_enc`] = enc_b64;
        out[`${field}_iv`]  = iv_b64;
      }
      return out;
    }
    
      public async decryptFields<T extends Record<string, unknown> = Record<string, unknown>>(
        scope: string,
        table: string,
        recordId: string | null,
        rowOrMap: Record<string, unknown>,
        fieldNames?: string[]
      ) {
        const out: Record<string, string | null> = {};
        const row = rowOrMap ?? {};
        const rowId = recordId ?? "";
      
        // Se non passi i nomi, li deduco dai *_enc presenti nella riga
        const fields: string[] = fieldNames ?? Object.keys(row)
          .filter((k) => k.endsWith("_enc"))
          .map((k) => k.slice(0, -4));
      
        for (const field of fields) {
          const enc_b64 = row[`${field}_enc`] as string | undefined;
          const iv_b64  = row[`${field}_iv`]  as string | undefined;
      
          if (!enc_b64 || !iv_b64) {
            out[field] = null; // campo mancante o non cifrato
            continue;
          }
      
          try {
            const plain = await this.decryptJSON(scope, table, field, rowId, enc_b64, iv_b64);
            out[field] = typeof plain === "string" ? plain : JSON.stringify(plain);
          } catch (err) {
            console.error(`❌ [CryptoService] decryptJSON FAILED for field "${field}":`, err);
            console.error(`❌ [CryptoService] Error message:`, (err as Error).message);
            console.error(`❌ [CryptoService] Stack:`, (err as Error).stack);
            console.error(`❌ [CryptoService] enc_b64 (first 50):`, enc_b64?.substring(0, 50));
            console.error(`❌ [CryptoService] iv_b64 (first 50):`, iv_b64?.substring(0, 50));
            out[field] = null; // errore decifratura → campo nullo
          }
        }
      
        return out as unknown as T;
      }


  /** 6) Cambio passphrase */
  public async rewrapMasterKey(newPassphrase: string): Promise<void> {
    if (!this.MK) throw new Error("Cifratura non sbloccata");
    const userId = await this.getUserId();
    const newSalt = crypto.getRandomValues(new Uint8Array(16));
    const newParams: KdfParams = { algo: "pbkdf2", iterations: 310_000, hash: "SHA-256" };
    const newKEK = await deriveKEK(newPassphrase, newSalt, newParams);
    const { wrapped, nonce } = await wrapKey(this.MK, newKEK);
    const { error } = await this.sb
      .from("profiles")
      .update({
        wrapped_master_key: wrapped,
        wrapped_master_key_iv: nonce,
        kdf_salt: toBase64(newSalt),
        kdf_params: newParams,
      })
      .eq("id", userId);
    if (error) throw error;
    this.kekSalt = newSalt;
    this.kdfParams = newParams;
    this.wrappedMkNonce = nonce;
  }
}
