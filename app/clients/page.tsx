// app/clients/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useCrypto } from "@/lib/crypto/CryptoProvider";

// helper: prendi sempre la decryptFields “viva” da window.debugCrypto
function getDbg(): any | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).debugCrypto ?? null;
}


// Tipi
type RawAccount = {
  id: string;
  created_at: string;

  // plain (opzionali)
  name?: string; email?: string; phone?: string; vat_number?: string; notes?: string;

  // encrypted (opzionali)
  name_enc?: any; name_iv?: any;
  email_enc?: any; email_iv?: any;
  phone_enc?: any; phone_iv?: any;
  vat_number_enc?: any; vat_number_iv?: any;
  notes_enc?: any; notes_iv?: any;
};



type PlainAccount = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  vat_number: string;
  notes: string;
};

const PAGE_SIZE = 25;
type SortKey = "name" | "email" | "phone" | "vat_number" | "created_at";

const DEFAULT_SCOPES = [
  "table:accounts", "table:contacts", "table:products",
  "table:profiles", "table:notes", "table:conversations",
  "table:messages", "table:proposals",
];

export default function ClientsPage(): JSX.Element {
  const { crypto, ready, unlock, prewarm } = useCrypto();

const actuallyReady = ready || !!(crypto as any)?.isUnlocked?.();

  
  // ready "reale": se il provider non ha aggiornato lo stato ma il servizio è sbloccato, considera pronto
  const [rows, setRows] = useState<PlainAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);

  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [q, setQ] = useState<string>("");

  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  const [diag, setDiag] = useState({ auth: "", ready: false, passInStorage: false, unlockAttempts: 0, loaded: 0 });
  const unlockingRef = useRef(false);

  const [pass, setPass] = useState("");


  // 🔐 (disattivato) Auto-unlock locale in /clients: lasciamo che ci pensi il CryptoProvider
useEffect(() => {
  if (!authChecked) return;

  const pass =
    typeof window !== "undefined"
      ? (sessionStorage.getItem("repping:pph") || localStorage.getItem("repping:pph") || "")
      : "";

  setDiag((d) => ({ ...d, passInStorage: !!pass }));
  // Non facciamo nulla qui. Niente unlock/prewarm: evita doppie aperture e OperationError.
}, [authChecked]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;
      if (error) {
        setUserId(null);
        setDiag((d) => ({ ...d, auth: `getUser error: ${error.message}` }));
      } else {
        const uid = data.user?.id ?? null;
        setUserId(uid);
        setDiag((d) => ({ ...d, auth: uid ? "ok" : "null" }));
      }
      setAuthChecked(true);
    })();
    return () => { alive = false; };
  }, []);

// 🔐 Auto-unlock dal login: legge la pass da session/localStorage e sblocca + prewarm (con mini-retry)
useEffect(() => {
  if (!authChecked) return;       // aspetta check auth
  // Controlla se è davvero unlocked, non fare affidamento su ready
if (crypto && typeof crypto.isUnlocked === 'function' && crypto.isUnlocked()) {
  console.log('[/clients] Crypto già unlocked, skip auto-unlock');
  return;
}
  if (unlockingRef.current) return;

  const readPass = () =>
    typeof window !== "undefined"
      ? (sessionStorage.getItem("repping:pph") ||
         localStorage.getItem("repping:pph") || "")
      : "";

  (async () => {
    // mini-retry: fino a 5 tentativi ogni 200ms (≈1s totale) per evitare gare di timing
    let pass = readPass();
    let tries = 0;
    while (!pass && tries < 5) {
      await new Promise(r => setTimeout(r, 200));
      pass = readPass();
      tries++;
    }

    setDiag((d) => ({ ...d, passInStorage: !!pass }));
    if (!pass) return;

    try {
      unlockingRef.current = true;
      setDiag((d) => ({ ...d, unlockAttempts: (d.unlockAttempts ?? 0) + 1 }));

      await unlock(pass);
      await prewarm(DEFAULT_SCOPES);

      // cleanup ritardato: evitiamo di cancellare la pass troppo presto
      try { setTimeout(() => sessionStorage.removeItem("repping:pph"), 10000); } catch {}
      try { setTimeout(() => localStorage.removeItem("repping:pph"), 10000); } catch {}
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      // non spammiamo OperationError "falso positivo"
      if (!/OperationError/i.test(msg)) {
        console.error("[/clients] unlock failed:", e);
      }
    } finally {
      unlockingRef.current = false;
    }
  })();
}, [authChecked, ready, unlock, prewarm]);


async function loadPage(p: number): Promise<void> {
  if (!crypto || !userId) return;
  setLoading(true);
  const from = p * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("accounts")
    .select(
      "id,created_at," +
      "name," +
      "name_enc,name_iv," +
      "email_enc,email_iv," +
      "phone_enc,phone_iv," +
      "vat_number_enc,vat_number_iv," +
      "notes_enc,notes_iv"
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[/clients] load error:", error);
    setLoading(false);
    return;
  }

  // ✅ Forza creazione scope keys PRIMA di decifrare
  try {
    console.log('[/clients] 🔧 Creo scope keys prima di decifrare...');
    await (crypto as any).getOrCreateScopeKeys('table:accounts');
    console.log('[/clients] ✅ Scope keys creati');
  } catch (e) {
    console.error('[/clients] ❌ Errore creazione scope keys:', e);
  }

  // DEBUG logs (opzionali, puoi rimuoverli dopo il test)
  if (data && data.length > 0) {
    const firstRecord = data[0] as any;
    console.log('🔍 [DEBUG] Primo record RAW:', firstRecord.name_enc?.substring(0, 20) + '...');
  }
    
  const rowsAny = (data ?? []) as any[];
  const plain: PlainAccount[] = [];

  for (const r0 of rowsAny) {
    const r = r0 as RawAccount;
    try {
      const hasEncrypted =
        !!(r.name_enc || r.email_enc || r.phone_enc || r.vat_number_enc || r.notes_enc);

      if (!hasEncrypted) {
        plain.push({
          id: r.id,
          created_at: r.created_at,
          name: String(r.name ?? ""),
          email: String(r.email ?? ""),
          phone: String(r.phone ?? ""),
          vat_number: String(r.vat_number ?? ""),
          notes: String(r.notes ?? ""),
        });
        continue;
      }

      // 🔧 FIX: Converti hex-string in base64
      const hexToBase64 = (hexStr: any): string => {
        if (!hexStr || typeof hexStr !== 'string') return '';
        if (!hexStr.startsWith('\\x')) return hexStr;
        
        const hex = hexStr.slice(2);
        const bytes = hex.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
        return bytes;
      };
      
      const recordForDecrypt = {
        ...r,
        name_enc: hexToBase64(r.name_enc),
        name_iv: hexToBase64(r.name_iv),
        email_enc: hexToBase64(r.email_enc),
        email_iv: hexToBase64(r.email_iv),
        phone_enc: hexToBase64(r.phone_enc),
        phone_iv: hexToBase64(r.phone_iv),
        vat_number_enc: hexToBase64(r.vat_number_enc),
        vat_number_iv: hexToBase64(r.vat_number_iv),
        notes_enc: hexToBase64(r.notes_enc),
        notes_iv: hexToBase64(r.notes_iv),
      };

      if (typeof (crypto as any)?.decryptFields !== "function") {
        throw new Error("decryptFields non disponibile");
      }
      
      const toObj = (x: any): Record<string, unknown> =>
        Array.isArray(x)
          ? x.reduce((acc: Record<string, unknown>, it: any) => {
              if (it && typeof it === "object" && "name" in it) acc[it.name] = it.value ?? "";
              return acc;
            }, {})
          : ((x ?? {}) as Record<string, unknown>);

      const decAny = await (crypto as any).decryptFields(
        "table:accounts", "accounts", recordForDecrypt.id, recordForDecrypt,
        ["name", "email", "phone", "vat_number", "notes"]
      );
      const dec = toObj(decAny);

      plain.push({
        id: r.id,
        created_at: r.created_at,
        name:       String(dec.name ?? ""),
        email:      String(dec.email ?? ""),
        phone:      String(dec.phone ?? ""),
        vat_number: String(dec.vat_number ?? ""),
        notes:      String(dec.notes ?? ""),
      });
    } catch (e) {
      console.warn("[/clients] decrypt error for", r.id, e);
      plain.push({
        id: r.id,
        created_at: r.created_at,
        name: "", email: "", phone: "", vat_number: "", notes: "",
      });
    }
  }

  console.log("[/clients] plain len:", plain.length);
console.log("[/clients] sample completo:", JSON.stringify(plain[0], null, 2));
console.log("[/clients] nomi di tutti i clienti:", plain.map(p => p.name));

  setRows(plain);
  setLoading(false);
  setDiag((d) => ({ ...d, loaded: plain.length }));
}

// carica la pagina 0 appena la cifratura è sbloccata e c'è l'utente
useEffect(() => {
  if (!actuallyReady || !crypto || !userId) return;
  loadPage(0);
  setPage(0);
}, [actuallyReady, crypto, userId]);

// pagina successiva/precedente
useEffect(() => {
  if (!actuallyReady || !crypto || !userId) return;
  loadPage(page);
}, [page, actuallyReady, crypto, userId]);

  
  const view: PlainAccount[] = useMemo(() => {
    const norm = (s: string) => (s || "").toLocaleLowerCase();
    let arr = [...rows];
    if (q.trim()) {
      const qq = norm(q);
      arr = arr.filter((r) =>
        norm(r.name).includes(qq) ||
        norm(r.email).includes(qq) ||
        norm(r.phone).includes(qq) ||
        norm(r.vat_number).includes(qq) ||
        norm(r.notes).includes(qq)
      );
    }
    arr.sort((a, b) => {
      let va: string | number = a[sortBy] ?? "";
      let vb: string | number = b[sortBy] ?? "";
      if (sortBy === "created_at") {
        va = new Date(a.created_at).getTime();
        vb = new Date(b.created_at).getTime();
      }
      return sortDir === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (vb < va ? -1 : vb > va ? 1 : 0);
    });
    return arr;
  }, [rows, q, sortBy, sortDir]);

  if (!authChecked) {
    return <div className="p-6 text-gray-600">Verifico sessione…</div>;
  }

  if (!userId) {
    return (
      <div className="p-6">
        <div className="mb-2 font-semibold">Sessione non attiva</div>
        <p className="text-sm text-gray-600">
          Effettua di nuovo l'accesso per vedere i tuoi clienti.
        </p>
        <button className="px-3 py-2 rounded border mt-3" onClick={() => window.location.href = "/login"}>
          Vai al login
        </button>
      </div>
    );
  }

if (!actuallyReady || !crypto) {
  return (
    <div className="p-6 max-w-md space-y-3">
      <h2 className="text-lg font-semibold">🔐 Sblocca i dati cifrati</h2>
      <p className="text-sm text-gray-600">
        Inserisci la tua passphrase per sbloccare la cifratura client-side (valida per questa sessione).
      </p>
      <input
        type="password"
        className="border rounded p-2 w-full"
        placeholder="Passphrase"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
      />
      <button
        className="px-3 py-2 rounded border"
        onClick={async () => {
          try {
            await unlock(pass);
            await prewarm([
              "table:accounts","table:contacts","table:products","table:profiles",
              "table:notes","table:conversations","table:messages","table:proposals",
            ]);
            await loadPage(0);           // ← aggiungi questa riga
            setPage(0);                  // opzionale, ma comodo
            setPass("");
            setPass("");
          } catch (e) {
            console.error("[/clients] unlock failed:", e);
            alert("Passphrase non valida o sblocco fallito.");
          }
        }}
      >
        Sblocca
      </button>
      <div className="text-xs text-gray-500">
        auth:{diag.auth} · ready:{String(ready)} · loaded:{diag.loaded}
      </div>
    </div>
  );
}


  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="text-xs text-gray-500">
        auth:{diag.auth ?? "…"} · ready:{String(ready)} · passInStorage:{String(diag.passInStorage ?? false)} · attempts:{diag.unlockAttempts ?? 0} · loaded:{diag.loaded ?? 0}
      </div>

      <h1 className="text-2xl font-bold">Clienti</h1>
      <div className="flex gap-2 items-center">
        <input
          className="border rounded p-2 flex-1"
          placeholder="Cerca (nome, email, telefono, P. IVA, note)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="px-3 py-2 rounded border" onClick={() => setQ("")}>Pulisci</button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th label="Nome"       k="name"        sortBy={sortBy} sortDir={sortDir} onClick={setSortBy} />
              <Th label="Email"      k="email"       sortBy={sortBy} sortDir={sortDir} onClick={setSortBy} />
              <Th label="Telefono"   k="phone"       sortBy={sortBy} sortDir={sortDir} onClick={setSortBy} />
              <Th label="P. IVA"     k="vat_number"  sortBy={sortBy} sortDir={sortDir} onClick={setSortBy} />
              <Th label="Creato il"  k="created_at"  sortBy={sortBy} sortDir={sortDir} onClick={setSortBy} />
              <th className="px-3 py-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{r.name || "—"}</td>
                <td className="px-3 py-2">{r.email || "—"}</td>
                <td className="px-3 py-2">{r.phone || "—"}</td>
                <td className="px-3 py-2">{r.vat_number || "—"}</td>
                <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.notes || "—"}</td>
              </tr>
            ))}
            {!loading && actuallyReady && view.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={6}>Nessun cliente trovato.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          className="px-3 py-2 rounded border"
          disabled={page === 0 || loading || !actuallyReady}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >◀︎ Precedenti</button>
        <div className="text-sm text-gray-600">Pagina {page + 1}</div>
        <button
          className="px-3 py-2 rounded border"
          disabled={loading || !actuallyReady || rows.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >Successivi ▶︎</button>
      </div>

      {loading && <div className="text-sm text-gray-500">Caricamento…</div>}
    </div>
  );
}

function Th({ label, k, sortBy, sortDir, onClick }: { label: string; k: SortKey; sortBy: SortKey; sortDir: "asc" | "desc"; onClick: (k: SortKey) => void }) {
  const active = sortBy === k;
  return (
    <th className="px-3 py-2 text-left cursor-pointer select-none" onClick={() => onClick(k)}>
      <span className={active ? "font-semibold" : ""}>{label}</span>
      {active ? <span> {sortDir === "asc" ? "▲" : "▼"}</span> : null}
    </th>
  );
}
