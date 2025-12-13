// app/(marketing)/layout.tsx
// Layout per le pagine marketing (landing page)

import "../globals.css";
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

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}
