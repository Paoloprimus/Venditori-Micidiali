// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/appName";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s — ${APP_NAME}`, // es: "Dashboard — Repping"
  },
  applicationName: APP_NAME,
  openGraph: {
    siteName: APP_NAME,
    title: APP_NAME,
  },
  twitter: {
    title: APP_NAME,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
