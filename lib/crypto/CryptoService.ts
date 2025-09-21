// /lib/crypto/CryptoService.ts
// Client-side Field-Level Encryption for Repping (AES-GCM + HKDF + HMAC BI)
// - KEK from passphrase (PBKDF2) — stays on device
// - DEK per scope (e.g., "table:accounts") — wrapped with KEK and saved in public.encryption_keys
// - Blind Index: HMAC-SHA-256 over normalized value using a BI key derived from DEK (HKDF)

import type { SupabaseClient } from "@supabase/supabase-js";

/** ---------- tiny utils ---------- */

const te = new TextEncoder();
const td = new TextDecoder();

function toB64(u8: Uint8Array): string {
  // URL-safe base64
  const str = btoa(String.fromCharCode(...u8));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function sha256(u8: Uint8Array): Promise<Uint8Array> {
  const d = await crypto.subtle.digest("SHA-256", u8);
  return new Uint8Array(d);
}
function normalizeBI(value: string): string {
  return value.trim().toLowerCase(); // puoi aggiungere normalizzazione Unicode NFC se serve
}
function concatU8(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** ---------- key derivation ---------- */

async function importRawAesKey(raw: Uint8Array, usages: KeyUsage[] = ["encrypt","decrypt"]) {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", true, usages);
}

async function deriveKekFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  // PBKDF2 (nativo WebCrypto). Iter elevati per sicurezza.
  const base = await crypto.subtle.importKey("raw", te.encode(passphrase), "PBKDF2", false, ["deriveKey","deriveBits"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt","decrypt"]
  );
}

async function hkdfBytes(keyMaterial: CryptoKey, info: string, length: number): Promise<Uint8Array> {
  // WebCrypto HKDF requires "deriveBits" with a base key of type "HKDF"
  // We convert the AES key raw to use as HKDF IKM
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", keyMaterial));
  const ikm = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: te.encode(info) },
    ikm,
    length * 8
  );
  return new Uint8Array(bits);
}

/** ---------- envelope (wrap/unwrap) ---------- */

async function wrapRawWithKEK(kek: CryptoKey, raw: Uint8Array): Promise<{ wrapped: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, kek, raw));
  return { wrapped, iv };
}
async function unwrapRawWithKEK(kek: CryptoKey, wrapped: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const raw = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, kek, wrapped));
  return raw;
}

/** ---------- BI (HMAC) ---------- */

async function importHmacKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function hmacSha256(key: CryptoKey, payload: Uint8Array): Promise<Uint8Array> {
  const mac = await crypto.subtle.sign("HMAC", key, payload);
  return new Uint8Array(mac);
}

/** ---------- types ---------- */

type KeyRow = {
  id: string;
  account_id: string | null;
  scope: string;
  dek_wrapped: string; // b64
  dek_iv: string;      // b64
  kek_fingerprint: string; // b64 (first 16 bytes of SHA-256(KEK raw))
  key_bi_wrapped: string | null; // b64
  key_bi_iv: string | null;      // b64
};

type EncryptResult = {
  ciphertext_b64: string;
  iv_b64: string;
  // tag is implicit in AES-GCM ciphertext (WebCrypto appends it). We store entire ct into *_enc.
};

/** ---------- main service ---------- */

export class CryptoService {
  private supabase: SupabaseClient;
  private accountId: string | null;
  private kek: CryptoKey | null = null;
  private kekSalt: Uint8Array | null = null;
  private kekFingerprint: string | null = null;

  // cache per scope
  private dekByScope: Map<string, CryptoKey> = new Map();
  private biKeyByScope: Map<string, CryptoKey> = new Map();

  constructor(supabase: SupabaseClient, accountId: string | null) {
    this.supabase = supabase;
    this.accountId = accountId;
  }

  /**
   * 1) Sblocca KEK dalla passphrase (o da credenziale/Passkey).
   *    Genera e memorizza un salt locale (localStorage) se assente.
   */
  async unlockWithPassphrase(passphrase: string) {
    const saltKey = "repping:kek_salt";
    let saltB64 = localStorage.getItem(saltKey);
    if (!saltB64) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      saltB64 = toB64(salt);
      localStorage.setItem(saltKey, saltB64);
    }
    const salt = fromB64(saltB64);
    this.kekSalt = salt;
    this.kek = await deriveKekFromPassphrase(passphrase, salt);

    // fingerprint (primi 16B di SHA-256(raw KEK)) per audit
    const kekRaw = new Uint8Array(await crypto.subtle.exportKey("raw", this.kek));
    const fp = await sha256(kekRaw);
    this.kekFingerprint = toB64(fp.slice(0, 16));
  }

  /**
   * 2) Ottiene (o crea) DEK e BI key per uno scope (es. "table:accounts").
   *    Salva/legge su public.encryption_keys.
   */
  async getOrCreateScopeKeys(scope: string) {
    if (!this.kek) throw new Error("KEK not unlocked");
    if (this.dekByScope.has(scope) && this.biKeyByScope.has(scope)) return;

    // prova a leggere da encryption_keys
    const { data, error } = await this.supabase
      .from("encryption_keys")
      .select("*")
      .eq("scope", scope)
      .eq("account_id", this.accountId ?? null)
      .single();

    if (!error && data) {
      // unwrap DEK
      const dekRaw = await unwrapRawWithKEK(this.kek, fromB64(data.dek_wrapped), fromB64(data.dek_iv));
      const dek = await importRawAesKey(dekRaw);
      this.dekByScope.set(scope, dek);

      // BI key: se non esiste, la deriviamo con HKDF dal DEK
      if (data.key_bi_wrapped && data.key_bi_iv) {
        const biRaw = await unwrapRawWithKEK(this.kek, fromB64(data.key_bi_wrapped), fromB64(data.key_bi_iv));
        const biKey = await importHmacKey(biRaw);
        this.biKeyByScope.set(scope, biKey);
      } else {
        const biRaw = await hkdfBytes(dek, `repping:bi:${scope}`, 32);
        const biKey = await importHmacKey(biRaw);
        this.biKeyByScope.set(scope, biKey);
      }

      return;
    }

    // non esistono -> crea nuove chiavi
    const dekRaw = crypto.getRandomValues(new Uint8Array(32));
    const dek = await importRawAesKey(dekRaw);
    const { wrapped: dekWrapped, iv: dekIv } = await wrapRawWithKEK(this.kek, dekRaw);

    // BI key separata (random) — opzionale. In alternativa usa HKDF da DEK.
    const biRaw = crypto.getRandomValues(new Uint8Array(32));
    const biKey = await importHmacKey(biRaw);
    const { wrapped: biWrapped, iv: biIv } = await wrapRawWithKEK(this.kek, biRaw);

    // persist
    const row = {
      account_id: this.accountId,
      scope,
      dek_wrapped: toB64(dekWrapped),
      dek_iv: toB64(dekIv),
      kek_fingerprint: this.kekFingerprint!,
      key_bi_wrapped: toB64(biWrapped),
      key_bi_iv: toB64(biIv),
    };
    const { error: upErr } = await this.supabase.from("encryption_keys").upsert(row, { onConflict: "account_id,scope" });
    if (upErr) throw upErr;

    this.dekByScope.set(scope, dek);
    this.biKeyByScope.set(scope, biKey);
  }

  /** 3) Cifra un campo (string) con AES-GCM + AAD (tabella, campo, recordId opzionale) */
  async encryptField(scope: string, table: string, field: string, plaintext: string, aadParts: (string | Uint8Array)[] = []): Promise<EncryptResult> {
    const dek = this.dekByScope.get(scope);
    if (!dek) throw new Error(`DEK not loaded for scope ${scope}`);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aad = concatU8(te.encode(scope), te.encode("|"), te.encode(table), te.encode("|"), te.encode(field), ...(aadParts.map(p => typeof p === "string" ? te.encode(p) : p)));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, dek, te.encode(plaintext)));
    return { ciphertext_b64: toB64(ct), iv_b64: toB64(iv) };
  }

  /** 4) Decifra un campo (string) con AES-GCM + AAD */
  async decryptField(scope: string, table: string, field: string, ciphertext_b64: string, iv_b64: string, aadParts: (string | Uint8Array)[] = []): Promise<string> {
    const dek = this.dekByScope.get(scope);
    if (!dek) throw new Error(`DEK not loaded for scope ${scope}`);

    const iv = fromB64(iv_b64);
    const aad = concatU8(te.encode(scope), te.encode("|"), te.encode(table), te.encode("|"), te.encode(field), ...(aadParts.map(p => typeof p === "string" ? te.encode(p) : p)));
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, dek, fromB64(ciphertext_b64));
    return td.decode(pt);
  }

  /** 5) Blind Index deterministico (troncato a 32B) */
  async blindIndex(scope: string, value: string): Promise<string> {
    const key = this.biKeyByScope.get(scope);
    if (!key) throw new Error(`BI key not loaded for scope ${scope}`);
    const mac = await hmacSha256(key, te.encode(normalizeBI(value)));
    // tronchiamo a 32 bytes per risparmiare spazio (va bene per equality)
    return toB64(mac.slice(0, 32));
  }

  /** Helpers: comode per mappe di campi */
  async encryptFields(
    scope: string,
    table: string,
    recordId: string | null,
    fields: Record<string, string | null | undefined>
  ): Promise<Record<string, any>> {
    const out: Record<string, any> = {};
    for (const [field, val] of Object.entries(fields)) {
      if (val == null) continue;
      const res = await this.encryptField(scope, table, field, val, recordId ? [recordId] : []);
      out[`${field}_enc`] = res.ciphertext_b64;
      out[`${field}_iv`] = res.iv_b64;
      // *_tag non serve: AES-GCM tag è incluso nel ciphertext in WebCrypto
    }
    return out;
  }

  async decryptFields(
    scope: string,
    table: string,
    recordId: string | null,
    row: any,
    fieldNames: string[]
  ): Promise<Record<string, string | null>> {
    const out: Record<string, string | null> = {};
    for (const field of fieldNames) {
      const ct = row?.[`${field}_enc`];
      const iv = row?.[`${field}_iv`];
      if (!ct || !iv) { out[field] = null; continue; }
      out[field] = await this.decryptField(scope, table, field, ct, iv, recordId ? [recordId] : []);
    }
    return out;
  }
}
