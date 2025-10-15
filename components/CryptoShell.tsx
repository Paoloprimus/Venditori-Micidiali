// components/CryptoShell.tsx
"use client";

import { useEffect, useState } from "react";
import { useCrypto } from "@/lib/crypto/CryptoProvider";
import { supabase } from "@/lib/supabase/client";

const DEFAULT_SCOPES = [
  "table:accounts","table:contacts","table:products",
  "table:profiles","table:notes","table:conversations",
  "table:messages","table:proposals",
];

// Attiva l'auto-reset del keyring SOLO in dev:
// NEXT_PUBLIC_CRYPTO_DEV_AUTO_RESET=1
const DEV_AUTO_RESET =
  typeof process !== "undefined" &&
  (process as any).env?.NEXT_PUBLIC_CRYPTO_DEV_AUTO_RESET === "1";

export default function CryptoShell({ children }: { children: React.ReactNode }) {
  const { ready, unlock, prewarm, crypto } = useCrypto();
  const [unlocking, setUnlocking] = useState(false);

  async function doUnlock(pass: string) {
    if (!pass) return false;
    setUnlocking(true);
    try {
      await unlock(pass);
      await prewarm(DEFAULT_SCOPES);      
      // pulizia pass in memoria persistente
      try { sessionStorage.removeItem("repping:pph"); } catch {}
      try { localStorage.removeItem("repping:pph"); } catch {}
      return true;
    } finally {
      setUnlocking(false);
    }
  }

// Espone in window un helper per decifrare una riga "accounts" dalla console
useEffect(() => {
  if (typeof window === "undefined" || !crypto) return;
  (window as any).cryptoSvc = crypto; // utile se vuoi ispezionare le API
  (window as any).cxDecrypt = async (row: any, scope = "table:accounts") => {
    const fields = ["name", "email", "phone", "vat_number", "notes"];
    const dec = await (crypto as any).decryptFields(scope, "accounts", row.id, row, fields);
    console.log("DEC:", dec);
    return dec;
  };
}, [crypto]);


  
   // 🔧 PATCH: fix runtime di debugCrypto.decryptFields buggato (versione con fallback a decryptRow)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win: any = window as any;
    const dbg: any = win.debugCrypto;
    if (!dbg || dbg.__df_patch_row || typeof dbg === "undefined") return;

    const orig = typeof dbg.decryptFields === "function" ? dbg.decryptFields.bind(dbg) : null;
    const hasDecryptRow = typeof dbg.decryptRow === "function";

    // log diagnostico una sola volta
    try {
      const keys = Object.keys(dbg || {});
      console.log("[crypto] debugCrypto keys:", keys);
    } catch {}

    dbg.decryptFields = async function patchedDecryptFields(
      scope: string,
      table: string,
      id: string,
      specs: any,
      opts?: any
    ) {
      // Normalizza: accetta array [{name,enc,iv}] o object { name: {enc,iv}, ... }
      const list: Array<{ name: string; enc: any; iv: any }> = Array.isArray(specs)
        ? specs
        : Object.keys(specs || {}).map((k) => ({ name: k, enc: specs[k]?.enc, iv: specs[k]?.iv }));

      // Se abbiamo decryptRow, costruiamo una riga sintetica e usiamo quello
      if (hasDecryptRow) {
        const syntheticRow: Record<string, any> = {};
        for (const s of list) {
          if (!s || !s.name) continue;
          syntheticRow[`${s.name}_enc`] = s.enc;
          syntheticRow[`${s.name}_iv`] = s.iv;
        }
        const dec = await dbg.decryptRow(scope, syntheticRow);
        const out: Record<string, string> = {};
        for (const s of list) {
          const v = (dec as any)?.[s.name];
          out[s.name] = typeof v === "string" ? v : String(v ?? "");
        }
        return out;
      }

      // Altrimenti prova l'originale (se c'è): passiamo sempre array
      if (orig) {
        const res = await orig(
          scope,
          table,
          id,
          list.map((s) => ({ name: s.name, enc: s.enc, iv: s.iv })),
          opts
        );

        // Normalizza: può restituire object {name:..} o array [{name,value}]
        if (Array.isArray(res)) {
          const out: Record<string, string> = {};
          for (const item of res) {
            if (item && typeof item === "object" && "name" in item) {
              out[(item as any).name] = String((item as any).value ?? "");
            }
          }
          return out;
        }
        return res as Record<string, string>;
      }

      // Nessuna strada disponibile
      throw new Error("decryptFields non disponibile (né decryptRow né impl. originale)");
    };

    dbg.__df_patch_row = true;
    console.log("[crypto] decryptFields patch (via decryptRow) applicata");
  }, []);


  // API globale di emergenza (debug): window.reppingUnlock("pass")
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).reppingUnlock = async (pass: string) => doUnlock(pass);
    return () => { try { delete (window as any).reppingUnlock; } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

// Expose supabase client for console debugging (non-distruttivo)
useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    (window as any).sb = supabase;
    // console.log("🔧 window.sb esposto"); // opzionale
  } catch {}
}, []);


  
  // Auto-unlock: prende la passphrase dal login (session/localStorage) e prova.
  // Ritenta automaticamente qualche volta (es. dopo redirect).
  useEffect(() => {
    if (ready || unlocking) return;

    let cancelled = false;
    let attempts = 0;

    const run = async () => {
      while (!cancelled && !ready && attempts < 4) {
        attempts++;
        const pass =
          typeof window !== "undefined"
            ? (sessionStorage.getItem("repping:pph") || localStorage.getItem("repping:pph") || "")
            : "";

        if (pass) {
          try {
            const ok = await doUnlock(pass);
            if (ok) return;
          } catch (e: any) {
            const msg = String(e?.message || e || "");
            const opErr = /OperationError/i.test(msg);
            if (opErr && DEV_AUTO_RESET) {
              // Auto-reset keyring in DEV se le chiavi sono corrotte/incompatibili
              try {
                const { data: u } = await supabase.auth.getUser();
                const userId = u?.user?.id;
                if (userId) {
                  const res = await fetch("/api/crypto/force-reset", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ userId }),
                    credentials: "same-origin",
                  });
                  if (res.ok) {
                    // riprova subito dopo il reset
                    const ok2 = await doUnlock(pass);
                    if (ok2) return;
                  }
                }
              } catch {}
            }
          }
        }

        // backoff breve: 150ms, 300ms, 600ms...
        await new Promise(r => setTimeout(r, 150 * Math.pow(2, attempts - 1)));
      }
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, unlocking]);

  // Non blocchiamo mai la UI: /clients pensa al proprio loader.
  return <>{children}</>;
}
