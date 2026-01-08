// app/layout.tsx
// Layout ROOT per REPING (CRM completo con crittografia)
import "./globals.css";
import ClientErrorListener from "@/app/ClientErrorListener";
import { ConversationProvider } from "@/app/context/ConversationContext";
import Providers from "@/app/providers";
import TestCompanionPanel from "@/components/TestCompanionPanel";
import CookieBanner from "@/components/CookieBanner";
import BroadcastToast from "@/components/BroadcastToast";
import type { Metadata, Viewport } from "next";

// ✅ PWA Metadata
export const metadata: Metadata = {
  title: "REPING",
  description: "CRM intelligente per agenti di commercio",
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
  themeColor: "#2563eb", // Blue-600 per REPING
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <ClientErrorListener />
        <Providers>
          <ConversationProvider>
            {children}
            {/* 🧪 Test Companion Panel */}
            <TestCompanionPanel />
            {/* 🍪 Cookie Banner GDPR */}
            <CookieBanner />
            {/* 📢 Broadcast Toast */}
            <BroadcastToast />
          </ConversationProvider>
        </Providers>
      </body>
    </html>
  );
}
