// app/layout.tsx
import "./globals.css";
import ClientErrorListener from "./ClientErrorListener";
import { ConversationProvider } from "./context/ConversationContext";
import Providers from "./providers"; // ✅ NUOVO: importa i providers con crypto
import TestCompanionPanel from "@/components/TestCompanionPanel";

// Mostra il Test Panel solo se attivo (imposta NEXT_PUBLIC_SHOW_TEST_PANEL=1 in Vercel)
const SHOW_TEST_PANEL = process.env.NEXT_PUBLIC_SHOW_TEST_PANEL === "1";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <ClientErrorListener />
        <Providers>
          <ConversationProvider>
            {children}
            {/* 🧪 Test Companion Panel - solo quando attivo */}
            {SHOW_TEST_PANEL && <TestCompanionPanel />}
          </ConversationProvider>
        </Providers>
      </body>
    </html>
  );
}
