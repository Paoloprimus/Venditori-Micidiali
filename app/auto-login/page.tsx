"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

/**
 * Auto-login page per demo anonima
 * Riceve credenziali via query params e fa login automatico
 */
export default function AutoLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    async function doLogin() {
      const email = searchParams.get("e");
      const password = searchParams.get("p");

      if (!email || !password) {
        setError("Credenziali mancanti");
        return;
      }

      try {
        // Decodifica credenziali
        const decodedEmail = atob(email);
        const decodedPassword = atob(password);

        // Login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: decodedEmail,
          password: decodedPassword,
        });

        if (signInError) {
          console.error("[AutoLogin] Error:", signInError);
          setError("Errore login: " + signInError.message);
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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f172a",
    }}>
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
    </div>
  );
}
