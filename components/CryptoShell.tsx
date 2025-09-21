// components/CryptoShell.tsx
"use client";

import { ReactNode } from "react";
import { CryptoProvider } from "../lib/crypto/CryptoProvider";
import UnlockButton from "./UnlockButton";

export default function CryptoShell({ children }: { children: ReactNode }) {
  return (
    <CryptoProvider>
      <header style={{padding:16, borderBottom: "1px solid #eee", display:"flex", justifyContent:"space-between"}}>
        <strong>TEST CIFRATURA</strong>
        <UnlockButton />
      </header>
      <main style={{padding:16}}>
        {children}
      </main>
    </CryptoProvider>
  );
}
