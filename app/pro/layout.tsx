// app/pro/layout.tsx
// Layout per REPING PRO (CRM completo con crittografia)
import ClientErrorListener from "@/app/ClientErrorListener";
import { ConversationProvider } from "@/app/context/ConversationContext";
import Providers from "@/app/providers";
import TestCompanionPanel from "@/components/TestCompanionPanel";
import CookieBanner from "@/components/CookieBanner";
import BroadcastToast from "@/components/BroadcastToast";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "REPING PRO",
  description: "CRM completo per agenti di commercio HoReCa",
};

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
    </>
  );
}

