// app/layout.tsx
import "./globals.css";
import ClientErrorListener from "./ClientErrorListener";
import { ConversationProvider } from "./context/ConversationContext";
import Providers from "./providers"; // ✅ NUOVO: importa i providers con crypto
import TestCompanionPanel from "@/components/TestCompanionPanel";
import CookieBanner from "@/components/CookieBanner";
import type { Metadata, Viewport } from "next";

// ✅ PWA Metadata
export const metadata: Metadata = {
  title: "REPING",
  description: "Assistente AI per agenti di commercio HoReCa",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "REPING",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
    ],
    shortcut: "/favicon.png",
  },
};

// ✅ Viewport ottimizzato per mobile
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <ClientErrorListener />
        <Providers>
          <ConversationProvider>
            {children}
            {/* 🧪 Test Companion Panel - Attivo per tester (auto-hide per non-tester) */}
            <TestCompanionPanel />
            {/* 🍪 Cookie Banner GDPR */}
            <CookieBanner />
          </ConversationProvider>
        </Providers>
      </body>
    </html>
  );
}
