// app/providers.tsx
"use client";
import React from "react";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
import CryptoShell from "@/components/CryptoShell";
import { ToastProvider } from "@/components/ui/Toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CryptoProvider>
      <ToastProvider>
      <CryptoShell>{children}</CryptoShell>
      </ToastProvider>
    </CryptoProvider>
  );
}
