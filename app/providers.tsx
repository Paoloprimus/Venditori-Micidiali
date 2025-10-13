// app/providers.tsx
"use client";
import React from "react";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
import CryptoShell from "@/components/CryptoShell"; // ⬅️ AGGIUNTO: inizializza window.debugCrypto

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CryptoProvider>
      {/* Inizializza window.debugCrypto e carica i parametri profilo */}
      <CryptoShell />
      {children}
    </CryptoProvider>
  );
}
