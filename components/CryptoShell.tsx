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
  const { ready, unlock, prewarm } = useCrypto();
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

  // 🔧 PATCH: fix runtime di debugCrypto.decryptFields buggato (non rimuove nulla)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win: any = window as any;
    const dbg: any = win.debugCrypto;
    if (!dbg || dbg.__df_patch_v3) return;

    // scegli un metodo di decrypt “basso livello” se esiste
    const pick = (...names: string[]) =>
      names.map((n) => [n, dbg?.[n]] as const).find(([, f]) => typeof f === "function")?.[1];

    const lowLevel =
      pick("decryptOne") ||
      pick("decryptField") ||
      pick("decryptValue") ||
      pick("decryptRaw") ||
      pick("decrypt"); // uno dei nomi tipici

    if (!lowLevel) {
      console.warn("[crypto] nessun low-level decrypt trovato; lascio decryptFields invariato");
      return;
    }

    const orig = typeof dbg.decryptFields === "function" ? dbg.decryptFields.bind(dbg) : null;

    dbg.decryptFields = async function patchedDecryptFields(
      scope: string,
      table: string,
      id: string,
      specs: any,
      opts?: any
    ) {
      // normalizza: accetta sia array che object { name: {enc,iv}, ... }
      const list = Array.isArray(specs)
        ? specs
        : Object.keys(specs || {})
            .map((k) => ({ name: k, enc: specs[k]?.enc, iv: specs[k]?.iv }))
            .filter((s) => s.enc && s.iv);

      const out: Record<string, string> = {};
      for (const s of list) {
        let val: any;
        try {
          // firma completa (scope, table, id, enc, iv, opts)
          val = await lowLevel(scope, table, id, s.enc, s.iv, opts);
        } catch {
          try {
            // fallback firma breve (enc, iv)
            val = await lowLevel(s.enc, s.iv);
          } catch (e2) {
            // ultimo tentativo: usa l'originale se disponibile
            if (orig) {
              const res = await orig(scope, table, id, [s], opts);
              if (Array.isArray(res)) {
                const found = res.find((it: any) => it?.name === s.name);
                val = found?.value;
              } else if (res && typeof res === "object") {
                val = (res as any)[s.name];
              }
            } else {
              throw e2;
            }
          }
        }
        out[s.name] = typeof val === "string" ? val : String(val ?? "");
      }
      return out;
    };

    dbg.__df_patch_v3 = true;
    console.log("[crypto] decryptFields patch applicata");
  }, []);

  // API globale di emergenza (debug): window.reppingUnlock("pass")
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).reppingUnlock = async (pass: string) => doUnlock(pass);
    return () => { try { delete (window as any).reppingUnlock; } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
