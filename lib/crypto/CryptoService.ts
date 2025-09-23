
"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------- tipi ----------
type KdfParams =
  | { algo: "pbkdf2"; iterations: number; hash: "SHA-256" }
  // estendibile: { algo: "scrypt"; N:number; r:number; p:number }
  ;

type ScopeKeys = {
  DEK: Uint8Array;     // Data-Encryption Key (32B)
  BI: Uint8Array | null; // Blind Index key (opzionale, 32B)
};

type ProfileRow = {
  wrapped_master_key: string | null; // bytea (base64)
  kdf_salt: string | null;           // bytea (base64)
  kdf_params: KdfParams | null;
};

// ---------- util byte/base64 ----------
function toBase64(u8: Uint8Array): string {
  if (typeof window === "undefined") return Buffer.from(u8).toString("base64");
  let s = "";
  u8.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}
function fromBase64(b64: string): Uint8Array {
  if (!b64) return new Uint8Array();
  if (typeof window === "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// ---------- WebCrypto helpers ----------
async function importAesKey(raw: Uint8Array, usages: KeyUsage[] = ["encrypt", "decrypt"]): Promise<CryptoKey> {
  return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, usages);
}
async function aesGcmEncrypt(keyBytes: Uint8Array, nonce: Uint8Array, plaintext: Uint8Array, aad?: Uint8Array): Promise<Uint8Array> {
  const key = await importAesKey(keyBytes);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, additionalData: aad, tagLength: 128 },
    key,
    plaintext
  );
  return new Uint8Array(ct); // ciphertext || tag
}
async function aesGcmDecrypt(keyBytes: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array, aad?: Uint8Array): Promise<Uint8Array> {
  const key = await importAesKey(keyBytes);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce, additionalData: aad, tagLength: 128 },
    key,
    ciphertext
  );
  return new Uint8Array(pt);
}

// “Wrap”/“unwrap” generici (usiamo AES-GCM per avvolgere bytes)
async function wrapKey(rawToWrap: Uint8Array, kek: Uint8Array): Promise<{ wrapped: string; nonce: string }> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await aesGcmEncrypt(kek, nonce, rawToWrap);
  return { wrapped: toBase64(wrapped), nonce: toBase64(nonce) };
}
async function unwrapKey(wrapped_b64: string, nonce_b64: string, kek: Uint8Array): Promise<Uint8Array> {
  const ct = fromBase64(wrapped_b64);
  const iv = fromBase64(nonce_b64);
  return await aesGcmDecrypt(kek, iv, ct);
}

// PBKDF2 (WebCrypto native)
async function deriveKEK(passphrase: string, salt: Uint8Array, params: KdfParams): Promise<Uint8Array> {
  if (params.algo !== "pbkdf2") {
    throw new Error("KDF non supportato su WebCrypto: usa pbkdf2");
  }
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: params.iterations, hash: params.hash },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

// HKDF helper (se ti serve derivare sotto-chiavi dalla MK)
async function hkdfExtractAndExpand(ikm: Uint8Array, info: string, length = 32): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: new TextEncoder().encode(info) },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

// HMAC-SHA256 (per Blind Index)
async function hmacSha256(keyBytes: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, msg);
  return new Uint8Array(sig);
}

function canonicalizeForBI(input: string): Uint8Array {
  const s = input.trim().toLowerCase().normalize("NFKC");
  return new TextEncoder().encode(s);
}

// ---------- CryptoService ----------
export class CryptoService {
  private sb: SupabaseClient;
  private accountId: string | null; // multi-tenant, se ti serve in futuro
  private MK: Uint8Array | null = null; // Master Key in memoria (mai persistita in chiaro)
  private kekSalt?: Uint8Array;
  private kdfParams?: KdfParams;
  private wrappedMkNonce?: string; // per eventuale rotazione
  private scopeCache: Record<string, ScopeKeys> = {};

  constructor(sb?: SupabaseClient, accountId: string | null = null) {
    this.sb =
      sb ??
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    this.accountId = accountId;
  }

  // -- helper user id
  private async getUserId(): Promise<string> {
    const { data, error } = await this.sb.auth.getUser();
    if (error || !data.user) throw new Error("Utente non autenticato");
    return data.user.id;
  }

  // ========== 1) Sblocco con passphrase (1 pw → KEK → MK) ==========
  public async unlockWithPassphrase(passphrase: string): Promise<void> {
    const userId = await this.getUserId();

    const { data: prof, error } = await this.sb
      .from("profiles")
      .select(
        "wrapped_master_key, wrapped_master_key_iv, kdf_salt, kdf_params"
      ) // NB: aggiungiamo colonna iv per la MK (se non esiste, gestiamo fallback)
      .eq("id", userId)
      .single();

    if (error) throw new Error("Profilo non trovato o accesso negato");

    const p = (prof as any) as (ProfileRow & { wrapped_master_key_iv?: string | null });

    // Se non esistono parametri KDF, prima inizializzazione
    let kdfParams: KdfParams = p.kdf_params ?? { algo: "pbkdf2", iterations: 310_000, hash: "SHA-256" };
    let salt: Uint8Array = p.kdf_salt ? fromBase64(p.kdf_salt) : crypto.getRandomValues(new Uint8Array(16));
    const KEK = await deriveKEK(passphrase, salt, kdfParams);

    // Se MK già presente → unwrap
    if (p.wrapped_master_key) {
      // se non abbiamo salvato l'IV a parte, assumiamo iv zero? Meglio salvarlo.
      // Aggiungiamo campo 'wrapped_master_key_iv' in profiles, se non presente mettiamo errore esplicito
      const ivB64 = (p as any).wrapped_master_key_iv;
      if (!ivB64) {
        throw new Error("Manca IV per la chiave master wrappata: aggiungi colonna 'wrapped_master_key_iv bytea' in profiles");
      }
      const MK = await unwrapKey(p.wrapped_master_key, ivB64, KEK);
      this.MK = MK;
      this.kekSalt = salt;
      this.kdfParams = kdfParams;
      this.wrappedMkNonce = ivB64;
      return;
    }

    // Altrimenti prima volta: genera MK e salvala wrappata
    const MK = crypto.getRandomValues(new Uint8Array(32));
    const { wrapped, nonce } = await wrapKey(MK, KEK);

    // persistiamo tutto in profiles
    const { error: upErr } = await this.sb
      .from("profiles")
      .update({
        wrapped_master_key: wrapped,
        wrapped_master_key_iv: nonce,     // <-- aggiungi questa colonna bytea in SQL se manca
        kdf_salt: toBase64(salt),
        kdf_params: kdfParams
      })
      .eq("id", userId);
    if (upErr) throw upErr;

    this.MK = MK;
    this.kekSalt = salt;
    this.kdfParams = kdfParams;
    this.wrappedMkNonce = nonce;
  }

  // ========== 2) Chiavi per scope (DEK/BI) ==========
  public async getOrCreateScopeKeys(scope: string): Promise<void> {
    if (!this.MK) throw new Error("Cifratura non sbloccata");
    if (this.scopeCache[scope]) return;

    const { data: row, error } = await this.sb
      .from("encryption_keys")
      .select("id, dek_wrapped, dek_wrapped_iv, bi_wrapped, bi_wrapped_iv, scope")
      .eq("scope", scope)
      .maybeSingle();

    if (error) throw error;

    if (row) {
      const DEK = await unwrapKey(row.dek_wrapped, row.dek_wrapped_iv, this.MK);
      const BI = row.bi_wrapped ? await unwrapKey(row.bi_wrapped, row.bi_wrapped_iv, this.MK) : null;
      this.scopeCache[scope] = { DEK, BI };
      return;
    }

    // genera chiavi nuove
    const DEK = crypto.getRandomValues(new Uint8Array(32));
    const BI  = crypto.getRandomValues(new Uint8Array(32)); // se non vuoi BI per quello scope, metti null

    const { wrapped: dek_wrapped, nonce: dek_wrapped_iv } = await wrapKey(DEK, this.MK);
    const { wrapped: bi_wrapped,  nonce: bi_wrapped_iv  } = await wrapKey(BI,  this.MK);

    const { error: insErr } = await this.sb
      .from("encryption_keys")
      .insert({
        scope,
        dek_wrapped,
        dek_wrapped_iv,
        bi_wrapped,
        bi_wrapped_iv
      });
    if (insErr) throw insErr;

    this.scopeCache[scope] = { DEK, BI };
  }

  // ========== 3) Encrypt / Decrypt campo/record ==========
  public async encryptJSON(scope: string, table: string, field: string, recordId: string, obj: any): Promise<{ enc_b64: string; iv_b64: string }> {
    if (!this.scopeCache[scope]) throw new Error(`Scope non inizializzato: ${scope}`);
    const { DEK } = this.scopeCache[scope];
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const aad = new TextEncoder().encode(`${table}|${field}|${recordId}`);
    const plaintext = new TextEncoder().encode(JSON.stringify(obj));
    const ciphertext = await aesGcmEncrypt(DEK, nonce, plaintext, aad);
    return { enc_b64: toBase64(ciphertext), iv_b64: toBase64(nonce) };
  }

  public async decryptJSON(scope: string, table: string, field: string, recordId: string, enc_b64: string, iv_b64: string): Promise<any> {
    if (!this.scopeCache[scope]) throw new Error(`Scope non inizializzato: ${scope}`);
    const { DEK } = this.scopeCache[scope];
    const aad = new TextEncoder().encode(`${table}|${field}|${recordId}`);
    const plaintext = await aesGcmDecrypt(DEK, fromBase64(iv_b64), fromBase64(enc_b64), aad);
    return JSON.parse(new TextDecoder().decode(plaintext));
  }

  // ========== 4) Blind Index (uguaglianza) ==========
  public async computeBlindIndex(scope: string, value: string): Promise<string> {
    if (!this.scopeCache[scope]) throw new Error(`Scope non inizializzato: ${scope}`);
    const { BI } = this.scopeCache[scope];
    if (!BI) throw new Error(`BI non configurato per scope: ${scope}`);
    const canon = canonicalizeForBI(value);
    const mac = await hmacSha256(BI, canon);
    return toBase64(mac); // salva in colonna *_bi (bytea)
  }

  // ========== 5) Cambio passphrase (re-wrap MK) ==========
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
        kdf_params: newParams
      })
      .eq("id", userId);

    if (error) throw error;

    this.kekSalt = newSalt;
    this.kdfParams = newParams;
    this.wrappedMkNonce = nonce;
  }
}


