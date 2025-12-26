// app/layout.tsx
// Layout ROOT per REPING COPILOT (versione light - SENZA crittografia)
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import type { Metadata, Viewport } from "next";

// ✅ PWA Metadata
export const metadata: Metadata = {
  title: "REPING COPILOT",
  description: "Organizza i tuoi giri visite con POI HoReCa, itinerari e note",
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
  themeColor: "#1e293b", // Slate-800 per COPILOT
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        {children}
        {/* 🍪 Cookie Banner GDPR */}
        <CookieBanner />
      </body>
    </html>
  );
}
