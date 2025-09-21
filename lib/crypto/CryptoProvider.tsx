"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CryptoService } from "@/lib/crypto/CryptoService";

type Ctx = {
  ready: boolean;
  crypto: CryptoService | null;
  unlock: (passphrase: string, scopes?: string[]) => Promise<void>;
  prewarm: (scopes: string[]) => Promise<void>;
  error: string | null;
};

const CryptoCtx = createContext<Ctx>({ ready: false, crypto: null, unlock: async () => {}, prewarm: async () => {}, error: null });
export const useCrypto = () => useContext(CryptoCtx);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
  const [cryptoSvc, setCryptoSvc] = useState<CryptoService | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureSvc = useCallback(() => {
    if (cryptoSvc) return cryptoSvc;
    const svc = new CryptoService(supabase, /* accountId multi-tenant */ null);
    setCryptoSvc(svc);
    return svc;
  }, [cryptoSvc, supabase]);

  const prewarm = useCallback(async (scopes: string[]) => {
    const svc = ensureSvc();
    for (const s of scopes) await svc.getOrCreateScopeKeys(s);
  }, [ensureSvc]);

  const unlock = useCallback(async (passphrase: string, scopes: string[] = []) => {
    setError(null);
    const svc = ensureSvc();
    try {
      await svc.unlockWithPassphrase(passphrase);
      for (const s of scopes) await svc.getOrCreateScopeKeys(s);
      setReady(true);
    } catch (e: any) {
      setError(e?.message ?? "Errore sblocco");
      setReady(false);
    }
  }, [ensureSvc]);

  return (
    <CryptoCtx.Provider value={{ ready, crypto: cryptoSvc, unlock, prewarm, error }}>
      {children}
    </CryptoCtx.Provider>
  );
}
