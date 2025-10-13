// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import Providers from "./providers";

export const metadata = {
  title: "Venditori Micidiali",
  description: "App gestione clienti con cifratura",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        {/* Monta i provider client (Crypto incluso) dentro <body> */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
