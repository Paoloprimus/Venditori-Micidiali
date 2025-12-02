"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase/client"; // <- singleton
import { useRouter } from "next/navigation";
import { useCrypto } from "@/lib/crypto/CryptoProvider"; // ✅ 1. Import useCrypto

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  
  // ✅ 2. Ottieni la funzione di sblocco
  const { unlock } = useCrypto(); 

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ⬇️ nuovi campi per il signup
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🗑️ Rimuovi la vecchia funzione savePassphrase
  // La sua logica è stata integrata (e corretta) direttamente in submit().

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    let successSession = false; // Flag per tracciare se il login/signup ha creato una sessione valida

    try {
      if (mode === "signup") {
        // 1) Registrazione
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password, 
            options: { data: { first_name: firstName, last_name: lastName } } 
        });
        if (error) throw error;

        // 2) Se sessione immediata (impostazioni Supabase)
        if (data.session) {
          successSession = true;
        } else {
          // Altrimenti tentiamo login immediato (se conferma email non è obbligatoria)
          const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
          if (siErr || !si.session) {
            setMsg("Registrazione riuscita. Controlla l'email per confermare l'account, poi accedi.");
            setLoading(false);
            return; // senza sessione non possiamo procedere
          }
          successSession = true;
        }

        // 3) Upsert profilo (richiede sessione attiva)
        const { data: sessCheck } = await supabase.auth.getSession();
        if (!sessCheck.session) throw new Error("Sessione assente dopo registrazione");

        const fn = firstName.trim();
        const ln = lastName.trim();
        if (!fn || !ln) throw new Error("Inserisci nome e cognome per completare la registrazione.");

        const { error: upsertErr } = await supabase
          .from("profiles")
          .upsert({ id: sessCheck.session.user.id, first_name: fn, last_name: ln }, { onConflict: "id" });
        if (upsertErr) throw upsertErr;
        
      } else {
        // Accesso (Sign In)
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        successSession = !!data.session;
      }

      // ----------------------------------------------------
      // ➡️ AZIONI CRUCIALI DOPO LOGIN/SIGNUP DI SUCCESSO
      // ----------------------------------------------------
      if (successSession) {
        
        // ⬇️ allinea i cookie lato server (scrive i cookie sb-*)
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) throw new Error("Sessione assente dopo login/signup");

        await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            access_token: sess.session.access_token,
            refresh_token: sess.session.refresh_token,
          }),
          credentials: "same-origin",
        });

        // ✅ 3. Sblocca la cifratura (Passphrase = PW)
        try {
          console.log('[Login] Tentativo di sblocco crittografia con la password...');
          await unlock(password); 
          console.log('[Login] ✅ Unlock completato');
        } catch (cryptoError) {
          console.error('[Login] Unlock fallito (chiavi/passphrase errata):', cryptoError);
          // Non blocchiamo il redirect qui. L'app riproverà in automatico.
        }
        
        // ✅ 4. Memorizza la Passphrase in ENTRAMBI gli storage (più robusto)
        // Salva PRIMA del redirect per garantire che sia scritto
        try {
          // Salva in localStorage PRIMA (più persistente)
          localStorage.setItem("repping:pph", password);
          // Poi in sessionStorage
          sessionStorage.setItem("repping:pph", password);
          
          // 🔧 FIX: Verifica che sia stato salvato (Android può fallire silenziosamente)
          const verifyLocal = localStorage.getItem("repping:pph");
          const verifySession = sessionStorage.getItem("repping:pph");
          
          if (verifyLocal !== password || verifySession !== password) {
            console.warn('[Login] ⚠️ Storage verification failed, retrying...');
            // Retry con flush esplicito
            localStorage.setItem("repping:pph", password);
            sessionStorage.setItem("repping:pph", password);
          }
          
          console.log('[Login] ✅ Passphrase salvata e verificata in storage');
        } catch (storageError) {
          console.error('[Login] ❌ Errore salvataggio storage:', storageError);
          // Non blocchiamo, ma loggiamo l'errore
        }
        
        // ✅ 5. Delay aumentato per Android (300ms invece di 100ms)
        // Alcuni browser Android hanno bisogno di più tempo per scrivere nello storage
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // ✅ 6. Verifica finale prima del redirect
        const finalCheck = localStorage.getItem("repping:pph");
        if (finalCheck !== password) {
          console.error('[Login] ❌ CRITICO: Passphrase non persistita dopo delay!');
          // Salva di nuovo come ultimo tentativo
          try {
            localStorage.setItem("repping:pph", password);
            sessionStorage.setItem("repping:pph", password);
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (e) {
            console.error('[Login] ❌ Fallito anche il retry finale');
          }
        }
        
        // redirect "hard" alla home
        window.location.replace("/");

      } else {
        // Questo ramo gestisce il caso di signup dove è richiesta conferma email
        setMsg("Registrazione riuscita. Controlla l'email per confermare l'account, poi accedi.");
      }

    } catch (err: any) {
      console.error("[Login] Global error:", err);
      setMsg(err?.message ?? "Errore.");
      // ✅ fallback di sicurezza: rimuovi la pass (se fallisce)
      try { sessionStorage.removeItem("repping:pph"); localStorage.removeItem("repping:pph"); } catch {}
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 440, paddingTop: 64 }}>
      <h1 className="title">{mode === "signin" ? "Accedi" : "Registrati"}</h1>
      <p className="helper">Versione Beta 1.0 - Per Utenti Tester - Su Invito</p>

      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {mode === "signup" && (
          <>
            <input
              name="firstName" id="firstName" autoComplete="given-name"
              type="text"
              placeholder="Nome"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={{
                padding: 10, border: "1px solid #1F2937", borderRadius: 10,
                background: "#0B1220", color: "#C9D1E7"
              }}
            />
            <input
              name="lastName" id="lastName" autoComplete="family-name"
              type="text"
              placeholder="Cognome"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={{
                padding: 10, border: "1px solid #1F2937", borderRadius: 10,
                background: "#0B1220", color: "#C9D1E7"
              }}
            />
          </>
        )}

        <input
          name="email" id="email" autoComplete="username"
          type="email"
          placeholder="la-tua-email@esempio.it"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{
            padding: 10, border: "1px solid #1F2937", borderRadius: 10,
            background: "#0B1220", color: "#C9D1E7"
          }}
        />
        <input
          name="password" id="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          type="password"
          placeholder="password (min 6)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{
            padding: 10, border: "1px solid #1F2937", borderRadius: 10,
            background: "#0B1220", color: "#C9D1E7"
          }}
        />

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Attendere…" : mode === "signin" ? "Accedi" : "Registrati"}
        </button>

        <button
          type="button"
          className="iconbtn"
          onClick={() => setMode(m => m === "signin" ? "signup" : "signin")}
          disabled={loading}
        >
          {mode === "signin" ? "Passa a Registrazione" : "Hai già un account? Accedi"}
        </button>

        {msg && <p style={{ color: "#F59E0B" }}>{msg}</p>}
      </form>
    </div>
  );
}
