// app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
import CryptoShell from "@/components/CryptoShell";

export const metadata = {
  title: "Venditori Micidiali",
  description: "App gestione clienti con cifratura",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        {/* ✅ Tutto ciò che è client va qui dentro */}
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}

// ✅ wrapper client separato
"use client";
function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <CryptoProvider>
      <CryptoShell />
      {children}
    </CryptoProvider>
  );
}
