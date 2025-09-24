// components/CryptoShell.tsx
"use client";

import { useEffect, useState } from "react";
import { useCrypto } from "@/lib/crypto/CryptoProvider";

const DEFAULT_SCOPES = [
  "table:accounts","table:contacts","table:products",
  "table:profiles","table:notes","table:conversations",
  "table:messages","table:proposals",
];

export default function CryptoShell({ children }: { children: React.ReactNode }) {
  const { ready, unlock, prewarm, error } = useCrypto();
  const [unlockTried, setUnlockTried] = useState(false);

  useEffect(() => {
    if (ready || unlockTried) return;
    (async () => {
      setUnlockTried(true);
      // prompt immediato
      const pass = window.prompt("Inserisci la passphrase per sbloccare i dati");
      if (!pass) { setUnlockTried(false); return; }
      try {
        await unlock(pass, DEFAULT_SCOPES); // sblocca + prewarm
        await prewarm(DEFAULT_SCOPES);      // idempotente
      } catch {
        // riprova al prossimo render
        setUnlockTried(false);
      }
    })();
  }, [ready, unlockTried, unlock, prewarm]);

  // UI: finché non sbloccato mostro overlay semplice
  if (!ready) {
    return (
      <div style={{
        minHeight: "100vh", display: "grid", placeItems: "center",
        padding: 24
      }}>
        <div style={{
          border: "1px solid var(--ring)", borderRadius: 12, padding: 20,
          background: "var(--bg)"
        }}>
          <div style={{fontWeight:600, marginBottom: 8}}>Dati protetti</div>
          <div style={{opacity:.8, marginBottom: 12}}>
            Inserisci la passphrase per sbloccare la cifratura.
          </div>
          {error && <div style={{color:"#dc2626"}}>{error}</div>}
        </div>
      </div>
    );
  }

  // sbloccato → niente bottone, niente badge: app “normale”
  return <>{children}</>;
}
