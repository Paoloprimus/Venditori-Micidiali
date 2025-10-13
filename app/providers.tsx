// app/providers.tsx
"use client";
import React from "react";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
import CryptoShell from "@/components/CryptoShell"; // ⬅️ aggiunto

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CryptoProvider>
      {/* CryptoShell richiede children ⇒ lo avvolgo attorno ai children */}
      <CryptoShell>{children}</CryptoShell>
    </CryptoProvider>
  );
}
