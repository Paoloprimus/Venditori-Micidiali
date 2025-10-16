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

  /**
   * Decripta partendo da una riga grezza con *_enc/_iv.
   * `fieldNames` opzionale: se omesso, vengono dedotti da *_enc.
   */
  decryptFields?: (
    scope: string,
    table: string,
    recordId: string,
    rowOrMap: Record<string, unknown>,
    fieldNames?: string[]
  ) => Promise<Record<string, unknown>>;

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

/** Scopes standard da pre-warmare */
const DEFAULT_SCOPES = [
  "table:accounts",
  "table:contacts",
  "table:products",
  "table:profiles",
  "table:notes",
  "table:conversations",
  "table:messages",
  "table:proposals",
];

/** === Provider === */

type Props = { children: ReactNode; userId?: string | null };

export function CryptoProvider({ children, userId: userIdProp }: Props) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const mountedRef = useRef(false);

  // Istanza REALE unica e stabile
  const cryptoService: CryptoService = useMemo(() => {
    const impl = new (CryptoSvcImpl as any)(supabase) as CryptoService;

    // Polyfill prewarm se non presente nell'impl (difensivo)
    if (!("prewarm" in impl) || !impl.prewarm) {
      (impl as any).prewarm = async (scopes: string[]) => {
        await Promise.all(
          (scopes ?? []).map(async (s) => {
            try {
              if ((impl as any).ensureScope) {
                await (impl as any).ensureScope(s);
              } else if ((impl as any).getOrCreateScopeKeys) {
                await (impl as any).getOrCreateScopeKeys(s);
              } else {
                throw new Error("Nessuna API per creare scope keys");
              }
            } catch (e) {
              swallow409(e);
            }
          })
        );
      };
    }

    return impl;
  }, []);

  // unlock reale
  const unlock = useCallback(
    async (passphrase: string) => {
      await cryptoService.unlockWithPassphrase(passphrase);
      setReady(true);
    },
    [cryptoService]
  );

  // prewarm reale
  const prewarm = useCallback(
    async (scopes: string[]) => {
      await cryptoService.prewarm(scopes);
    },
    [cryptoService]
  );

  // bootstrap userId e auto-unlock
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        // userId: priorità a userIdProp, altrimenti leggi da supabase
        const uid =
          userIdProp ??
          (await (async () => {
            try {
              const { data } = await supabase.auth.getUser();
              return data?.user?.id ?? null;
            } catch {
              return null;
            }
          })());

        if (!cancelled) setUserId(uid);

        // Auto-unlock: se la pass è in storage, sblocca e prew arma
        const pass =
          typeof window !== "undefined"
            ? sessionStorage.getItem("repping:pph") ||
              localStorage.getItem("repping:pph") ||
              ""
            : "";

        if (pass) {
          try {
            await unlock(pass);
            await prewarm(DEFAULT_SCOPES);
            try {
              sessionStorage.removeItem("repping:pph");
            } catch {}
            try {
              localStorage.removeItem("repping:pph");
            } catch {}
          } catch (e) {
            // Evita rumorosità: OperationError può arrivare da scope racing altrove
            const msg = String((e as any)?.message || e || "");
            if (!/OperationError/i.test(msg)) {
              // eslint-disable-next-line no-console
              console.error("[CryptoProvider] unlock/prewarm failed:", e);
            }
          }
        }
      } catch {
        // niente
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [unlock, prewarm, userIdProp]);

  // 🔎 DEBUG: esponi l'istanza crypto reale su window per test in console
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).cryptoSvc = cryptoService;
    try {
      const keys = Object.keys(cryptoService).filter(
        (k) => typeof (cryptoService as any)[k] === "function"
      );
      // eslint-disable-next-line no-console
      console.log("🔐 window.cryptoSvc pronto con metodi:", keys);
    } catch {
      // ignore
    }
  }, [cryptoService]);

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

export function useCrypto(): CryptoContextType {
  return useContext(CryptoContext);
}
