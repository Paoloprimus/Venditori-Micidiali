import "./globals.css";
import type { Metadata } from "next";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
import CryptoShell from "@/components/CryptoShell";
import { SupabaseProvider } from "@/lib/supabase/SupabaseProvider"; // 👈 AGGIUNGI

export const metadata: Metadata = {
  title: "REPPING",
  description: "REPPING",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <SupabaseProvider> {/* 👈 AGGIUNGI QUESTO WRAPPER */}
          <CryptoProvider>
            <CryptoShell>
              <main>{children}</main>
            </CryptoShell>
          </CryptoProvider>
        </SupabaseProvider> {/* 👈 CHIUDI QUI */}
      </body>
    </html>
  );
}
