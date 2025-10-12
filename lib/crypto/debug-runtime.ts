// lib/crypto/debug-runtime.ts
// Espone un helper globale per debug e integrazione CryptoProvider

if (typeof window !== "undefined") {
  const w = window as any;

  // Evita di ridefinire se già esiste
  if (!w.debugCrypto) {
    w.debugCrypto = {
      isUnlocked: () => false,
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
        // Simula cifratura fittizia (aggiunge "_enc")
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
                ? v.slice(4, -1)
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

    console.log("🔐 Crypto debug esposto come window.debugCrypto");
  }
}
