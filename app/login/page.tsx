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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // verifica sessione
        const { data: sessCheck } = await supabase.auth.getSession();
        if (!sessCheck.session) throw new Error("Accesso non riuscito: sessione assente");
        // salva passphrase per auto-unlock
        savePassphrase(password);
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
