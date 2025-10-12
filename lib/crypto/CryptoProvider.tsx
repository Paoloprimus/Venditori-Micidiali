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

  /** === API di cifratura di record/fields usate in /crypto-test === */
  encryptFields?: (
    scope: string,
    table: string,
    rowId: string,
    fields: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;

  decryptRow?: <T = unknown>(
    scope: string,
    row: Record<string, unknown>
  ) => Promise<T>;

  /** Nuove API di alto livello */
  encryptRecord: (
    scope: string,
    table: string,
    rowId: string,
    fields: Record<string, any>
  ) => Promise<Record<string, any>>;

  decryptRecord: (
    scope: string,
    table: string,
    rowId: string,
    record: Record<string, any>,
    fields: string[]
  ) => Promise<Record<string, any>>;

  computeBlindIndex: (scope: string, value: string) => Promise<string>;
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

/** === Provider === */

type Props = { children: ReactNode; userId?: string | null };

export function CryptoProvider({ children, userId: userIdProp }: Props) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const mountedRef = useRef(false);

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

      // compat vecchie API
      encryptFields: async (scope, table, rowId, fields) => {
        if (!dbg.encryptFields && !dbg.encryptRecord) {
          throw new Error("encryptFields/encryptRecord non disponibile");
        }
        return dbg.encryptFields
          ? await dbg.encryptFields(scope, table, rowId, fields)
          : await dbg.encryptRecord(scope, table, rowId, fields);
      },

      decryptRow: async (scope, row) => {
        if (!dbg.decryptRow && !dbg.decryptRecord) {
          throw new Error("decryptRow/decryptRecord non disponibile");
        }
        return dbg.decryptRow
          ? await dbg.decryptRow(scope, row)
          : await dbg.decryptRecord(scope, "", "", row, []);
      },

      // nuove API
      encryptRecord: async (scope, table, id, fields) => {
        if (!dbg.encryptRecord && !dbg.encryptFields)
          throw new Error("encryptRecord non disponibile");
        return dbg.encryptRecord
          ? await dbg.encryptRecord(scope, table, id, fields)
          : await dbg.encryptFields(scope, table, id, fields);
      },

      decryptRecord: async (scope, table, id, record, fields) => {
        if (!dbg.decryptRecord && !dbg.decryptRow)
          throw new Error("decryptRecord non disponibile");
        return dbg.decryptRecord
          ? await dbg.decryptRecord(scope, table, id, record, fields)
          : await dbg.decryptRow(scope, record);
      },

      computeBlindIndex: async (scope, value) => {
        if (!dbg.computeBlindIndex)
          throw new Error("computeBlindIndex non disponibile");
        return await dbg.computeBlindIndex(scope, value);
      },
    };

    return svc;
  }, [userId]);

  const unlock = useCallback(
    async (passphrase: string) => {
      if (!cryptoService) throw new Error("Crypto non inizializzato");
      await cryptoService.unlockWithPassphrase(passphrase);
      setReady(true);
    },
    [cryptoService]
  );

  const prewarm = useCallback(
    async (scopes: string[]) => {
      if (!cryptoService) return;
      await cryptoService.prewarm(scopes);
    },
    [cryptoService]
  );

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const dbg = getDebug();

    try {
      const uid =
        userIdProp ??
        (dbg?.getCurrentUserId ? dbg.getCurrentUserId() : dbg?.userId) ??
        null;
      if (uid && typeof uid === "string") {
        setUserId(uid);
      }
    } catch {}

    try {
      if (dbg?.isUnlocked?.() === true) {
        setReady(true);
      }
    } catch {}
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
