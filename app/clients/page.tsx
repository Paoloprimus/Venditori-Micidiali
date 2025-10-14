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
  name_enc: any; name_iv: any;
  email_enc: any; email_iv: any;
  phone_enc: any; phone_iv: any;
  vat_number_enc: any; vat_number_iv: any;
  notes_enc: any; notes_iv: any;
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

  useEffect(() => {
    if (!authChecked) return;       // aspetta check auth
    if (ready) return;              // già sbloccato
    if (unlockingRef.current) return;

    const pass =
      typeof window !== "undefined"
        ? (sessionStorage.getItem("repping:pph") || localStorage.getItem("repping:pph") || "")
        : "";

    const hasPass = !!pass;
    setDiag((d) => ({ ...d, passInStorage: hasPass }));

    if (!hasPass) return;

(async () => {
  try {
    unlockingRef.current = true;
    setDiag((d) => ({ ...d, unlockAttempts: (d.unlockAttempts ?? 0) + 1 }));
    await unlock(pass);
    await prewarm(DEFAULT_SCOPES);
    try { sessionStorage.removeItem("repping:pph"); } catch {}
    try { localStorage.removeItem("repping:pph"); } catch {}
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    // Evita di loggare OperationError "falso positivo"
    if (!/OperationError/i.test(msg)) {
      console.error("[/clients] unlock failed:", e);
    }
  } finally {
    unlockingRef.current = false;
  }
})();

    
  }, [authChecked, ready, unlock, prewarm]);

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

  useEffect(() => {
    if (!authChecked || !userId || !ready || !crypto) return;
    loadPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, userId, ready, crypto, page]);

  async function loadPage(p: number): Promise<void> {
    if (!crypto || !userId) return;
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("accounts")
      .select(`id, created_at, name_enc, name_iv, email_enc, email_iv, phone_enc, phone_iv, vat_number_enc, vat_number_iv, notes_enc, notes_iv`)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[/clients] load error:", error);
      setLoading(false);
      return;
    }

    // === PATCH NON DISTRUTTIVA ===
    const hasDecryptRow = typeof (crypto as any)?.decryptRow === "function";
    const scope = "table:accounts";

const decryptFields = (crypto as any).decryptFields as (
  scope: string,
  table: string,
  id: string,
  specs: Array<{ name: string; enc: any; iv: any }>,
  opts?: any
) => Promise<Record<string, unknown> | Array<{ name: string; value: unknown }>>;

const plain: PlainAccount[] = [];
for (const r of (data as RawAccount[])) {
  try {
    const scope = "table:accounts";

    // ✅ usa l’API reale: riga grezza + lista campi da decifrare
    if (typeof (crypto as any)?.decryptFields !== "function") {
      throw new Error("decryptFields non disponibile sul servizio crypto");
    }

    const dec = await (crypto as any).decryptFields(
      scope,          // scope
      "accounts",     // table
      r.id,           // recordId (usato nell'AAD)
      r,              // riga grezza con *_enc / *_iv
      ["name", "email", "phone", "vat_number", "notes"] // campi da decifrare
    );

    plain.push({
      id: r.id,
      created_at: r.created_at,
      name:       String((dec as any)?.name ?? ""),
      email:      String((dec as any)?.email ?? ""),
      phone:      String((dec as any)?.phone ?? ""),
      vat_number: String((dec as any)?.vat_number ?? ""),
      notes:      String((dec as any)?.notes ?? ""),
    });
  } catch (e) {
    console.warn("[/clients] decrypt error for", r.id, e);
    plain.push({
      id: r.id,
      created_at: r.created_at,
      name: "",
      email: "",
      phone: "",
      vat_number: "",
      notes: "",
    });
  }
}

    setRows(plain);
    setLoading(false);
    setDiag((d) => ({ ...d, loaded: plain.length }));
  }

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

  if (!ready || !crypto) {
    return (
      <div className="p-6 text-gray-600">
        🔐 Decrittazione in corso…
        <div className="text-xs mt-2">
          auth:{diag.auth} · ready:{String(ready)} · passInStorage:{String(diag.passInStorage)} · attempts:{diag.unlockAttempts} · loaded:{diag.loaded}
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
            {!loading && ready && view.length === 0 && (
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
          disabled={page === 0 || loading || !ready}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >◀︎ Precedenti</button>
        <div className="text-sm text-gray-600">Pagina {page + 1}</div>
        <button
          className="px-3 py-2 rounded border"
          disabled={loading || !ready || rows.length < PAGE_SIZE}
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
