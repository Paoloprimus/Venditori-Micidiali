// lib/crypto/CryptoProvider.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** === Tipi esposti al resto dell’app === */

export type CryptoService = {
  /** Sblocca l’ambiente con la passphrase utente */
  unlockWithPassphrase: (passphrase: string) => Promise<void>;

  /** Garantisce che esistano chiavi per lo scope (crea se mancano) */
  ensureScope: (scope: string) => Promise<void>;

  /** (Compat) Alcuni moduli chiamano ancora questo nome */
  getOrCreateScopeKeys?: (scope: string) => Promise<void>;

  /** Pre-carica/garantisce più scope insieme; ignora conflitti 409 */
  prewarm: (scopes: string[]) => Promise<void>;

  /** API di comodo usate in /crypto-test */
  encryptFields: (
    scope: string,
    table: string,
    rowId: string,
    fields: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;

  /** Decifra una riga che contiene i campi *_enc / *_iv */
  decryptRow: <T = unknown>(
    scope: string,
    row: Record<string, unknown>
  ) => Promise<T>;

  /** (opzionale) Blind index deterministico per ricerche equality */
  computeBlindIndex?: (scope: string, plaintext: string) => Promise<string>;
};

export type CryptoContextType = {
  ready: boolean;
  userId: string | null;
  crypto: CryptoService | null;
  /** Avvia lo sblocco (alias per crypto.unlockWithPassphrase) */
  unlock: (passphrase: string) => Promise<void>;
  /** Pre-carica/garantisce più scope */
  prewarm: (scopes: string[]) => Promise<void>;
};

const CryptoContext = createContext<CryptoContextType>({
  ready: false,
  userId: null,
  crypto: null,
  unlock: async () => {},
  prewarm: async () => {},
});

/** === Helper safe-call su window.debugCrypto === */

function getDebug(): any | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyWin = window as any;
  return anyWin.debugCrypto ?? null;
}

function swallow409<T = unknown>(e: unknown): never | T {
  // Alcuni ambienti espongono errori come oggetti con { code, message }
  // I 409 / unique constraint vanno ignorati in prewarm/ensureScope
  const err = e as any;
  const msg: string | undefined = err?.message ?? err?.error ?? "";
  const code: string | number | undefined = err?.code;

  const looksLikeConflict =
    code === 409 ||
    code === "409" ||
    // Postgres unique constraint
    code === "23505" ||
    (typeof msg === "string" &&
      /duplicate key|unique constraint|409|Conflict/i.test(msg));

  if (looksLikeConflict) {
    // @ts-ignore: intentionally ignoring
    return undefined as T;
  }
  throw err;
}

/** === Provider === */

type Props = { children: ReactNode; userId?: string | null };

export function CryptoProvider({ children, userId: userIdProp }: Props) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const mountedRef = useRef(false);

  // Costruiamo il service (wrappa window.debugCrypto, ma con typing stabile)
  const cryptoService: CryptoService | null = useMemo(() => {
    const dbg = getDebug();
    if (!dbg) return null;

    const svc: CryptoService = {
      unlockWithPassphrase: async (passphrase: string) => {
        if (!dbg.unlockWithPassphrase) {
          throw new Error("unlockWithPassphrase non disponibile");
        }
        await dbg.unlockWithPassphrase(passphrase);
      },

      ensureScope: async (scope: string) => {
        if (dbg.ensureScope) {
          try {
            await dbg.ensureScope(scope);
            return;
          } catch (e) {
            swallow409(e);
          }
        }
        // fallback per vecchie versioni
        if (dbg.getOrCreateScopeKeys) {
          try {
            await dbg.getOrCreateScopeKeys(scope);
            return;
          } catch (e) {
            swallow409(e);
          }
        }
        // Se nessuna delle due esiste
        throw new Error("ensureScope non disponibile");
      },

      getOrCreateScopeKeys: async (scope: string) => {
        if (dbg.getOrCreateScopeKeys) {
          try {
            await dbg.getOrCreateScopeKeys(scope);
            return;
          } catch (e) {
            swallow409(e);
          }
        }
        // fallback: se non esiste, prova ensureScope
        if (dbg.ensureScope) {
          try {
            await dbg.ensureScope(scope);
            return;
          } catch (e) {
            swallow409(e);
          }
        }
        throw new Error("getOrCreateScopeKeys non disponibile");
      },

      prewarm: async (scopes: string[]) => {
        // Garantiamo tutti gli scope in parallelo, ingoiando i 409
        await Promise.all(
          (scopes ?? []).map(async (s) => {
            try {
              if (dbg.ensureScope) {
                await dbg.ensureScope(s);
              } else if (dbg.getOrCreateScopeKeys) {
                await dbg.getOrCreateScopeKeys(s);
              } else {
                throw new Error("Nessuna API per creare scope keys");
              }
            } catch (e) {
              swallow409(e);
            }
          })
        );
      },

      encryptFields: async (
        scope: string,
        table: string,
        rowId: string,
        fields: Record<string, unknown>
      ) => {
        if (!dbg.encryptFields) {
          throw new Error("encryptFields non disponibile");
        }
        return await dbg.encryptFields(scope, table, rowId, fields);
      },

      decryptRow: async <T = unknown>(
        scope: string,
        row: Record<string, unknown>
      ): Promise<T> => {
        if (!dbg.decryptRow) {
          throw new Error("decryptRow non disponibile");
        }
        return await dbg.decryptRow(scope, row);
      },

      computeBlindIndex: dbg.computeBlindIndex
        ? async (scope: string, plaintext: string) =>
            await dbg.computeBlindIndex(scope, plaintext)
        : undefined,
    };

    return svc;
  }, [userId]); // ricrea se cambia l’utente

  const unlock = useCallback(
    async (passphrase: string) => {
      // 1) prova via servizio tipizzato se già pronto
      if (cryptoService) {
        await cryptoService.unlockWithPassphrase(passphrase);
        setReady(true);
        return;
      }

      // 2) fallback: aspetta che window.debugCrypto sia disponibile e chiamalo direttamente
      let dbg = getDebug();
      if (!dbg) {
        const start = Date.now();
        // attende fino a ~5s che il debug helper compaia
        while (!dbg && Date.now() - start < 5000) {
          await new Promise((r) => setTimeout(r, 50));
          dbg = getDebug();
        }
      }
      if (!dbg?.unlockWithPassphrase) {
        throw new Error("Crypto non inizializzato");
      }
      await dbg.unlockWithPassphrase(passphrase);
      setReady(true);
    },
    [cryptoService]
  );

  const prewarm = useCallback(
    async (scopes: string[]) => {
      // 1) se il servizio è pronto, usa quello
      if (cryptoService) {
        await cryptoService.prewarm(scopes);
        return;
      }

      // 2) fallback su window.debugCrypto con swallow dei 409
      let dbg = getDebug();
      if (!dbg) {
        const start = Date.now();
        while (!dbg && Date.now() - start < 5000) {
          await new Promise((r) => setTimeout(r, 50));
          dbg = getDebug();
        }
      }
      if (!dbg) return;

      await Promise.all(
        (scopes ?? []).map(async (s) => {
          try {
            if (dbg.ensureScope) {
              await dbg.ensureScope(s);
            } else if (dbg.getOrCreateScopeKeys) {
              await dbg.getOrCreateScopeKeys(s);
            }
          } catch (e) {
            // ignora conflitti/unique constraint
            // @ts-ignore
            swallow409(e);
          }
        })
      );
    },
    [cryptoService]
  );

  /** Effetto iniziale: rileva utente e tenta auto-unlock se il debug helper è già sbloccato */
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const applyFromDbg = () => {
      const dbg = getDebug();
      if (!dbg) return false;

      try {
        const uid =
          userIdProp ??
          (dbg?.getCurrentUserId ? dbg.getCurrentUserId() : dbg?.userId) ??
          null;
        if (uid && typeof uid === "string") setUserId(uid);
      } catch {
        /* ignore */
      }

      try {
        if (dbg?.isUnlocked?.() === true) setReady(true);
      } catch {
        /* ignore */
      }
      return true;
    };

    // prova subito
    if (applyFromDbg()) return;

    // piccolo polling breve: aspetta che window.debugCrypto arrivi
    const start = Date.now();
    const t = setInterval(() => {
      if (applyFromDbg() || Date.now() - start > 3000) {
        clearInterval(t);
      }
    }, 100);

    return () => clearInterval(t);
  }, [userIdProp]);

  const ctxValue = useMemo<CryptoContextType>(
    () => ({
      ready,
      userId,
      crypto: cryptoService,
      unlock,
      prewarm,
    }),
    [ready, userId, cryptoService, unlock, prewarm]
  );

  return (
    <CryptoContext.Provider value={ctxValue}>
      {children}
    </CryptoContext.Provider>
  );
}

/** Hook comodo */
export function useCrypto(): CryptoContextType {
  return useContext(CryptoContext);
}
