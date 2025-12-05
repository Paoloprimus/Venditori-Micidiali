// app/layout.tsx
import "./globals.css";
import ClientErrorListener from "./ClientErrorListener";
import { ConversationProvider } from "./context/ConversationContext";
import Providers from "./providers"; // ✅ NUOVO: importa i providers con crypto
import TestCompanionPanel from "@/components/TestCompanionPanel";
import CookieBanner from "@/components/CookieBanner";
import type { Metadata, Viewport } from "next";

// Mostra il Test Panel solo se attivo (imposta NEXT_PUBLIC_SHOW_TEST_PANEL=1 in Vercel)
const SHOW_TEST_PANEL = process.env.NEXT_PUBLIC_SHOW_TEST_PANEL === "1";

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
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
    shortcut: "/logo.svg",
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
            {/* 🧪 Test Companion Panel - COMMENTATO per Beta
            {SHOW_TEST_PANEL && <TestCompanionPanel />}
            */}
            {/* 🍪 Cookie Banner GDPR */}
            <CookieBanner />
          </ConversationProvider>
        </Providers>
      </body>
    </html>
  );
}
