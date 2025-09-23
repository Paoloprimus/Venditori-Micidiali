"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import { useToast } from "../ui/Toast";

type Product = {
  id?: string;
  codice: string | null;
  descrizione_articolo: string | null;
  unita_misura: string | null;
  giacenza: number | null;
  base_price: number | null;
  sconto_merce: string | null;
  sconto_fattura: number | null;
  is_active: boolean | null;
};

export default function ProductManual({ onSaved }: { onSaved?: () => void }) {
  const toast = useToast();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [sel, setSel] = useState<{ mode: "edit"|"create"; product: Product } | null>(null);

  async function load() {
    setLoading(true);
    const qb = supabase.from("products")
      .select("id,codice,descrizione_articolo,unita_misura,giacenza,base_price,sconto_merce,sconto_fattura,is_active")
      .order("codice", { ascending: true })
      .limit(200);
    if (q) qb.or(`codice.ilike.%${q}%,descrizione_articolo.ilike.%${q}%`);
    if (onlyActive) qb.eq("is_active", true);
    const { data, error } = await qb;
    setLoading(false);
    if (error) { toast(error.message, "error"); return; }
    setItems(data || []);
  }

  useEffect(() => { load(); }, []); // mount
  useEffect(() => { load(); }, [q, onlyActive]); // filters

  function onEdit(p: Product) { setSel({ mode: "edit", product: p }); }
  function onCreate() {
    setSel({
      mode: "create",
      product: {
        codice: "",
        descrizione_articolo: "",
        unita_misura: "",
        giacenza: 0,
        base_price: null,
        sconto_merce: "",
        sconto_fattura: null,
        is_active: true,
      },
    });
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {!sel && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca per codice o descrizione…"
              style={{ flex: 1, padding: 8, border: "1px solid var(--ring)", borderRadius: 8 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
              Solo attivi
            </label>
            <button className="btn" onClick={onCreate}>Nuovo prodotto</button>
            <button className="iconbtn" onClick={load}>↻</button>
          </div>

          {loading && <div className="helper">Caricamento…</div>}
          {!loading && items.length === 0 && <div className="helper">Nessun prodotto</div>}

          <div style={{ display: "grid", gap: 6 }}>
            {items.map(p => (
              <div key={p.id} className="row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {p.codice || "(senza codice)"}{p.is_active === false ? " • disattivo" : ""}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {p.descrizione_articolo || "-"} • UM: {p.unita_misura || "-"} • Giacenza: {p.giacenza ?? 0}
                  </div>
                </div>
                <button className="btn" onClick={() => onEdit(p)}>Modifica</button>
              </div>
            ))}
          </div>
        </>
      )}

      {sel && (
        <ProductForm
          mode={sel.mode}
          product={sel.product}
          onClose={() => { setSel(null); load(); onSaved?.(); }}
        />
      )}
    </div>
  );
}

function ProductForm({ mode, product, onClose }: { mode: "edit"|"create"; product: Product; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<Product>({ ...product });
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Product>(k: K, v: Product[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function save() {
    const codice = (form.codice || "").trim();
    const descr = (form.descrizione_articolo || "").trim();
    if (!codice) { toast("Codice obbligatorio", "error"); return; }
    if (!descr)  { toast("Descrizione obbligatoria", "error"); return; }

    setBusy(true);
    try {
      if (mode === "create") {
        const payload: any = {
          codice,
          title: descr || codice,
          descrizione_articolo: descr || codice,
          unita_misura: (form.unita_misura || "") || null,
          giacenza: Math.max(0, Math.floor(Number(form.giacenza ?? 0))),
          base_price: form.base_price == null ? null : Number(form.base_price),
          sconto_merce: (form.sconto_merce || "") || null,
          sconto_fattura: form.sconto_fattura == null ? null : Math.min(100, Math.max(0, Number(form.sconto_fattura))),
          is_active: form.is_active ?? true,
        };
        const { error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        toast("Prodotto creato", "success");
      } else {
        const payload = {
          descrizione_articolo: descr || codice,
          unita_misura: (form.unita_misura || "") || null,
          giacenza: Math.max(0, Math.floor(Number(form.giacenza ?? 0))),
          base_price: form.base_price == null ? null : Number(form.base_price),
          sconto_merce: (form.sconto_merce || "") || null,
          sconto_fattura: form.sconto_fattura == null ? null : Math.min(100, Math.max(0, Number(form.sconto_fattura))),
          is_active: form.is_active ?? true,
          title: descr || codice, // mantieni allineato
        };
        const { error } = await supabase.from("products").update(payload).eq("id", product.id!);
        if (error) throw error;
        toast("Prodotto salvato", "success");
      }
      onClose();
    } catch (e: any) {
      toast(e?.message || "Errore salvataggio", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(v: boolean) {
    if (mode === "create") return;
    const { error } = await supabase.from("products").update({ is_active: v }).eq("id", product.id!);
    if (error) { toast(error.message, "error"); return; }
    toast(v ? "Riattivato" : "Disattivato", "success");
    onClose();
  }

  async function del() {
    if (mode === "create") { onClose(); return; }
    if (!confirm("Eliminare definitivamente questo prodotto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id!);
    if (error) { toast(error.message, "error"); return; }
    toast("Eliminato", "success");
    onClose();
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 700 }}>{mode === "create" ? "Nuovo prodotto" : "Modifica prodotto"}</div>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Codice {mode === "edit" ? "(non modificabile)" : ""}
        </span>
        <input
          value={form.codice || ""}
          disabled={mode === "edit"}
          onChange={(e) => set("codice", e.target.value)}
          style={{ padding: 8, border: "1px solid var(--ring)", borderRadius: 8, background: mode === "edit" ? "#F9FAFB" : "white" }}
        />
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Descrizione</span>
        <input
          value={form.descrizione_articolo || ""}
          onChange={(e) => set("descrizione_articolo", e.target.value)}
          style={{ padding: 8, border: "1px solid var(--ring)", borderRadius: 8 }}
        />
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ display: "grid", gap: 4, flex: 1 }}>
          <span>UM</span>
          <input
            value={form.unita_misura || ""}
            onChange={(e) => set("unita_misura", e.target.value)}
            style={{ padding: 8, border: "1px solid var(--ring)", borderRadius: 8 }}
          />
        </label>
        <label style={{ display: "grid", gap: 4, flex: 1 }}>
          <span>Giacenza</span>
          <input
            type="number"
            min={0}
            value={form.giacenza ?? 0}
            onChange={(e) => set("giacenza", Number(e.target.value))}
            style={{ padding: 8, border: "1px solid var(--ring)", borderRadius: 8 }}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ display: "grid", gap: 4, flex: 1 }}>
          <span>Prezzo base</span>
          <input
            type="number"
            step="0.01"
            value={form.base_price ?? 0}
            onChange={(e) => set("base_price", Number(e.target.value))}
            style={{ padding: 8, border: "1px solid var(--ring)", borderRadius: 8 }}
          />
        </label>
        <label style={{ display: "grid", gap: 4, flex: 1 }}>
          <span>Sconto fattura (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step="1"
            value={form.sconto_fattura ?? 0}
            onChange={(e) => set("sconto_fattura", Number(e.target.value))}
            style={{ padding: 8, border: "1px solid var(--ring)", borderRadius: 8 }}
          />
        </label>
      </div>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Sconto merce</span>
        <input
          value={form.sconto_merce || ""}
          onChange={(e) => set("sconto_merce", e.target.value)}
          style={{ padding: 8, border: "1px solid var(--ring)", borderRadius: 8 }}
        />
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={form.is_active ?? true}
          onChange={(e) => set("is_active", e.target.checked)}
        />
        Prodotto attivo
      </label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={save} disabled={busy}>{busy ? "Salvataggio…" : "Salva"}</button>
        {mode === "edit" && (
          <>
            <button className="btn" onClick={() => toggleActive(!(form.is_active ?? true))}>
              {form.is_active === false ? "Riattiva" : "Disattiva"}
            </button>
            <button className="btn" onClick={del} style={{ background: "#DC2626", color: "white" }}>
              Elimina
            </button>
          </>
        )}
        <button className="btn" onClick={onClose}>Chiudi</button>
      </div>
    </div>
  );
}
