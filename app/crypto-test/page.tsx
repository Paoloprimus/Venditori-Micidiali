// app/crypto-test/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useCrypto } from "../../lib/crypto/CryptoProvider";
import { useEffect } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SCOPE = "table:accounts";
const TABLE = "accounts";

/** Helpers per BI: base64 -> hex (con prefisso \\x per bytea) */
function b64ToU8(b64: string): Uint8Array {
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const s = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function u8ToHex(u8: Uint8Array): string {
  return Array.from(u8).map(x => x.toString(16).padStart(2, "0")).join("");
}
/** Restituisce sia base64 (per BI salvati come text) che \\xHEX (per BI salvati come bytea) */
function biDualRepr(b64: string) {
  const hex = u8ToHex(b64ToU8(b64));
  return { asText: b64, asBytea: "\\x" + hex };
}

export default function CryptoTestPage() {
  const { ready, crypto } = useCrypto();
  const [name, setName] = useState("Pasticceria Verdi");
  const [email, setEmail] = useState("info@verdi.it");
  const [phone, setPhone] = useState("+39 045 1234567");
  const [vat, setVat] = useState("IT01234567890");

  const [searchEmail, setSearchEmail] = useState("info@verdi.it");

  const [log, setLog] = useState<string>("");
  const [results, setResults] = useState<{ id: string; name?: string; email?: string }[]>([]);

const [authInfo, setAuthInfo] = useState<string>("(verifico login...)");
useEffect(() => {
  (async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    setAuthInfo(uid ? `Logged in ✅ uid=${uid}` : "Anonimo ❌ (fai login)");
  })();
}, []);
  
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

      // 1) cifra i campi
      const enc = await crypto.encryptFields(SCOPE, TABLE, null, {
        name,
        email,
        phone,
        vat_number: vat,
      });

      // 2) BI (due rappresentazioni: testo base64 E bytea esadecimale)
      const nameBI = biDualRepr(await crypto.blindIndex(SCOPE, name));
      const emailBI = biDualRepr(await crypto.blindIndex(SCOPE, email));
      const phoneBI = biDualRepr(await crypto.blindIndex(SCOPE, phone));
      const vatBI = biDualRepr(await crypto.blindIndex(SCOPE, vat));

      // 3) insert (proviamo prima in formato bytea; se la colonna è text Postgres lo accetta comunque come stringa)
      const payload: any = {
        name_enc: enc.name_enc, name_iv: enc.name_iv, name_bi: nameBI.asBytea,
        email_enc: enc.email_enc, email_iv: enc.email_iv, email_bi: emailBI.asBytea,
        phone_enc: enc.phone_enc, phone_iv: enc.phone_iv, phone_bi: phoneBI.asBytea,
        vat_number_enc: enc.vat_number_enc, vat_number_iv: enc.vat_number_iv, vat_number_bi: vatBI.asBytea,
      };

      const { data, error, status } = await supabase.from(TABLE).insert([payload]).select("id").single();

      if (error) {
        // Se fallisce (es. type mismatch o RLS), riprova salvando BI come text base64
        appendLog(`⚠️ INSERT (bytea) fallita [${status}]: ${error.message}. Riprovo come text…`);

        const payloadText: any = {
          name_enc: enc.name_enc, name_iv: enc.name_iv, name_bi: nameBI.asText,
          email_enc: enc.email_enc, email_iv: enc.email_iv, email_bi: emailBI.asText,
          phone_enc: enc.phone_enc, phone_iv: enc.phone_iv, phone_bi: phoneBI.asText,
          vat_number_enc: enc.vat_number_enc, vat_number_iv: enc.vat_number_iv, vat_number_bi: vatBI.asText,
        };
        const retry = await supabase.from(TABLE).insert([payloadText]).select("id").single();
        if (retry.error) {
          appendLog(`❌ INSERT fallita anche come text: ${retry.error.message} (status ${retry.status}).`);
          // Tip: se status 401/403 è **RLS**: serve policy che permetta INSERT all’utente loggato.
          return;
        } else {
          appendLog(`✅ Creato record (text) id: ${retry.data.id}`);
        }
      } else {
        appendLog(`✅ Creato record (bytea) id: ${data.id}`);
      }
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

      // 1) preparo entrambe le sonde (text e bytea)
      const probe = biDualRepr(await crypto.blindIndex(SCOPE, searchEmail));

      // 2) query: tentiamo match su entrambe le rappresentazioni con OR
      //    NB: PostgREST usa filtro 'or' in una stringa.
      const { data, error, status } = await supabase
        .from(TABLE)
        .select("id, name_enc, name_iv, email_enc, email_iv")
        .or(`email_bi.eq.${probe.asBytea},email_bi.eq.${probe.asText}`)
        .limit(10);

      if (error) {
        appendLog(`❌ SELECT fallita [${status}]: ${error.message}`);
        // Tip: se status 401/403 → RLS blocca la SELECT
        return;
      }

      if (!data || data.length === 0) {
        appendLog("ℹ️ Nessun risultato (controlla: 1) INSERT riuscita? 2) RLS consente SELECT? 3) Inserisci la stessa email).");
        return;
      }

      // 3) decifra
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
      
<p style={{opacity:.8}}>Auth: {authInfo}</p>
      
      <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>1) Crea account cifrato</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label><div>Nome</div><input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} /></label>
          <label><div>Email</div><input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} /></label>
          <label><div>Telefono</div><input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%" }} /></label>
          <label><div>VAT</div><input value={vat} onChange={(e) => setVat(e.target.value)} style={{ width: "100%" }} /></label>
        </div>
        <button onClick={onCreate} style={{ marginTop: 12 }}>+ Crea account cifrato</button>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
          In DB vedrai solo colonne cifrate (name_enc/email_enc/...) e i blind index (name_bi/email_bi/...) come bytea (\\xHEX) o text (base64).
        </p>
      </section>

      <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>2) Cerca per email (blind index)</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} placeholder="email da cercare" style={{ flex: 1 }} />
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
        Nota: se nel log vedi status 401/403 su INSERT/SELECT, devi aggiungere/adeguare le policy RLS su <code>accounts</code> per l'utente autenticato.
      </p>
    </div>
  );
}
