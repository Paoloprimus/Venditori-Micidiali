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
  unlockWithPassphrase: (passphrase: string) => Promise<void>;
  ensureScope: (scope: string) => Promise<void>;
  getOrCreateScopeKeys?: (scope: string) => Promise<void>;
  prewarm: (scopes: string[]) => Promise<void>;
  encryptFields: (
    scope: string,
    table: string,
    rowId: string,
    fields: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  decryptRow: <T = unknown>(
    scope: string,
    row: Record<string, unknown>
  ) => Promise<T>;
};

export type CryptoContextType = {
  ready: boolean;
  userId: string | null;
  crypto: CryptoService | null;
  unlock: (passphrase: string) => Promise<void>;
  prewarm: (scopes: string[]) => Promise<void>;
};

const CryptoContext = createContext<CryptoContextType>({
  ready: false,
  userId: null,
  crypto: null,
  unlock: async () => {},
  prewarm: async () => {},
});

/** === Utils === */

function getDebug(): any | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyWin = window as any;
  return anyWin.debugCrypto ?? null;
}

function swallow409<T = unknown>(e: unknown): never | T {
  const err = e as any;
  const msg: string | undefined = err?.message ?? err?.error ?? "";
  const code: string | number | undefined = err?.code;
  const looksLikeConflict =
    code === 409 ||
    code === "409" ||
    code === "23505" ||
    (typeof msg === "string" &&
      /duplicate key|unique constraint|409|Conflict/i.test(msg));
  if (looksLikeConflict) {
    // @ts-ignore
    return undefined as T;
  }
  throw err;
}

async function waitForDebug(timeoutMs = 1500, stepMs = 100): Promise<any | null> {
  const started = Date.now();
  let dbg = getDebug();
  while (!dbg && Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, stepMs));
    dbg = getDebug();
  }
  return dbg;
}

/** === Provider === */

type Props = { children: ReactNode; userId?: string | null };

export function CryptoProvider({ children, userId: userIdProp }: Props) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0); // forziamo il rebuild quando compare debug
  const mountedRef = useRef(false);

  // Poll leggero: appena compare window.debugCrypto, aggiorna stato
  useEffect(() => {
    let timer: any;
    function kick() {
      const dbg = getDebug();
      if (dbg) {
        // prova a leggere user id e stato unlocked
        try {
          const uid =
            userIdProp ??
            (dbg?.getCurrentUserId ? dbg.getCurrentUserId() : dbg?.userId) ??
            null;
          if (uid && typeof uid === "string") setUserId(uid);
        } catch {}
        try {
          if (dbg?.isUnlocked?.() === true) setReady(true);
        } catch {}
        setEpoch((e) => e + 1);
        return true;
      }
      return false;
    }

    if (!kick()) {
      timer = setInterval(() => {
        if (kick()) clearInterval(timer);
      }, 150);
    }
    return () => timer && clearInterval(timer);
  }, [userIdProp]);

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
        if (dbg.getOrCreateScopeKeys) {
          try {
            await dbg.getOrCreateScopeKeys(scope);
            return;
          } catch (e) {
            swallow409(e);
          }
        }
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

      encryptFields: async (scope, table, rowId, fields) => {
        if (!dbg.encryptFields) {
          throw new Error("encryptFields non disponibile");
        }
        return await dbg.encryptFields(scope, table, rowId, fields);
      },

      decryptRow: async <T = unknown>(scope, row) => {
        if (!dbg.decryptRow) {
          throw new Error("decryptRow non disponibile");
        }
        return await dbg.decryptRow(scope, row);
      },
    };

    return svc;
  }, [userId, epoch]); // rebuild quando cambia utente o compare debug

  const unlock = useCallback(
    async (passphrase: string) => {
      // Se il service non c’è ancora, attendi un attimo che compaia
      let svc = cryptoService;
      if (!svc) {
        const dbg = await waitForDebug(1500);
        if (!dbg) {
          throw new Error("Crypto non pronto: runtime non caricato");
        }
        // forza un rebuild immediato
        setEpoch((e) => e + 1);
        svc = {
          unlockWithPassphrase: async (pp: string) => dbg.unlockWithPassphrase(pp),
          ensureScope: async (scope: string) => {
            try {
              if (dbg.ensureScope) return await dbg.ensureScope(scope);
              if (dbg.getOrCreateScopeKeys) return await dbg.getOrCreateScopeKeys(scope);
              throw new Error("ensureScope non disponibile");
            } catch (e) {
              swallow409(e);
            }
          },
          getOrCreateScopeKeys: async (scope: string) => {
            try {
              if (dbg.getOrCreateScopeKeys) return await dbg.getOrCreateScopeKeys(scope);
              if (dbg.ensureScope) return await dbg.ensureScope(scope);
              throw new Error("getOrCreateScopeKeys non disponibile");
            } catch (e) {
              swallow409(e);
            }
          },
          prewarm: async (scopes: string[]) => {
            await Promise.all(
              (scopes ?? []).map(async (s) => {
                try {
                  if (dbg.ensureScope) return await dbg.ensureScope(s);
                  if (dbg.getOrCreateScopeKeys) return await dbg.getOrCreateScopeKeys(s);
                  throw new Error("Nessuna API per creare scope keys");
                } catch (e) {
                  swallow409(e);
                }
              })
            );
          },
          encryptFields: async (scope, table, rowId, fields) => {
            if (!dbg.encryptFields) throw new Error("encryptFields non disponibile");
            return await dbg.encryptFields(scope, table, rowId, fields);
          },
          decryptRow: async <T = unknown>(scope, row) => {
            if (!dbg.decryptRow) throw new Error("decryptRow non disponibile");
            return await dbg.decryptRow(scope, row);
          },
        };
      }

      await svc.unlockWithPassphrase(passphrase);
      setReady(true);
    },
    [cryptoService]
  );

  const prewarm = useCallback(
    async (scopes: string[]) => {
      if (!cryptoService) {
        const dbg = await waitForDebug(1500);
        if (!dbg) return;
        setEpoch((e) => e + 1);
        // chiama direttamente il dbg per non perdere la call
        await Promise.all(
          (scopes ?? []).map(async (s) => {
            try {
              if (dbg.ensureScope) return await dbg.ensureScope(s);
              if (dbg.getOrCreateScopeKeys) return await dbg.getOrCreateScopeKeys(s);
            } catch (e) {
              swallow409(e);
            }
          })
        );
        return;
      }
      await cryptoService.prewarm(scopes);
    },
    [cryptoService]
  );

  // Prima mount: prova a leggere uid/unlocked una volta
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const dbg = getDebug();
    try {
      const uid =
        userIdProp ??
        (dbg?.getCurrentUserId ? dbg.getCurrentUserId() : dbg?.userId) ??
        null;
      if (uid && typeof uid === "string") setUserId(uid);
    } catch {}
    try {
      if (dbg?.isUnlocked?.() === true) setReady(true);
    } catch {}
  }, [userIdProp]);

  const ctxValue = useMemo<CryptoContextType>(
    () => ({ ready, userId, crypto: cryptoService, unlock, prewarm }),
    [ready, userId, cryptoService, unlock, prewarm]
  );

  return <CryptoContext.Provider value={ctxValue}>{children}</CryptoContext.Provider>;
}

/** Hook comodo */
export function useCrypto(): CryptoContextType {
  return useContext(CryptoContext);
}
