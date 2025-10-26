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
 * Converte una stringa (hex con \x o base64) in Buffer
 * Gestisce il formato che PostgreSQL restituisce per i campi bytea
 */
function stringToBuffer(str: string): Buffer {
  if (!str) return Buffer.alloc(0);
  
  // Formato PostgreSQL hex: \x4a5b6c...
  if (str.startsWith("\\x")) {
    return Buffer.from(str.slice(2), "hex");
  }
  
  // Formato hex alternativo: 0x4a5b6c...
  if (str.startsWith("0x")) {
    return Buffer.from(str.slice(2), "hex");
  }
  
  // Altrimenti assumiamo Base64
  return Buffer.from(str, "base64");
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
 * Gestisce automaticamente formato hex (\x...) o base64
 */
export function decryptText(ciphertext: string, iv: string, tag: string): string {
  const key = getServerKey();
  
  // Converti da hex (\x...) o base64 a Buffer
  const ciphertextBuf = stringToBuffer(ciphertext);
  const ivBuf = stringToBuffer(iv);
  const tagBuf = stringToBuffer(tag);
  
  const decipher = createDecipheriv("aes-256-gcm", key, ivBuf);
  decipher.setAuthTag(tagBuf);
  
  // Passa il Buffer direttamente (non serve specificare encoding)
  let decrypted = decipher.update(ciphertextBuf, undefined, "utf8");
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
