// app/crypto-test/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useCrypto } from "@/lib/crypto/CryptoProvider";

// === Assunzioni (lasciale così) ===
const SCOPE = "table:accounts";
const TABLE = "accounts";

export default function CryptoTestPage() {
  // NB: niente "error" qui; il context non lo espone
  const { ready, unlock, prewarm, crypto: cryptoSvc } = useCrypto();

  // form
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vat, setVat] = useState("");

  const [log, setLog] = useState<string[]>([]);
  const pushLog = (s: string) => setLog((L) => [s, ...L].slice(0, 100));

  // Prepara chiavi dello scope quando sbloccato
  useEffect(() => {
    (async () => {
      if (!ready || !cryptoSvc) return;
      try {
        await cryptoSvc.ensureScope(SCOPE);
        pushLog("Chiavi scope pronte");
      } catch (e: any) {
        pushLog("Errore scope keys: " + (e?.message ?? e));
      }
    })();
  }, [ready, cryptoSvc]);

  async function handleUnlock() {
    try {
      await unlock(pw);           // ⬅️ una sola arg
      await prewarm([SCOPE]);     // ⬅️ poi pre-warm dello scope
      setPw("");
      pushLog("Cifratura sbloccata");
    } catch (e: any) {
      pushLog("Errore sblocco: " + (e?.message ?? e));
    }
  }

  // INSERT cifrata su accounts
  async function handleInsert() {
    if (!ready || !cryptoSvc) return pushLog("Sblocca prima la cifratura");
    if (!name || !email) return pushLog("Inserisci almeno Nome ed Email");

    try {
      const id =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

      // 1) Cifra i campi sensibili (convenzione *_enc / *_iv già presente in tabella)
      const enc = await cryptoSvc.encryptFields(SCOPE, TABLE, id, {
        name,
        email,
        phone: phone || undefined,
        vat_number: vat || undefined,
      });

      // 2) Blind index per email (per ricerca equality)
      const email_bi = await (cryptoSvc as any).computeBlindIndex?.(SCOPE, email);

      // 3) Costruisci la riga da inserire (colonne della tua tabella)
      const row: any = {
        id,
        // cifrati
        name_enc: enc.name_enc,
        name_iv: enc.name_iv,
        email_enc: enc.email_enc,
        email_iv: enc.email_iv,
        // opzionali se forniti
        ...(enc.phone_enc ? { phone_enc: enc.phone_enc, phone_iv: enc.phone_iv } : {}),
        ...(enc.vat_number_enc ? { vat_number_enc: enc.vat_number_enc, vat_number_iv: enc.vat_number_iv } : {}),
        // blind index se disponibile
        ...(email_bi ? { email_bi } : {}),
        // i trigger pensano a user_id/owner_id
      };

      const ins = await supabase.from(TABLE).insert(row).select().single();
      if (ins.error) throw ins.error;

      pushLog("Inserito account cifrato id=" + ins.data.id);
      setName("");
      setEmail("");
      setPhone("");
      setVat("");
    } catch (e: any) {
      pushLog("Errore insert: " + (e?.message ?? e));
    }
  }

  // SELECT per email (via BI) + decifra i campi
  async function handleSearchByEmail() {
    if (!ready || !cryptoSvc) return pushLog("Sblocca prima la cifratura");
    if (!email) return pushLog("Inserisci l'email da cercare");

    try {
      const computeBI = (cryptoSvc as any).computeBlindIndex?.bind(cryptoSvc);
      if (!computeBI) return pushLog("computeBlindIndex non disponibile");

      const probe = await computeBI(SCOPE, email);
      const sel = await supabase
        .from(TABLE)
        .select("*")
        .eq("email_bi", probe)
        .limit(1)
        .maybeSingle();

      if (sel.error) throw sel.error;
      if (!sel.data) return pushLog("Nessun account trovato per quell'email");

      const dec = await cryptoSvc.decryptRow<{
        name?: string;
        email?: string;
        phone?: string;
        vat_number?: string;
      }>(SCOPE, sel.data);

      pushLog(
        `Trovato: name=${dec.name ?? "—"} | email=${dec.email ?? "—"} | phone=${dec.phone ?? "—"} | vat=${dec.vat_number ?? "—"}`
      );
    } catch (e: any) {
      pushLog("Errore search/decifra: " + (e?.message ?? e));
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Crypto Test</h1>

      {!ready && (
        <div className="border rounded p-3 space-y-2">
          <div className="font-medium">Sblocca cifratura</div>
          <input
            type="password"
            className="border rounded p-2 w-full"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button className="bg-blue-600 text-white rounded px-3 py-2" onClick={handleUnlock}>
            Sblocca
          </button>
        </div>
      )}

      {ready && (
        <div className="border rounded p-3 space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <input
              className="border rounded p-2"
              placeholder="Nome (name)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="border rounded p-2"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="border rounded p-2"
              placeholder="Telefono (opzionale)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="border rounded p-2"
              placeholder="Partita IVA (opzionale)"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="bg-green-600 text-white rounded px-3 py-2" onClick={handleInsert}>
              Inserisci cifrato
            </button>
            <button className="bg-gray-800 text-white rounded px-3 py-2" onClick={handleSearchByEmail}>
              Cerca per email (BI)
            </button>
          </div>
        </div>
      )}

      <div className="border rounded p-3">
        <div className="font-medium mb-2">Log</div>
        <ul className="text-sm space-y-1">
          {log.map((l, i) => (
            <li key={i}>• {l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
