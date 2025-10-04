// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
import CryptoShell from "@/components/CryptoShell";

export const metadata: Metadata = {
  title: "REPPING",
  description: "REPPING",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <CryptoProvider>
          <CryptoShell>
            {/* Nessun header o UI extra */}
            <main>{children}</main>
          </CryptoShell>
        </CryptoProvider>
      </body>
    </html>
  );
}
