// app/layout.tsx (estratto rilevante)
import "@/app/globals.css";
import { CryptoProvider } from "@/lib/crypto/CryptoProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        {/* Unica istanza globale del provider, qui */}
        <CryptoProvider>
          {children}
        </CryptoProvider>
      </body>
    </html>
  );
}
