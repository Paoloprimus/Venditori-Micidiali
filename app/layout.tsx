import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIxPMI Assistant",
  description: "Wrapper conversazionale con drawers laterali",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
