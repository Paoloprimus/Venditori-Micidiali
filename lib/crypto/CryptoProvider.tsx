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

import { CryptoService as CryptoSvcImpl } from "@/lib/crypto/CryptoService"; // ✅ AGGIUNTO per percorso B
import { supabase } from "@/lib/supabase/client"; // ✅ AGGIUNTO per percorso B

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
   * Decripta un set di campi per una certa riga. Accetta sia:
   *  - array: [{ name, enc, iv }, ...]
   *  - object: { nome: { enc, iv }, ... }
   * Ritorna un object { nomeCampo: valoreChiaro, ... } oppure un array
   * compatibile con alcune impl.
   */
  decryptFields?: (
    scope: string,
    table: string,
    rowId: string,
    specs:
      | Array<{ name: string; enc: any; iv: any }>
      | Record<string, { enc: any; iv: any }>,
    opts?: any
  ) => Promise<Record<string, unknown> | Array<{ name: string; value: unknown }>>;

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
  // 1) se già presente, usa quello
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w: any = window as any;
  if (w.debugCrypto) return w.debugCrypto;

  // 2) autodiscovery: cerca in window un oggetto con metodi noti
  const looksLikeCrypto = (obj: any) =>
    obj && typeof obj === "object" && (
      typeof obj.unlockWithPassphrase === "function" ||
      typeof obj.decryptFields === "function" ||
      typeof obj.decryptRow === "function" ||
      typeof obj.ensureScope === "function" ||
      typeof obj.getOrCreateScopeKeys === "function"
    );

  try {
    for (const k in w) {
      // evita getter strani dei browser
      let v: any;
      try { v = w[k]; } catch { continue; }
      if (looksLikeCrypto(v)) {
        w.debugCrypto = v;        // <-- normalizziamo il nome
        return w.debugCrypto;
      }
    }
  } catch {
    // ignora
  }

  return null;
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

  // ✅ Percorso B: istanza reale se debugCrypto non esiste
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

      // ---- SHIM decryptFields: usa decryptRow se c'è, altrimenti inoltra alla decryptFields nativa ----
  (svc as any).decryptFields = async function decryptFieldsShim(
    scope: string,
    table: string,
    rowId: string,
    specs:
      | Array<{ name: string; enc: any; iv: any }>
      | Record<string, { enc: any; iv: any }>,
    opts?: any
  ): Promise<Record<string, unknown>> {
    // normalizza specs -> array [{ name, enc, iv }]
    const list: Array<{ name: string; enc: any; iv: any }> = Array.isArray(specs)
      ? specs
      : Object.keys(specs || {}).map((k) => ({
          name: k,
          enc: (specs as any)[k]?.enc,
          iv: (specs as any)[k]?.iv,
        }));

    // 1) preferisci decryptRow del debug helper se presente
    if (typeof dbg.decryptRow === "function") {
      const synthetic: Record<string, any> = {};
      for (const s of list) {
        if (!s || !s.name) continue;
        synthetic[`${s.name}_enc`] = s.enc;
        synthetic[`${s.name}_iv`] = s.iv;
      }
      const dec = await dbg.decryptRow(scope, synthetic);
      const out: Record<string, unknown> = {};
      for (const s of list) out[s.name] = (dec as any)?.[s.name] ?? "";
      return out;
    }

    // 2) fallback: se esiste decryptFields nativa, inoltra (array-spec)
    if (typeof dbg.decryptFields === "function") {
      const res = await dbg.decryptFields(scope, table, rowId, list, opts);
      if (Array.isArray(res)) {
        return res.reduce((acc: Record<string, unknown>, it: any) => {
          if (it && typeof it === "object" && "name" in it) acc[it.name] = it.value ?? "";
          return acc;
        }, {});
      }
      return (res ?? {}) as Record<string, unknown>;
    }

    // 3) nessuna API disponibile
    throw new Error("decryptFields non disponibile");
  };

    
    return svc;
  }, [userId, getDebug()]);

  const unlock = useCallback(
    async (passphrase: string) => {
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
      if (cryptoService?.prewarm) {
        await cryptoService.prewarm(scopes);
        return;
      }
      if (altCryptoService?.prewarm) {
        await altCryptoService.prewarm(scopes);
        return;
      }
      // ✅ Polyfill prewarm se manca: usa ensureScope / getOrCreateScopeKeys
      const svc = cryptoService ?? altCryptoService;
      if (svc && (!("prewarm" in svc) || !svc.prewarm)) {
        await Promise.all(
          (scopes ?? []).map(async (s) => {
            try {
              if (svc.ensureScope) {
                await svc.ensureScope(s);
              } else if (svc.getOrCreateScopeKeys) {
                await svc.getOrCreateScopeKeys(s);
              }
            } catch (e) {
              swallow409(e);
            }
          })
        );
        return;
      }

      // Fallback diretto su debug (vecchia strada)
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

    // ✅ Se non esiste debug, prepara percorso B con classe reale
    try {
      if (!dbg) {
        const impl = new (CryptoSvcImpl as any)(supabase) as CryptoService;
        // Polyfill prewarm anche qui, se non presente
        if (!("prewarm" in impl) || !impl.prewarm) {
          (impl as any).prewarm = async (scopes: string[]) => {
            await Promise.all(
              (scopes ?? []).map(async (s) => {
                try {
                  if ((impl as any).ensureScope) {
                    await (impl as any).ensureScope(s);
                  } else if ((impl as any).getOrCreateScopeKeys) {
                    await (impl as any).getOrCreateScopeKeys(s);
                  }
                } catch (e) {
                  swallow409(e);
                }
              })
            );
          };
        }

      // Shim decryptFields anche sull'impl alternativa (usa quello che è disponibile)
  if (!(impl as any).decryptFields) {
    (impl as any).decryptFields = async function decryptFieldsShimAlt(
      scope: string,
      table: string,
      rowId: string,
      specs:
        | Array<{ name: string; enc: any; iv: any }>
        | Record<string, { enc: any; iv: any }>,
      opts?: any
    ): Promise<Record<string, unknown>> {
      const list: Array<{ name: string; enc: any; iv: any }> = Array.isArray(specs)
        ? specs
        : Object.keys(specs || {}).map((k) => ({
            name: k,
            enc: (specs as any)[k]?.enc,
            iv: (specs as any)[k]?.iv,
          }));

      // preferisci decryptRow sull'impl se esiste
      if (typeof (impl as any).decryptRow === "function") {
        const synthetic: Record<string, any> = {};
        for (const s of list) {
          if (!s || !s.name) continue;
          synthetic[`${s.name}_enc`] = s.enc;
          synthetic[`${s.name}_iv`] = s.iv;
        }
        const dec = await (impl as any).decryptRow(scope, synthetic);
        const out: Record<string, unknown> = {};
        for (const s of list) out[s.name] = (dec as any)?.[s.name] ?? "";
        return out;
      }

      // fallback: se l'impl ha una decryptFields nativa
      if (typeof (impl as any).decryptFields === "function") {
        const res = await (impl as any).decryptFields(scope, table, rowId, list, opts);
        if (Array.isArray(res)) {
          return res.reduce((acc: Record<string, unknown>, it: any) => {
            if (it && typeof it === "object" && "name" in it) acc[it.name] = it.value ?? "";
            return acc;
          }, {});
        }
        return (res ?? {}) as Record<string, unknown>;
      }

      throw new Error("decryptFields non disponibile (impl alternativa)");
    };
  }

        
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
        if (dbg?.unlockWithPassphrase) return true;
        if (altCryptoService) return true;
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
      crypto: cryptoService ?? altCryptoService, // ✅ esponi uno dei due
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
