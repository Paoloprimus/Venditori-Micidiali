// app/layout.tsx
import "./globals.css";
import ClientErrorListener from "./ClientErrorListener";
import { ConversationProvider } from "./context/ConversationContext"; // ⬅️ NUOVO import

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <ClientErrorListener />
        <ConversationProvider>
          {/* Se hai altri Providers, tienili qui dentro oppure qui attorno, come preferisci */}
          {children}
        </ConversationProvider>
      </body>
    </html>
  );
}
