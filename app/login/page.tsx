"use client";
import { useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Login() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/");
    } catch (err: any) { setMsg(err.message ?? "Errore."); }
  }

  return (
    <div className="container" style={{ maxWidth: 440, paddingTop: 64 }}>
      <h1 className="title">{mode === "signin" ? "Accedi" : "Registrati"}</h1>
      <p className="helper">Versione Beta 1.0 - Per Tester SU INVITO</p>
      <form onSubmit={submit} style={{ display:"grid", gap:12, marginTop:16 }}>
        <input type="email" placeholder="la-tua-email@esempio.it" value={email} onChange={e=>setEmail(e.target.value)}
          required style={{ padding:10, border:"1px solid #1F2937", borderRadius:10, background:"#0B1220", color:"#C9D1E7" }}/>
        <input type="password" placeholder="password (min 6)" value={password} onChange={e=>setPassword(e.target.value)}
          required style={{ padding:10, border:"1px solid #1F2937", borderRadius:10, background:"#0B1220", color:"#C9D1E7" }}/>
        <button className="btn" type="submit">{mode === "signin" ? "Accedi" : "Registrati"}</button>
        <button type="button" className="iconbtn" onClick={()=>setMode(m=>m==="signin"?"signup":"signin")}>
          {mode === "signin" ? "Passa a Registrazione" : "Hai già un account? Accedi"}
        </button>
        {msg && <p style={{ color:"#F59E0B" }}>{msg}</p>}
      </form>
    </div>
  );
}
