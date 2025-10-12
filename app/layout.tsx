// app/layout.tsx (root layout)

"use client";

import "@/lib/crypto/debug-runtime"; // ✅ ora il file esiste davvero
import "./globals.css";
import Providers from "./providers";




export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
