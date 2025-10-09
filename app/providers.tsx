// app/providers.tsx
"use client";
import React from "react";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
// (altri provider qui se servono)

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CryptoProvider>
      {children}
    </CryptoProvider>
  );
}
