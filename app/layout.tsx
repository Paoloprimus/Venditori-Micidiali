// app/layout.tsx - RIPRISTINA
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
            <main>{children}</main>
          </CryptoShell>
        </CryptoProvider>
      </body>
    </html>
  );
}// app/layout.tsx - DISABILITA TUTTO
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "REPPING",
  description: "REPPING",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <noscript>JavaScript disabilitato</noscript>
        <main>{children}</main>
        
        {/* DISABILITA TUTTI GLI SCRIPT */}
        <script dangerouslySetInnerHTML={{ __html: `
          // Disabilita qualsiasi script che si carica dopo
          window.addEventListener('load', function() {
            document.querySelectorAll('script').forEach(script => {
              if (!script.getAttribute('src')?.includes('vercel-insights')) {
                script.remove();
              }
            });
          });
        `}} />
      </body>
    </html>
  );
}
