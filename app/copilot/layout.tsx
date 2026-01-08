// app/copilot/layout.tsx
// Layout per REPING COPILOT (versione light - nascosta)
import CookieBanner from "@/components/CookieBanner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "REPING COPILOT",
  description: "Organizza i tuoi giri visite con POI HoReCa, itinerari e note",
};

export default function CopilotLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CookieBanner />
    </>
  );
}

