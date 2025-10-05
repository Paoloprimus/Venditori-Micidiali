// app/layout.tsx - MODIFICA TEMPORANEA
import "./globals.css";
import type { Metadata } from "next";
// import { CryptoProvider } from "@/lib/crypto/CryptoProvider"; // 👈 COMMENTA
// import CryptoShell from "@/components/CryptoShell"; // 👈 COMMENTA

export const metadata: Metadata = {
  title: "REPPING",
  description: "REPPING",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        {/* COMMENTA TUTTO IL CRYPTO */}
        {/* <CryptoProvider>
          <CryptoShell>
            <main>{children}</main>
          </CryptoShell>
        </CryptoProvider> */}
        
        {/* SOLO IL CONTENUTO BASE */}
        <main>{children}</main>
      </body>
    </html>
  );
}
