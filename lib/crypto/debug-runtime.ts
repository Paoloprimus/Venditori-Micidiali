/* // lib/crypto/debug-runtime.ts
// Espone un helper globale per debug e integrazione CryptoProvider
// ⛔️ ATTENZIONE: attivalo SOLO se vuoi il mock finto (non decifra AES-GCM vero).
// Per attivarlo: NEXT_PUBLIC_ENABLE_DEBUG_CRYPTO=1

const ENABLE_DEBUG =
  typeof process !== "undefined" &&
  (process as any).env?.NEXT_PUBLIC_ENABLE_DEBUG_CRYPTO === "1";

if (ENABLE_DEBUG && typeof window !== "undefined") {
  const w = window as any;

  // Evita di ridefinire se già esiste
  if (!w.debugCrypto) {
    w.debugCrypto = {
      isUnlocked: () => !!w._cryptoUnlocked,
      unlockWithPassphrase: async (pass: string) => {
        console.log("🔐 [DEBUG] unlockWithPassphrase chiamato con:", pass);
        // Simula sblocco immediato
        w._cryptoUnlocked = true;
      },
      ensureScope: async (scope: string) => {
        console.log("🔐 [DEBUG] ensureScope chiamato per:", scope);
      },
      encryptFields: async (
        scope: string,
        table: string,
        id: string,
        fields: Record<string, unknown>
      ) => {
        console.log("🔐 [DEBUG] encryptFields su", table, ":", fields);
        // Simula cifratura fittizia (aggiunge "enc(...)")
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          result[`${k}_enc`] = v ? `enc(${v})` : null;
          result[`${k}_iv`] = "iv";
        }
        return result;
      },
      decryptRow: async (scope: string, row: Record<string, unknown>) => {
        console.log("🔐 [DEBUG] decryptRow su:", row);
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          if (k.endsWith("_enc")) {
            const base = k.replace(/_enc$/, "");
            result[base] =
              typeof v === "string" && v.startsWith("enc(")
                ? v.slice(4, -1) // ← questo funziona SOLO con il mock "enc(...)"
                : v;
          }
        }
        return result;
      },
      computeBlindIndex: async (scope: string, value: string) => {
        // finto hash per test locale
        return `bi_${btoa(value).slice(0, 8)}`;
      },
      getCurrentUserId: () => w._fakeUserId ?? null,
      userId: null,
    };

    console.log("🔐 Crypto debug MOCK esposto come window.debugCrypto (ENABLE_DEBUG=1)");
  }
} else {
  // Modalità reale: non esporre il mock
  if (typeof window !== "undefined") {
    const w = window as any;
    if (w.debugCrypto && w.debugCrypto.__isMock) {
      try { delete w.debugCrypto; } catch {}
    }
  }
  // Nota: non logghiamo nulla per non sporcare la console in produzione.
}
*/
