// app/site/layout.tsx
// Layout per le pagine marketing (landing page e SEO)

import "../globals.css";
import Script from "next/script";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "REPING - Il CoPilota più intelligente per agenti di commercio",
  description: "Vendi di più, meglio e in meno tempo.",
  keywords: ["agente commercio", "vendite", "HoReCa", "AI", "assistente", "percorsi", "ottimizzazione", "personalizzazione"],
  openGraph: {
    title: "REPING - Il CoPilota più intelligente per agenti di commercio",
    description: "Vendi di più, meglio e in meno tempo.",
    type: "website",
    locale: "it_IT",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Google Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-N8T9F0MPR8"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-N8T9F0MPR8');
        `}
      </Script>
      {children}
    </>
  );
}
