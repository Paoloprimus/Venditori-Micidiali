// app/providers.tsx
"use client";
import React from "react";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
import CryptoShell from "@/components/CryptoShell";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CryptoProvider>
      <CryptoShell>{children}</CryptoShell>
    </CryptoProvider>
  );
}
