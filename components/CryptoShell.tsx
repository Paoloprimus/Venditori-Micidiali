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

  // API globale: window.reppingUnlock("pass")
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).reppingUnlock = async (pass: string) => {
      if (!pass) {
        alert("Passphrase mancante");
        return false;
      }
      if (unlocking) return false;
      setUnlocking(true);
      try {
        await unlock(pass, DEFAULT_SCOPES);
        await prewarm(DEFAULT_SCOPES);
        console.info("[crypto] unlocked via API");
        return true;
      } catch (e: any) {
        console.error("[crypto] unlock failed:", e);
        alert(`Sblocco fallito: ${e?.message || e}`);
        return false;
      } finally {
        // per sicurezza: non tenere passphrase in storage
        try { sessionStorage.removeItem("repping:pph"); } catch {}
        try { localStorage.removeItem("repping:pph"); } catch {}
        setUnlocking(false);
      }
    };
    return () => {
      try { delete (window as any).reppingUnlock; } catch {}
    };
  }, [unlock, prewarm, unlocking]);

  // Auto-unlock SOLO se troviamo pph in storage (post-login)
  useEffect(() => {
    if (ready || unlocking) return;
    const pass =
      typeof window !== "undefined"
        ? (sessionStorage.getItem("repping:pph") || localStorage.getItem("repping:pph"))
        : null;
    if (!pass) return;
    (window as any).reppingUnlock(pass);
  }, [ready, unlocking]);

  // UI non bloccante: se sta sbloccando mostro un loader, altrimenti passo i children
  if (!ready && unlocking) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ opacity: 0.8 }}>Sblocco dati…</div>
        {error ? <div style={{ color: "#dc2626", marginTop: 8 }}>{String(error)}</div> : null}
      </div>
    );
    }

  return <>{children}</>;
}
