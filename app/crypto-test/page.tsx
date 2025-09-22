// app/crypto-test/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useCrypto } from "../../lib/crypto/CryptoProvider";

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

      const enc = await crypto.encryptFields(SCOPE, TABLE, null, {
        name,
        email,
        phone,
        vat_number: vat,
      });

      const nameBI = biDualRepr(await crypto.blindIndex(SCOPE, name));
      const emailBI = biDualRepr(await crypto.blindIndex(SCOPE, email));
      const phoneBI = biDualRepr(await crypto.blindIndex(SCOPE, phone));
      const vatBI = biDualRepr(await crypto.blindIndex(SCOPE, vat));

      const payload: any = {
        name_enc: enc.name_enc, name_iv: enc.name_iv, name_bi: nameBI.asBytea,
        email_enc: enc.email_enc, email_iv: enc.email_iv, email_bi: emailBI.asBytea,
        phone_enc: enc.phone_enc, phone_iv: enc.phone_iv, phone_bi: phoneBI.asBytea,
        vat_number_enc: enc.vat_number_enc, vat_number_iv: enc.vat_number_iv, vat_number_bi: vatBI.asBytea,
      };

      const { data, error, status } = await supabase.from(TABLE).insert([payload]).select("id").single();

      if (error) {
        appendLog(`⚠️ INSERT (bytea) fallita [${status}]: ${error.message}. Riprovo come text…`);
        const payloadText: any = {
          name_enc: enc.name_enc, name_iv: enc.name_iv, name_bi: nameBI.asText,
          email_enc: enc.email_enc, email_iv: enc.email_iv, email
