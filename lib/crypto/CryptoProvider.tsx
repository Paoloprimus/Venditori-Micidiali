// lib/crypto/CryptoProvider.tsx
"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase/client";
import { CryptoService } from "@/lib/crypto/CryptoService";

type CryptoContextType = {
  ready: boolean;
  crypto: CryptoService | null;
  unlock: (passphrase: string) => Promise<void>;
  error: string | null;
};

const CryptoContext = React.createContext<CryptoContextType>({
  ready: false,
  crypto: null,
  unlock: async () => {},
  error: null,
});

export function useCrypto() {
  return React.useContext(CryptoContext);
}

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [crypto, setCrypto] = React.useState<CryptoService | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // crea servizio una sola volta
  React.useEffect(() => {
    const svc = new CryptoService(supabase, null);
    setCrypto(svc);
    (window as any).debugCrypto = svc;
    console.log("🔐 CryptoProvider inizializzato (singleton)");
  }, []);

  const unlock = async (passphrase: string) => {
    try {
      if (!crypto) return;
      await (crypto as any).unlockWithPassphrase(passphrase);
      setReady(true);
      setError(null);
      console.log("✅ Sblocco riuscito, ready=true");
    } catch (err: any) {
      setReady(false);
      setError(String(err?.message || err));
      console.error("❌ Errore sblocco:", err);
    }
  };

  return (
    <CryptoContext.Provider value={{ ready, crypto, unlock, error }}>
      {children}
    </CryptoContext.Provider>
  );
}
