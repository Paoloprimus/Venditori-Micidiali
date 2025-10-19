// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import Providers from "./providers";
import ClientErrorListener from "./ClientErrorListener";
import { ConversationProvider } from "./context/ConversationContext";


export const metadata = {
  title: "Venditori Micidiali",
  description: "App gestione clienti con cifratura",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        {/* Monta i provider client (Crypto incluso) dentro <body> */}
        <ClientErrorListener />
        <ConversationProvider>
        {children}
        </ConversationProvider>

      </body>
    </html>
  );
}
