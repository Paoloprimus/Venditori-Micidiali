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
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (ready || unlocking) return;

    const pass = typeof window !== "undefined"
      ? sessionStorage.getItem("repping:pph")
      : null;

    if (!pass) return; // nessuna pass in sessione: non blocchiamo la UI

    (async () => {
      try {
        setUnlocking(true);
        await unlock(pass, DEFAULT_SCOPES); // sblocca + crea scope keys se servono
        await prewarm(DEFAULT_SCOPES);
      } finally {
        // pulizia: non teniamo la pw in storage oltre lo sblocco
        sessionStorage.removeItem("repping:pph");
        setUnlocking(false);
      }
    })();
  }, [ready, unlocking, unlock, prewarm]);

  // Se non siamo ancora sbloccati ma stiamo sbloccando, mostriamo solo un loader breve
  if (!ready && unlocking) {
    return (
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center"}}>
        <div style={{opacity:.8}}>Sblocco dati…</div>
        {error && <div style={{color:"#dc2626",marginTop:8}}>{error}</div>}
      </div>
    );
  }

  // NIENTE prompt. Se pass non c'era, lasciamo la UI partire (puoi sbloccare più tardi da debug).
  return <>{children}</>;
}
