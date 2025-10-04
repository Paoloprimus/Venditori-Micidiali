// app/clients/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useCrypto } from "@/lib/crypto/CryptoProvider";

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
type SortKey = "name" | "created_at" | "email" | "vat_number";

export default function ClientsPage() {
  const { crypto, ready } = useCrypto();
  const [rows, setRows] = useState<PlainAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [q, setQ] = useState("");

  // Carica pagina di clienti (cifrati)
  async function loadPage(p: number) {
    setLoading(true);

    // Evita errori se crypto non è pronto
    if (!crypto) {
      console.warn("[clients] crypto non ancora pronto");
      setLoading(false);
      return;
    }

    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("accounts")
      .select(`
        id, created_at,
        name_enc, name_iv,
        email_enc, email_iv,
        phone_enc, phone_iv,
        vat_number_enc, vat_number_iv,
        notes_enc, notes_iv
      `)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[/clients] load error:", error);
      setLoading(false);
      return;
    }

    const plain: PlainAccount[] = [];

    for (const r of (data as RawAccount[])) {
      try {
        const dec = await crypto.decryptFields("accounts", "accounts", r.id, {
          name: { enc: r.name_enc, iv: r.name_iv },
          email: { enc: r.email_enc, iv: r.email_iv },
          phone: { enc: r.phone_enc, iv: r.phone_iv },
          vat_number: { enc: r.vat_number_enc, iv: r.vat_number_iv },
          notes: { enc: r.notes_enc, iv: r.notes_iv },
        });
        plain.push({
          id: r.id,
          created_at: r.created_at,
          name: (dec as any)?.name ?? "",
          email: (dec as any)?.email ?? "",
          phone: (dec as any)?.phone ?? "",
          vat_number: (dec as any)?.vat_number ?? "",
          notes: (dec as any)?.notes ?? "",
        });
      } catch (e) {
        console.warn("decrypt error for", r.id, e);
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
  }

  // Carica i dati quando crypto è pronto
  useEffect(() => {
    if (!ready || !crypto) return;
    loadPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, crypto, page]);

  // Ordinamento e filtro locale
  const view = useMemo(() => {
    const norm = (s: string) => (s || "").toLocaleLowerCase();
    let arr = [...rows];
    if (q.trim()) {
      const qq = norm(q);
      arr = arr.filter(
        (r) =>
          norm(r.name).includes(qq) ||
          norm(r.email).includes(qq) ||
          norm(r.phone).includes(qq) ||
          norm(r.vat_number).includes(qq) ||
          norm(r.notes).includes(qq)
      );
    }
    arr.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortBy === "created_at") {
        va = new Date(a.created_at).getTime();
        vb = new Date(b.created_at).getTime();
      } else {
        va = (a as any)[sortBy] || "";
        vb = (b as any)[sortBy] || "";
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, q, sortBy, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortBy === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(k);
      setSortDir(k === "created_at" ? "desc" : "asc");
    }
  }

  if (!ready || !crypto) {
    return <div className="p-6 text-gray-600">Carico chiavi di cifratura…</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Clienti</h1>

      <div className="flex gap-2 items-center">
        <input
          className="border rounded p-2 flex-1"
          placeholder="Cerca (nome, email, telefono, P. IVA, note)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="px-3 py-2 rounded border"
          onClick={() => setQ("")}
        >
          Pulisci
        </button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th label="Nome" k="name" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Email" k="email" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Telefono" k="phone" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
              <Th label="P. IVA" k="vat_number" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Creato il" k="created_at" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
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
                <td className="px-3 py-2">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">{r.notes || "—"}</td>
              </tr>
            ))}
            {!loading && view.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-gray-500"
                  colSpan={6}
                >
                  Nessun cliente trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          className="px-3 py-2 rounded border"
          disabled={page === 0 || loading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          ◀︎ Precedenti
        </button>
        <div className="text-sm text-gray-600">Pagina {page + 1}</div>
        <button
          className="px-3 py-2 rounded border"
          disabled={loading || rows.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >
          Successivi ▶︎
        </button>
      </div>

      {loading && <div className="text-sm text-gray-500">Caricamento…</div>}
    </div>
  );
}

function Th({
  label,
  k,
  sortBy,
  sortDir,
  onClick,
}: {
  label: string;
  k: SortKey;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  onClick: (k: SortKey) => void;
}) {
  const active = sortBy === k;
  return (
    <th
      className="px-3 py-2 text-left cursor-pointer select-none"
      onClick={() => onClick(k)}
    >
      <span className={active ? "font-semibold" : ""}>{label}</span>
      {active && <span> {sortDir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}
