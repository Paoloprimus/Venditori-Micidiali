// app/layout.tsx (root layout)
import "./globals.css";
import Providers from "./providers";
// importa il runtime che fa:  window.debugCrypto = { ... }
import "@/lib/crypto/debug-runtime"; // <-- usa il percorso reale del tuo file

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
