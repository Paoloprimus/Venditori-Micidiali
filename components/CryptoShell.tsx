// components/CryptoShell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCrypto } from "@/lib/crypto/CryptoProvider";

const DEFAULT_SCOPES = [
  "table:accounts","table:contacts","table:products",
  "table:profiles","table:notes","table:conversations",
  "table:messages","table:proposals",
];

export default function CryptoShell({ children }: { children: React.ReactNode }) {
  const { ready, unlock, prewarm, error } = useCrypto();
  const [unlocking, setUnlocking] = useState(false);
  const [triedSilent, setTriedSilent] = useState(false);

  // Espone una API globale per sbloccare manualmente da qualunque pagina:
  // in console o da un bottone: window.reppingUnlock("tua-passphrase")
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).reppingUnlock = async (pass: string) => {
      if (!pass || unlocking) return;
      try {
        setUnlocking(true);
        await unlock(pass, DEFAULT_SCOPES);
        await prewarm(DEFAULT_SCOPES);
      } finally {
        setUnlocking(false);
      }
    };
    return () => {
      if (typeof window !== "undefined") {
        try { delete (window as any).reppingUnlock; } catch {}
      }
    };
  }, [unlocking, unlock, prewarm]);

  useEffect(() => {
    if (ready || unlocking) return;

    // 1) Sblocco con passphrase passata via sessionStorage (post-login)
    const pass =
      typeof window !== "undefined" ? sessionStorage.getItem("repping:pph") : null;

    if (pass) {
      (async () => {
        try {
          setUnlocking(true);
          await unlock(pass, DEFAULT_SCOPES);      // sblocca + crea scope keys se servono
          await prewarm(DEFAULT_SCOPES);           // prime delle chiavi per performance
        } finally {
          // per sicurezza non teniamo la passphrase nel sessionStorage
          try { sessionStorage.removeItem("repping:pph"); } catch {}
          setUnlocking(false);
        }
      })();
      return;
    }

    // 2) Tentativo di sblocco "silenzioso" (senza pass) una sola volta
    //    Utile se il provider ha già i derivati in IndexedDB dal login precedente.
    if (!triedSilent) {
      (async () => {
        setTriedSilent(true);
        try {
          setUnlocking(true);
          // alcune implementazioni di unlock accettano pass vuota/undefined
          await unlock(undefined as unknown as string, DEFAULT_SCOPES);
          await prewarm(DEFAULT_SCOPES);
        } catch {
          // è normale che fallisca se serve la pass
        } finally {
          setUnlocking(false);
        }
      })();
    }
  }, [ready, unlocking, unlock, prewarm, triedSilent]);

  // Loader breve solo durante lo sblocco in corso.
  if (!ready && unlocking) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ opacity: 0.8 }}>Sblocco dati…</div>
        {error ? (
          <div style={{ color: "#dc2626", marginTop: 8 }}>{String(error)}</div>
        ) : null}
      </div>
    );
  }

  // Se non siamo ready ma non stiamo sbloccando, NON blocchiamo la UI:
  // le pagine possono decidere cosa mostrare (es. "Carico chiavi..." o un link alla Home).
  return <>{children}</>;
}
