"use client";
import { useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Login() {
  const supabase = createSupabaseBrowser();
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

        // 2) Crea/aggiorna profilo (id = user.id)
        const uid = data.user?.id;
        if (uid) {
          const fn = firstName.trim();
          const ln = lastName.trim();
          if (!fn || !ln) {
            throw new Error("Inserisci nome e cognome per completare la registrazione.");
          }
          // upsert per gestire retry o profilo già esistente
          const { error: upsertErr } = await supabase
            .from("profiles")
            .upsert(
              { id: uid, first_name: fn, last_name: ln },
              { onConflict: "id" }
            );
          if (upsertErr) throw upsertErr;
        }

      } else {
        // Accesso
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      router.push("/");
    } catch (err: any) {
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
            <input
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
