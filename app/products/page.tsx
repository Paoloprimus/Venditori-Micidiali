// app/products/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useDrawers, DrawersWithBackdrop } from '@/components/Drawers';
import TopBar from "@/components/home/TopBar";

// Tipi
type RawProduct = {
  id: string;
  created_at: string;
  codice: string;
  descrizione_articolo: string;
  unita_misura: string | null;
  giacenza: number;
  base_price: number | null;
  sconto_fattura: number | null;
  is_active: boolean;
};

type PlainProduct = {
  id: string;
  created_at: string;
  codice: string;
  descrizione_articolo: string;
  unita_misura: string;
  giacenza: number;
  base_price: number;
  sconto_fattura: number;
  is_active: boolean;
};

const PAGE_SIZE = 25;
type SortKey = "codice" | "descrizione_articolo" | "giacenza" | "base_price" | "created_at";

export default function ProductsPage(): JSX.Element {
  // Drawer
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  const [rows, setRows] = useState<PlainProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);

  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [q, setQ] = useState<string>("");
  const [onlyActive, setOnlyActive] = useState<boolean>(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // 🆕 Funzione per gestire click su header ordinabili
  function handleSortClick(key: SortKey) {
    if (sortBy === key) {
      // Stessa colonna → inverti direzione
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      // Colonna nuova → imposta quella colonna e DESC
      setSortBy(key);
      setSortDir("desc");
    }
  }

  // Logout
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Auth check
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setAuthChecked(true);
    })();
  }, []);

  // Carica prodotti
  async function loadPage(p: number): Promise<void> {
    if (!userId) return;
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("products")
      .select("id,created_at,codice,descrizione_articolo,unita_misura,giacenza,base_price,sconto_fattura,is_active")
      .order("created_at", { ascending: false })
      .range(from, to);

    // Filtro solo attivi
    if (onlyActive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[/products] load error:", error);
      setLoading(false);
      return;
    }

    const plain: PlainProduct[] = (data || []).map(r => ({
      id: r.id,
      created_at: r.created_at,
      codice: r.codice || "",
      descrizione_articolo: r.descrizione_articolo || "",
      unita_misura: r.unita_misura || "",
      giacenza: r.giacenza || 0,
      base_price: r.base_price || 0,
      sconto_fattura: r.sconto_fattura || 0,
      is_active: r.is_active ?? true,
    }));

    setRows(plain);
    setLoading(false);
  }

  // Carica la pagina 0 all'inizio
  useEffect(() => {
    if (!userId) return;
    loadPage(0);
    setPage(0);
  }, [userId]);

  // Ricarica quando cambia pagina
  useEffect(() => {
    if (!userId) return;
    loadPage(page);
  }, [page, userId]);

  // Ricarica quando cambia il filtro "Solo attivi"
  useEffect(() => {
    if (!userId) return;
    loadPage(0);
    setPage(0);
  }, [onlyActive, userId]);

  // 🆕 DELETE PRODOTTO
  async function deleteProduct(productId: string) {
    if (!userId) return;
    
    if (!confirm("Eliminare definitivamente questo prodotto?")) return;
    
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      
      if (error) throw error;
      
      // Rimuovi dalla lista locale
      setRows(prev => prev.filter(r => r.id !== productId));
      
      console.log(`✅ Prodotto eliminato: ${productId}`);
    } catch (e) {
      console.error("❌ Errore delete prodotto:", e);
      alert(`Errore durante l'eliminazione: ${e}`);
    }
  }

  const view: PlainProduct[] = useMemo(() => {
    const norm = (s: string) => (s || "").toLocaleLowerCase();
    let arr = [...rows];
    
    // Filtro ricerca
    if (q.trim()) {
      const qq = norm(q);
      arr = arr.filter((r) =>
        norm(r.codice).includes(qq) ||
        norm(r.descrizione_articolo).includes(qq)
      );
    }

    // Sorting
    if (sortBy === "codice") {
      arr.sort((a, b) => {
        const cmp = norm(a.codice).localeCompare(norm(b.codice));
        return sortDir === "asc" ? cmp : -cmp;
      });
    } else if (sortBy === "descrizione_articolo") {
      arr.sort((a, b) => {
        const cmp = norm(a.descrizione_articolo).localeCompare(norm(b.descrizione_articolo));
        return sortDir === "asc" ? cmp : -cmp;
      });
    } else if (sortBy === "giacenza") {
      arr.sort((a, b) => {
        const cmp = a.giacenza - b.giacenza;
        return sortDir === "asc" ? cmp : -cmp;
      });
    } else if (sortBy === "base_price") {
      arr.sort((a, b) => {
        const cmp = a.base_price - b.base_price;
        return sortDir === "asc" ? cmp : -cmp;
      });
    } else if (sortBy === "created_at") {
      arr.sort((a, b) => {
        const cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

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
          Effettua di nuovo l'accesso per vedere i prodotti.
        </p>
        <button className="px-3 py-2 rounded border mt-3" onClick={() => window.location.href = "/login"}>
          Vai al login
        </button>
      </div>
    );
  }

  return (
    <>
      {/* TopBar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <TopBar
          title="Prodotti"
          onOpenLeft={openLeft}
          onOpenDati={openDati}
          onOpenDocs={openDocs}
          onOpenImpostazioni={openImpostazioni}
          onLogout={logout}
        />
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-4">
        {/* Spacer per TopBar */}
        <div style={{ height: 70 }} />
        
        <div className="flex gap-2 items-center">
          <input
            className="border rounded p-2 flex-1"
            placeholder="Cerca (codice, descrizione)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
            Solo attivi
          </label>
          <button className="px-3 py-2 rounded border" onClick={() => setQ("")}>Pulisci</button>
        </div>

        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            
            <thead className="bg-gray-50">
              <tr>
                <Th label="Codice" k="codice" sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                <Th label="Descrizione" k="descrizione_articolo" sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                <th className="px-3 py-2 text-left">UM</th>
                <Th label="Giacenza" k="giacenza" sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                <Th label="Prezzo €" k="base_price" sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                <th className="px-3 py-2 text-left">Sconto %</th>
                <th className="px-3 py-2 text-left">Attivo</th>
                <Th label="Creato il" k="created_at" sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                <th className="px-3 py-2 text-left">Azioni</th>
              </tr>
            </thead>
            
            <tbody>
              {view.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{r.codice || "—"}</td>
                  <td className="px-3 py-2">{r.descrizione_articolo || "—"}</td>
                  <td className="px-3 py-2">{r.unita_misura || "—"}</td>
                  <td className="px-3 py-2">{r.giacenza}</td>
                  <td className="px-3 py-2">{r.base_price ? `€${r.base_price.toFixed(2)}` : "—"}</td>
                  <td className="px-3 py-2">{r.sconto_fattura ? `${r.sconto_fattura}%` : "—"}</td>
                  <td className="px-3 py-2">{r.is_active ? "✓" : "✗"}</td>
                  <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                  
                  {/* Azioni - CANCELLAZIONE */}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => deleteProduct(r.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Elimina prodotto"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              
              {!loading && view.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-gray-500" colSpan={9}>
                    Nessun prodotto trovato.
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
          >◀︎ Precedenti</button>
          <div className="text-sm text-gray-600">Pagina {page + 1}</div>
          <button
            className="px-3 py-2 rounded border"
            disabled={loading || rows.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
          >Successivi ▶︎</button>
        </div>

        {loading && <div className="text-sm text-gray-500">Caricamento…</div>}
      </div>

      {/* Drawer con backdrop */}
      <DrawersWithBackdrop
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        rightContent={rightContent}
        onCloseLeft={closeLeft}
        onCloseRight={closeRight}
      />
    </>
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
