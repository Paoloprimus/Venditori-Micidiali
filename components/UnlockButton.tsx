"use client";
import { useState } from "react";
import { useCrypto } from "@/lib/crypto/CryptoProvider";

export default function UnlockButton() {
  const { ready, unlock, prewarm } = useCrypto(); // ✅ aggiunto prewarm
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    const pass = window.prompt("Inserisci la passphrase per sbloccare i dati");
    if (!pass) return;
    setBusy(true);
    try {
      await unlock(pass); // ✅ ora solo un argomento
      await prewarm([
        "table:accounts",
        "table:contacts",
        "table:products",
        "table:profiles",
        "table:notes",
        "table:conversations",
        "table:messages",
        "table:proposals",
      ]);

      alert("Chiavi sbloccate ✔");
    } finally {
      setBusy(false);
    }
  };

  if (ready) return <span style={{ opacity: 0.8 }}>🔓 Cifratura attiva</span>;
  return (
    <button onClick={onClick} disabled={busy}>
      🔒 Sblocca dati
    </button>
  );
}
