"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase/client"; // <- cambiato
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        // 1) Registrazione
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // 2) Se non abbiamo sessione (es. conferma email attiva), proviamo login immediato
        let uid = data.user?.id;
        if (!data.session) {
          const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
          if (siErr) {
            setMsg("Registrazione riuscita. Controlla l'email per confermare l'account, poi accedi.");
            setLoading(false);
            return; // fermiamoci: senza sessione l'upsert verrebbe bloccato da RLS
          }
          uid = si.user?.id;
        }

        // 3) Upsert profilo (richiede sessione attiva)
        const fn = firstName.trim();
        const ln = lastName.trim();
        if (!fn || !ln) throw new Error("Inserisci nome e cognome per completare la registrazione.");

        const { error: upsertErr } = await supabase
          .from("profiles")
          .upsert({ id: uid!, first_name: fn, last_name: ln }, { onConflict: "id" });
        if (upsertErr) throw upsertErr;

      } else {
        // Accesso
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      await supabase.auth.getSession();
      router.push("/");
      router.refresh();

    } catch (err: any) {
      // Se vedi 401 qui, quasi sempre è per sessione assente + RLS: vedi note sopra
      setMsg(err?.message ?? "Errore.");
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
            <input name="firstName" id="firstName" autoComplete="given-name"
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
            <input name="lastName" id="lastName" autoComplete="family-name"
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

        <input name="email" id="email" autoComplete="username"
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
        <input name="password" id="password"
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
