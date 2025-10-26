// lib/crypto/serverEncryption.ts
// Cifratura SERVER-SIDE (at-rest) per conversazioni e messaggi
// Usa AES-GCM con chiave fissa da ENV

import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";

/**
 * Deriva una chiave AES-256 dalla passphrase server
 */
function deriveKey(passphrase: string): Buffer {
  return createHash("sha256").update(passphrase).digest();
}

/**
 * Ottiene la chiave server da ENV (fallback per dev)
 */
function getServerKey(): Buffer {
  const passphrase = process.env.SERVER_CRYPTO_PASSPHRASE || "dev-fallback-key-change-in-production";
  return deriveKey(passphrase);
}

/**
 * Cifra una stringa con AES-256-GCM
 * @returns {ciphertext, iv, tag} in base64
 */
export function encryptText(plaintext: string): { ciphertext: string; iv: string; tag: string } {
  const key = getServerKey();
  const iv = randomBytes(12); // GCM usa IV da 12 bytes
  
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  
  const tag = cipher.getAuthTag();
  
  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decifra una stringa cifrata con AES-256-GCM
 */
export function decryptText(ciphertext: string, iv: string, tag: string): string {
  const key = getServerKey();
  
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64")
  );
  
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  
  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Blind index per ricerca (HMAC-SHA256)
 * Usa la stessa chiave del server
 */
export function computeBlindIndex(value: string): string {
  const key = getServerKey();
  const normalized = value.trim().toLowerCase().normalize("NFKC");
  return createHash("sha256")
    .update(key)
    .update(normalized)
    .digest("base64");
}
