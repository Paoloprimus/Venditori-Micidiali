// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
import CryptoShell from "@/components/CryptoShell"; // ⬅️ auto-unlock & prewarm

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
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: "1px solid #eee",
              }}
            >
              <strong>La tua App</strong>
              {/* UnlockButton rimosso */}
            </header>

            <main style={{ padding: "12px" }}>{children}</main>
          </CryptoShell>
        </CryptoProvider>
      </body>
    </html>
  );
}
