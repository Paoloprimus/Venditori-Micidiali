"use client";
import { useState } from "react";

export default function ProductImport() {
  const [file, setFile] = useState<File | null>(null);
  const [onlyStock, setOnlyStock] = useState(true);
  const [allowPriceDiscount, setAllowPriceDiscount] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleImport() {
    if (!file) { alert("Seleziona un file PDF o CSV"); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("onlyStock", String(onlyStock));
    fd.append("allowPriceDiscount", String(allowPriceDiscount));
    setBusy(true);
    try {
      const res = await fetch("/api/products/import", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Errore HTTP ${res.status}`);
      alert(`Import OK\nTotali: ${data.total}\nAggiornate/Inserite: ${data.touched}\nScartate: ${data.failed}`);
    } catch (e: any) {
      alert(e?.message || "Errore import");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const csv = [
      "codice,descrizione articolo,unità_misura,giacenza,base_price,sconto_merce,sconto_fattura,is_active",
      "A123,Panettone classico,SC,12,4.50,1 cassa ogni 10,10,true"
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template_import_prodotti.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ color: "var(--muted)" }}>Carica PDF testuale o CSV.</div>
      <input type="file" accept=".pdf,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} /> Aggiorna SOLO giacenze
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={allowPriceDiscount} onChange={(e) => setAllowPriceDiscount(e.target.checked)} /> Consenti prezzi/sconti
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={handleImport} disabled={busy}>{busy ? "Import…" : "Importa"}</button>
        <button className="btn" onClick={downloadTemplate}>Scarica template CSV</button>
      </div>
      <div style={{ color: "#9CA3AF", fontSize: 12 }}>Se il PDF è scansionato, usa il CSV.</div>
    </div>
  );
}
