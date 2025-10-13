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

// ✅ PATCH: importo l'implementazione reale della classe CryptoService (client-side)
import { CryptoService as CryptoSvcImpl } from "@/lib/crypto/CryptoService";
import { supabase } from "@/lib/supabase/client";

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
  computeBlindIndex?: (scope: string, plaintext: string) => Promise<string>;
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

  // ✅ PATCH: “percorso B” se window.debugCrypto non esiste
  const [altCryptoService, setAltCryptoService] = useState<CryptoService | null>(null);

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
  }, [userId, getDebug()]);

  const unlock = useCallback(
    async (passphrase: string) => {
      // ✅ PATCH: usa percorso A (debug) o B (classe reale)
      if (cryptoService) {
        await cryptoService.unlockWithPassphrase(passphrase);
        setReady(true);
        return;
      }
      if (altCryptoService) {
        await altCryptoService.unlockWithPassphrase(passphrase);
        setReady(true);
        return;
      }
      const dbg = getDebug();
      if (dbg?.unlockWithPassphrase) {
        await dbg.unlockWithPassphrase(passphrase);
        setReady(true);
        return;
      }
      throw new Error("Crypto non inizializzato");
    },
    [cryptoService, altCryptoService]
  );

  const prewarm = useCallback(
    async (scopes: string[]) => {
      if (cryptoService) {
        await cryptoService.prewarm(scopes);
        return;
      }
      if (altCryptoService) {
        await altCryptoService.prewarm(scopes);
        return;
      }
      const dbg = getDebug();
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
            swallow409(e);
          }
        })
      );
    },
    [cryptoService, altCryptoService]
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
        return;
      }
    } catch {}

    // ✅ PATCH: se window.debugCrypto NON esiste, preparo il percorso B
    try {
      if (!dbg) {
        const impl = new (CryptoSvcImpl as any)(supabase) as CryptoService;
        setAltCryptoService(impl);
      }
    } catch {}

    // 🔐 AUTO-UNLOCK se possibile
    try {
      const pass =
        sessionStorage.getItem("repping:pph") ??
        localStorage.getItem("repping:pph");
      if (!pass) return;

      const wait = async () => {
        const dbg = getDebug();
        // ✅ Sblocca quando c'è uno dei due percorsi disponibili
        if (dbg?.unlockWithPassphrase || altCryptoService) return true;
        return false;
      };

      const waitUntil = async (fn: () => Promise<boolean>, timeout = 3000) => {
        const started = Date.now();
        while (!(await fn())) {
          if (Date.now() - started > timeout) return false;
          await new Promise((r) => setTimeout(r, 100));
        }
        return true;
      };

      waitUntil(wait).then(async (ok) => {
        if (!ok) return;
        const d = getDebug();
        if (d?.unlockWithPassphrase) {
          await d.unlockWithPassphrase(pass);
          setReady(true);
          return;
        }
        if (altCryptoService) {
          await altCryptoService.unlockWithPassphrase(pass);
          setReady(true);
          return;
        }
      });
    } catch {}
  }, [userIdProp, altCryptoService]);

  const ctxValue = useMemo<CryptoContextType>(
    () => ({
      ready,
      userId,
      // ✅ PATCH: esponi qualunque service sia disponibile
      crypto: cryptoService ?? altCryptoService,
      unlock,
      prewarm,
    }),
    [ready, userId, cryptoService, altCryptoService, unlock, prewarm]
  );

  return (
    <CryptoContext.Provider value={ctxValue}>
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto(): CryptoContextType {
  return useContext(CryptoContext);
}
