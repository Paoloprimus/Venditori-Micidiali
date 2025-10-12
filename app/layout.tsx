// app/layout.tsx (root layout)

"use client";

// import "@/lib/crypto/debug-runtime"; // 
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
