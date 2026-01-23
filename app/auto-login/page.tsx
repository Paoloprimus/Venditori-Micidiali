"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

/**
 * Contenuto della pagina auto-login
 */
function AutoLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    async function doLogin() {
      const accessToken = searchParams.get("at");
      const refreshToken = searchParams.get("rt");

      if (!accessToken || !refreshToken) {
        setError("Token mancanti");
        return;
      }

      try {
        // Decodifica token
        const decodedAccessToken = atob(accessToken);
        const decodedRefreshToken = atob(refreshToken);

        // Imposta sessione con i token
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: decodedAccessToken,
          refresh_token: decodedRefreshToken,
        });

        if (sessionError) {
          console.error("[AutoLogin] Error:", sessionError);
          setError("Errore sessione: " + sessionError.message);
          return;
        }

        // Setta flag demo
        sessionStorage.setItem("reping:isAnonDemo", "true");
        localStorage.setItem("reping:welcome_shown", "true");
        localStorage.setItem("reping:onboarding_import_done", "true");

        // Redirect alla home
        router.push("/");

      } catch (err: any) {
        console.error("[AutoLogin] Exception:", err);
        setError("Errore: " + err.message);
      }
    }

    doLogin();
  }, [searchParams, router]);

  return (
    <>
      {error ? (
        <div style={{ color: "white", textAlign: "center" }}>
          <p style={{ color: "#ef4444", marginBottom: 16 }}>{error}</p>
          <a href="https://reping.it" style={{ color: "#3b82f6" }}>
            Torna alla home
          </a>
        </div>
      ) : (
        <div style={{ color: "white", textAlign: "center" }}>
          <div style={{
            width: 48,
            height: 48,
            margin: "0 auto 16px",
            border: "4px solid #334155",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p>Accesso in corso...</p>
        </div>
      )}
    </>
  );
}

/**
 * Auto-login page per demo anonima
 * Riceve credenziali via query params e fa login automatico
 */
export default function AutoLoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f172a",
    }}>
      <Suspense fallback={
        <div style={{ color: "white", textAlign: "center" }}>
          <div style={{
            width: 48,
            height: 48,
            margin: "0 auto 16px",
            border: "4px solid #334155",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p>Caricamento...</p>
        </div>
      }>
        <AutoLoginContent />
      </Suspense>
    </div>
  );
}
