// app/layout.tsx (estratto rilevante)

"use client"; 

import "@/app/globals.css";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
import CryptoShell from "@/components/CryptoShell";  

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        {/* Unica istanza globale del provider, qui */}
        <CryptoProvider>
          <CryptoShell />   {/* 
          {children}
        </CryptoProvider>
      </body>
    </html>
  );
}
