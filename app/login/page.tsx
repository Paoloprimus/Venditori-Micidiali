"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase/client"; // <- singleton
import { useRouter } from "next/navigation";

export default function Login() {
  // const supabase = createSupabaseBrowser(); // <- rimossa
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ⬇️ nuovi campi per il signup
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // util: salva pass in storage per auto-unlock
  function savePassphrase(pass: string) {
    try {
      // ✅ password salvata temporaneamente per sblocco automatico
      sessionStorage.setItem("repping:pph", pass);
      // In DEV potresti voler persistere tra tab/riaperture:
      // localStorage.setItem("repping:pph", pass);
    } catch {}
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        // 1) Registrazione
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // 2) Se abbiamo già sessione dal signUp, salviamo subito la pass
        if (data.session) {
          savePassphrase(password);
        } else {
          // Altrimenti tentiamo login immediato (se conferma email non è obbligatoria)
          const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
          if (siErr || !si.session) {
            setMsg("Registrazione riuscita. Controlla l'email per confermare l'account, poi accedi.");
            setLoading(false);
            return; // senza sessione l'upsert verrebbe bloccato da RLS
          }
          // login ok -> salviamo pass
          savePassphrase(password);
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
        // Accesso
        // ✅ Salva la password PRIMA del login, così il provider la trova subito
        savePassphrase(password);

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // verifica sessione
        const { data: sessCheck } = await supabase.auth.getSession();
        if (!sessCheck.session) throw new Error("Accesso non riuscito: sessione assente");
      }

      // ⬇️ allinea i cookie lato server (scrive i cookie sb-*)
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) throw new Error("Sessione assente dopo login");

      await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          access_token: sess.session.access_token,
          refresh_token: sess.session.refresh_token,
        }),
        credentials: "same-origin",
      });

      // ✅ Sblocca manualmente la cifratura prima del redirect
if (typeof window !== 'undefined' && (window as any).reppingUnlock) {
  try {
    await (window as any).reppingUnlock(password);
  } catch (e) {
    console.error('[Login] Unlock fallito:', e);
  }
}

// redirect "hard" alla home
window.location.replace("/");

    } catch (err: any) {
      // Se vedi 401 qui, quasi sempre è per sessione assente + RLS
      setMsg(err?.message ?? "Errore.");
      // ✅ fallback di sicurezza: rimuovi la pass se errore
      try { sessionStorage.removeItem("repping:pph"); } catch {}
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
