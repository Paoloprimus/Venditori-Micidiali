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

/** ---------- Utils byte/base64 ---------- */
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

/** ---------- Buffer helpers (fix AAD) ---------- */
function asBufferView(a: any): ArrayBufferView | undefined {
  if (a == null) return undefined;
  if (a instanceof Uint8Array) return a;
  if (ArrayBuffer.isView(a)) return a as ArrayBufferView;
  if (a instanceof ArrayBuffer) return new Uint8Array(a);
  if (typeof a === "string") return new TextEncoder().encode(a);
  try { return new Uint8Array(a); } catch { return undefined; }
}

/** ---------- WebCrypto helpers ---------- */
async function importAesKey(raw: Uint8Array, usages: KeyUsage[] = ["encrypt", "decrypt"]): Promise<CryptoKey> {
  return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, usages);
}
async function aesGcmEncrypt(
  keyBytes: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
  aad?: any
): Promise<Uint8Array> {
  const key = await importAesKey(keyBytes);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, additionalData: asBufferView(aad), tagLength: 128 },
    key,
    plaintext
  );
  return new Uint8Array(ct); // ciphertext || tag
}
async function aesGcmDecrypt(
  keyBytes: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  aad?: any
): Promise<Uint8Array> {
  const key = await importAesKey(keyBytes);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce, additionalData: asBufferView(aad), tagLength: 128 },
    key,
    ciphertext
  );
  return new Uint8Array(pt);
}

/** ---------- Envelope (wrap/unwrap) con AES-GCM ---------- */
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
async function hkdfExtractAndExpand(ikm: Uint8Array, info: string, length = 32): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: new TextEncoder().encode(info) },
    key,
    length * 8
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

/** ---------- CryptoService ---------- */
export class CryptoService {
  private sb: SupabaseClient;
  private accountId: string | null;
  private MK: Uint8Array | null = null; // Master Key in memoria
  private kekSalt?: Uint8Array;
  private kdfParams?: KdfParams;
  private wrappedMkNonce?: string; // IV usato per wrappare MK
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

  /** User id corrente (Auth) */
  private async getUserId(): Promise<string> {
    const { data, error } = await this.sb.auth.getUser();
    if (error || !data.user) throw new Error("Utente non autenticato");
    return data.user.id;
  }

  /** ========== 1) Sblocco con passphrase (1 pw → KEK → MK) ========== */
  public async unlockWithPassphrase(passphrase: string): Promise<void> {
    const userId = await this.getUserId();

    const { data: prof, error } = await this.sb
      .from("profiles")
      .select("wrapped_master_key, wrapped_master_key_iv, kdf_salt, kdf_params")
      .eq("id", userId)
      .single();

    if (error) throw new Error("Profilo non trovato o accesso negato");

    const p = (prof as unknown) as ProfileRow;

    // Parametri KDF & salt (se mancanti li inizializziamo)
    const kdfParams: KdfParams = p.kdf_params ?? { algo: "pbkdf2", iterations: 310_000, hash: "SHA-256" };
    const salt: Uint8Array = p.kdf_salt ? fromBase64(p.kdf_salt) : crypto.getRandomValues(new Uint8Array(16));
    const KEK = await deriveKEK(passphrase, salt, kdfParams);

    if (p.wrapped_master_key) {
      const ivB64 = p.wrapped_master_key_iv;
      if (!ivB64) throw new Error("Manca 'wrapped_master_key_iv' in profiles");
      this.MK = await unwrapKey(p.wrapped_master_key, ivB64, KEK);
      this.kekSalt = salt;
      this.kdfParams = kdfParams;
      this.wrappedMkNonce = ivB64;
      return;
    }

    // Prima volta: genera MK e salvala wrappata
    const MK = crypto.getRandomValues(new Uint8Array(32));
    const { wrapped, nonce } = await wrapKey(MK, KEK);

    const { error: upErr } = await this.sb
      .from("profiles")
      .update({
        wrapped_master_key: wrapped,
        wrapped_master_key_iv: nonce,
        kdf_salt: toBase64(salt),
        kdf_params: kdfParams,
      })
      .eq("id", userId);
    if (upErr) throw upErr;

    this.MK = MK;
    this.kekSalt = salt;
    this.kdfParams = kdfParams;
    this.wrappedMkNonce = nonce;
  }

  /** ========== 2) Chiavi per scope (DEK/BI) ========== */
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
    const BI  = crypto.getRandomValues(new Uint8Array(32)); // se non vuoi BI su questo scope, usa null

    const { wrapped: dek_wrapped, nonce: dek_wrapped_iv } = await wrapKey(DEK, this.MK);
    const { wrapped: bi_wrapped,  nonce: bi_wrapped_iv  } = await wrapKey(BI,  this.MK);

    const { error: insErr } = await this.sb
      .from("encryption_keys")
      .insert({ scope, dek_wrapped, dek_wrapped_iv, bi_wrapped, bi_wrapped_iv });
    if (insErr) throw insErr;

    this.scopeCache[scope] = { DEK, BI };
  }

  /** ========== 3) Encrypt / Decrypt campo/record (JSON) ========== */
  public async encryptJSON(
    scope: string, table: string, field: string, recordId: string, obj: any
  ): Promise<{ enc_b64: string; iv_b64: string }> {
    if (!this.scopeCache[scope]) throw new Error(`Scope non inizializzato: ${scope}`);
    const { DEK } = this.scopeCache[scope];
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const aad = new TextEncoder().encode(`${table}|${field}|${recordId}`);
    const plaintext = new TextEncoder().encode(JSON.stringify(obj));
    const ciphertext = await aesGcmEncrypt(DEK, nonce, plaintext, aad); // aad sempre BufferView
    return { enc_b64: toBase64(ciphertext), iv_b64: toBase64(nonce) };
  }

  public async decryptJSON(
    scope: string, table: string, field: string, recordId: string, enc_b64: string, iv_b64: string
  ): Promise<any> {
    if (!this.scopeCache[scope]) throw new Error(`Scope non inizializzato: ${scope}`);
    const { DEK } = this.scopeCache[scope];
    const aad = new TextEncoder().encode(`${table}|${field}|${recordId}`);
    const plaintext = await aesGcmDecrypt(DEK, fromBase64(iv_b64), fromBase64(enc_b64), aad); // aad sempre BufferView
    return JSON.parse(new TextDecoder().decode(plaintext));
  }

  /** ========== 4) Blind Index (uguaglianza) ========== */
  public async computeBlindIndex(scope: string, value: string): Promise<string> {
    if (!this.scopeCache[scope]) throw new Error(`Scope non inizializzato: ${scope}`);
    const { BI } = this.scopeCache[scope];
    if (!BI) throw new Error(`BI non configurato per scope: ${scope}`);
    const canon = canonicalizeForBI(value);
    const mac = await hmacSha256(BI, canon);
    return toBase64(mac); // salva in colonna *_bi (bytea)
  }

  /** ========== 5) Helpers multipli (campi *_enc / *_iv) ========== */
  public async encryptFields(
    scope: string,
    table: string,
    recordId: string | null,
    fields: Record<string, string | null | undefined>
  ): Promise<Record<string, any>> {
    const out: Record<string, any> = {};
    for (const [field, val] of Object.entries(fields)) {
      if (val == null) continue;
      const { enc_b64, iv_b64 } = await this.encryptJSON(scope, table, field, recordId ?? "", val);
      out[`${field}_enc`] = enc_b64;
      out[`${field}_iv`] = iv_b64;
      // Nota: in WebCrypto il tag GCM è dentro al ciphertext → *_tag non serve
    }
    return out;
  }

  public async decryptFields(
    scope: string,
    table: string,
    recordId: string | null,
    row: any,
    fieldNames: string[]
  ): Promise<Record<string, string | null>> {
    const out: Record<string, string | null> = {};
    for (const field of fieldNames) {
      const enc = row?.[`${field}_enc`];
      const iv  = row?.[`${field}_iv`];
      if (!enc || !iv) { out[field] = null; continue; }
      out[field] = await this.decryptJSON(scope, table, field, recordId ?? "", enc, iv);
    }
    return out;
  }

  /** ========== 6) Cambio passphrase (re-wrap MK) ========== */
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
