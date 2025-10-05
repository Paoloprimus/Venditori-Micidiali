"use client"; // 👈 AGGIUNGI QUESTA LINEA IN ALTO

import "./globals.css";
import type { Metadata } from "next";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
import CryptoShell from "@/components/CryptoShell";
import { SupabaseProvider } from "@/lib/supabase/SupabaseProvider";

// Rimuovi metadata export se usi "use client"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <SupabaseProvider>
          <CryptoProvider>
            <CryptoShell>
              <main>{children}</main>
            </CryptoShell>
          </CryptoProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
