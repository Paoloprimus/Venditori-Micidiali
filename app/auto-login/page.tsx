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
      const emailParam = searchParams.get("e");
      const passwordParam = searchParams.get("p");

      if (!emailParam || !passwordParam) {
        setError("Credenziali mancanti");
        return;
      }

      try {
        // Decodifica credenziali
        const email = atob(emailParam);
        const password = atob(passwordParam);

        console.log("[AutoLogin] Logging out any existing session...");
        
        // Prima logout da eventuali sessioni esistenti e pulisci storage
        await supabase.auth.signOut();
        sessionStorage.clear();
        localStorage.removeItem("repping:pph");
        
        console.log("[AutoLogin] Signing in with email/password...");
        
        // Login con credenziali
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error("[AutoLogin] signIn error:", signInError);
          setError("Errore login: " + signInError.message);
          return;
        }

        console.log("[AutoLogin] SignIn success, user:", data.user?.id);

        if (!data.session) {
          console.error("[AutoLogin] No session after signIn!");
          setError("Sessione non creata. Riprova.");
          return;
        }

        // Setta flag demo
        sessionStorage.setItem("reping:isAnonDemo", "true");
        localStorage.setItem("reping:welcome_shown", "true");
        localStorage.setItem("reping:onboarding_import_done", "true");

        console.log("[AutoLogin] Flags set, redirecting to /");
        
        // Aspetta che la sessione sia salvata, poi redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.href = "/";

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
