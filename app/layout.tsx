// app/layout.tsx
import "./globals.css";
import ClientErrorListener from "./ClientErrorListener";
import { ConversationProvider } from "./context/ConversationContext";
import Providers from "./providers"; // ✅ NUOVO: importa i providers con crypto

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <ClientErrorListener />
        <Providers>
          <ConversationProvider>
            {children}
          </ConversationProvider>
        </Providers>
      </body>
    </html>
  );
}
