// lib/crypto/CryptoProvider.tsx
"use client";

import React from "react";

/**
 * Tipi minimi attesi dal servizio crypto esposto dal client.
 * In base ai tuoi log, l’oggetto è accessibile come `window.debugCrypto`
 * e fornisce almeno:
 *  - unlockWithPassphrase(passphrase: string): Promise<void>
 *  - ensureScope(scope: string): Promise<void>
 */
type CryptoService = {
  unlockWithPassphrase: (passphrase: string) => Promise<void>;
  ensureScope: (scope: string) => Promise<void>;
};

export type CryptoContextType = {
  ready: boolean;
  crypto: CryptoService | null;
  unlock: (passphrase: string, scopes?: string[]) => Promise<void>;
  prewarm: (scopes?: string[]) => Promise<void>;
  error: string | null;
};

const CryptoContext = React.createContext<CryptoContextType>({
  ready: false,
  crypto: null,
  unlock: async () => {},
  prewarm: async () => {},
  error: null,
});

let mountCount = 0;

export const useCrypto = (): CryptoContextType => {
  const ctx = React.useContext(CryptoContext);
  if (!ctx) {
    throw new Error("useCrypto must be used within CryptoProvider");
  }
  return ctx;
};

function isDuplicateKeyError(err: any): boolean {
  // Vedi i tuoi log: 409 Conflict o code '23505'
  const msg = String(err?.message || "");
  const code = String((err as any)?.code || "");
  const status = (err as any)?.status ?? (err as any)?.statusCode;
  return (
    status === 409 ||
    code === "23505" ||
    /duplicate key/i.test(msg) ||
    /unique constraint/i.test(msg)
  );
}

export default function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [crypto, setCrypto] = React.useState<CryptoService | null>(null);

  // Debug: contatore mount + stato iniziale
  React.useEffect(() => {
    mountCount += 1;
    const ts = Date.now();
    try {
      // Prova a collegarti al servizio esposto in debug
      const svc = (globalThis as any)?.window?.debugCrypto as CryptoService | undefined;
      if (svc) {
        console.log("🔐 Crypto debug esposto come window.debugCrypto");
        setCrypto(svc);
      } else {
        console.warn("🔐 Nessun debugCrypto trovato su window (ok in produzione se usi un service interno).");
      }
    } catch (e) {
      console.warn("🔐 Accesso a window.debugCrypto non riuscito:", e);
    }

    console.log(
      `🔐 [PROVIDER] CryptoProvider montato - count: ${mountCount} timestamp: ${ts}`
    );
    console.log(
      `🔐 CryptoProvider montato - authChecked: ${false} userId: ${null} ready: ${false}`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prewarm = React.useCallback(
    async (scopes?: string[]) => {
      if (!scopes || scopes.length === 0) return;
      if (!crypto) {
        console.warn("[crypto][prewarm] crypto non inizializzato, salto.");
        return;
      }
      for (const scope of scopes) {
        try {
          await crypto.ensureScope(scope);
        } catch (err: any) {
          if (isDuplicateKeyError(err)) {
            // Idempotente: chiave già presente per (user, scope) => ignora
            console.warn(`[crypto][prewarm] scope già inizializzato (${scope}), ignoro.`, err);
            continue;
          }
          console.warn(`[crypto][prewarm] scope error: table:${scope}`, err);
          // Non blocco l’intera catena di prewarm sugli altri scope
        }
      }
    },
    [crypto]
  );

  const unlock = React.useCallback(
    async (passphrase: string, scopes?: string[]) => {
      try {
        if (!crypto) {
          throw new Error("Crypto service non disponibile");
        }
        console.log("🔐 Tentativo unlock per user: (vedi service interno)");
        console.log("🔐 [DEBUG] === INIZIO unlockWithPassphrase ===");

        await crypto.unlockWithPassphrase(passphrase);

        setReady(true);
        setError(null);
        console.log("🔐 [DEBUG] === FINE unlockWithPassphrase (SUCCESSO) ===");
        console.log("✅ Sblocco riuscito, ready=true");

        // Se vengono passati gli scope, fai prewarm subito (compat con ClientsPage)
        if (scopes && scopes.length) {
          try {
            await prewarm(scopes);
          } catch (e) {
            console.warn("[crypto][unlock] prewarm post-unlock ha dato warning:", e);
          }
        }
      } catch (err: any) {
        setReady(false);
        setError(String(err?.message || err));
        console.error("❌ Errore unlock:", err);
        console.log("🔐 [DEBUG] === FINE unlockWithPassphrase (ERRORE) ===");
        throw err;
      }
    },
    [crypto, prewarm]
  );

  const value: CryptoContextType = React.useMemo(
    () => ({ ready, crypto, unlock, prewarm, error }),
    [ready, crypto, unlock, prewarm, error]
  );

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
}
