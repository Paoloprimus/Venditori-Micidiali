// app/driving/page.tsx
// ⚠️ DEPRECATO - Ora usa DialogOverlay nella chat
// Redirect automatico alla home con attivazione Dialogo
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DrivingModePage() {
  const router = useRouter();

  useEffect(() => {
    // Setta flag per attivare dialogo e redirect
    localStorage.setItem('activate_dialog_mode', 'true');
    window.dispatchEvent(new CustomEvent('repping:activateDialog'));
    router.replace('/');
  }, [router]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
        <div style={{ fontSize: 18 }}>Avvio Dialogo...</div>
      </div>
    </div>
  );
}
