// app/crypto-test/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useCrypto } from "../../lib/crypto/CryptoProvider";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// SCOPE/TABLE per questa pagina di test
const SCOPE = "table:accounts";
const TABLE = "accounts";

export default function CryptoTestPage() {
  const { ready, crypto } = useCrypto();

  // campi input
  const [name, setName] = useState("Pasticceria Verdi");
  const [email, setEmail] = useState("info@verdi.it");
  const [phone, setPhone] = useState("+39 045 1234567");
  const [vat, setVat] = useState("IT01234567890");

  const [searchEmail, setSearchEmail] = useState("info@verdi.it");

  // output messaggi/risultati
  const [log, setLog] = useState<string>("");
  const [results, setResults] = useState<{ id: string; name?: string; email?: string }[]>([]);

  function appendLog(s: string) {
    setLog((prev) => (prev ? prev + "\n" : "") + s);
  }

  async function onCreate() {
    try {
      setResults([]);
      if (!ready || !crypto) {
        alert("Prima clicca '🔒 Sblocca dati' in alto per attivare la cifratura.");
        return;
      }

      // 1) cifro i campi
      const enc = await crypto.encryptFields(SCOPE, TABLE, null, {
        name,
        email,
        phone,
        vat_number: vat,
      });

      // 2) blind index per ricerche per uguaglianza
      const name_bi = await crypto.blindIndex(SCOPE, name);
      const email_bi = await crypto.blindIndex(SCOPE, email);
      const phone_bi = await crypto.blindIndex(SCOPE, phone);
      const vat_bi = await crypto.blindIndex(SCOPE, vat);

      // 3) insert (solo colonne cifrate + BI)
      const payload: any = {
        name_enc: enc.name_enc,
        name_iv: enc.name_iv,
        name_bi,
        email_enc: enc.email_enc,
        email_iv: enc.email_iv,
        email_bi,
        phone_enc: enc.phone_enc,
        phone_iv: enc.phone_iv,
        phone_bi,
        vat_number_enc: enc.vat_number_enc,
        vat_number_iv: enc.vat_number_iv,
        vat_number_bi: vat_bi,
      };

      const { data, error } = await supabase.from(TABLE).insert([payload]).select("id").single();
      if (error) throw error;
      appendLog(`✅ Creato record con id: ${data.id}`);
    } catch (e: any) {
      console.error(e);
      appendLog(`❌ Errore CREATE: ${e?.message || e}`);
    }
  }

  async function onSearch() {
    try {
      setResults([]);
      if (!ready || !crypto) {
        alert("Prima clicca '🔒 Sblocca dati' in alto per attivare la cifratura.");
        return;
      }

      // 1) preparo la sonda BI dell'email cercata
      const probe = await crypto.blindIndex(SCOPE, searchEmail);

      // 2) query per BI
      const { data, error } = await supabase
        .from(TABLE)
        .select("id, name_enc, name_iv, email_enc, email_iv")
        .eq("email_bi", probe)
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        appendLog("ℹ️ Nessun risultato.");
        return;
      }

      // 3) decifro i campi richiesti
      const out: { id: string; name?: string; email?: string }[] = [];
      for (const row of data) {
        const dec = await crypto.decryptFields(SCOPE, TABLE, row.id ?? null, row, ["name", "email"]);
        out.push({ id: row.id, name: dec.name ?? "", email: dec.email ?? "" });
      }
      setResults(out);
      appendLog(`🔎 Trovati ${out.length} record per email = ${searchEmail}`);
    } catch (e: any) {
      console.error(e);
      appendLog(`❌ Errore SEARCH: ${e?.message || e}`);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
      <h1>Test cifratura — Accounts</h1>
      <p style={{ opacity: 0.8 }}>
        Stato cifratura: {ready ? "🔓 attiva" : "🔒 da sbloccare (usa il bottone in alto)"}
      </p>

      <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>1) Crea account cifrato</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label>
            <div>Nome</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
          </label>
          <label>
            <div>Email</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
          </label>
          <label>
            <div>Telefono</div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%" }} />
          </label>
          <label>
            <div>VAT</div>
            <input value={vat} onChange={(e) => setVat(e.target.value)} style={{ width: "100%" }} />
          </label>
        </div>
        <button onClick={onCreate} style={{ marginTop: 12 }}>+ Crea account cifrato</button>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
          In DB vedrai solo colonne cifrate (name_enc/email_enc/...) e i blind index (name_bi/email_bi/...).
        </p>
      </section>

      <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>2) Cerca per email (blind index)</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="email da cercare"
            style={{ flex: 1 }}
          />
          <button onClick={onSearch}>🔎 Cerca</button>
        </div>

        {results.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>ID</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Name (decifrato)</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Email (decifrata)</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "6px 0" }}>{r.id}</td>
                    <td style={{ padding: "6px 0" }}>{r.name}</td>
                    <td style={{ padding: "6px 0" }}>{r.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Log</h3>
        <pre style={{ background: "#fafafa", padding: 12, borderRadius: 6, minHeight: 100 }}>{log}</pre>
      </section>

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        Nota: assicurati che le policy RLS su <code>accounts</code> consentano a questo utente di INSERT/SELECT.
      </p>
    </div>
  );
}
