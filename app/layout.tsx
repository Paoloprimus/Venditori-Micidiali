// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";
import UnlockButton from "@/components/UnlockButton"; // lo creiamo al passo 3

export const metadata: Metadata = {
  title: "La tua App",
  description: "Repping",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <CryptoProvider>
          <header style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",borderBottom:"1px solid #eee"}}>
            <strong>La tua App</strong>
            <UnlockButton />
          </header>
          <main style={{padding:"12px"}}>{children}</main>
        </CryptoProvider>
      </body>
    </html>
  );
}
