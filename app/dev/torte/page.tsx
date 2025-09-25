// app/dev/torte/page.tsx
"use client";
import { useMemo, useState } from "react";
import { makeBiList } from "@/lib/standard/bi";

// Alias iniziali (modificabili dall'utente nel textarea)
const DEFAULT_ALIASES = [
  // parole generiche
  "torta", "torte",
  // classici noti anche se senza la parola "torta"
  "tiramisù", "cheesecake", "sacher", "millefoglie", "crostata", "zuppa inglese",
  "red velvet", "torta di mele", "torta al cioccolato", "torta di carote",
  "torta alla vaniglia", "torta al limone", "torta al pistacchio",
];

function cleanList(text: string): string[] {
  return text
    .split(/\r?\n|,/g)           // accetta liste separate da a capo o virgola
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export default function TortePage() {
  const [aliasesText, setAliasesText] = useState(DEFAULT_ALIASES.join("\n"));
  const aliases = useMemo(() => cleanList(aliasesText), [aliasesText]);
  const [log, setLog] = useState<string>("");

  async function callOnce(intent_key: "prod_conteggio_catalogo" | "prod_giacenza_magazzino") {
    try {
      setLog("Calcolo BI…");
      const bi_list = await makeBiList(aliases);
      setLog("Chiamo /api/standard/execute…");

      const res = await fetch("/api/standard/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent_key,
          slots: { bi_list }, // colpo solo: tutti gli alias in un array
        }),
      });
      const json = await res.json();
      setLog(JSON.stringify(json, null, 2));
    } catch (e: any) {
      setLog("Errore: " + (e?.message || String(e)));
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Torte — colpo solo (alias → BI → execute)</h1>

      <p style={{ color: "#555", marginBottom: 8 }}>
        Modifica la lista di alias (uno per riga o separati da virgole). Poi clicca un pulsante.
      </p>

      <textarea
        value={aliasesText}
        onChange={(e) => setAliasesText(e.target.value)}
        rows={10}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #ccc",
          borderRadius: 8, marginBottom: 12, fontFamily: "inherit"
        }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => callOnce("prod_conteggio_catalogo")}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Conteggio totale (torte)
        </button>
        <button
          onClick={() => callOnce("prod_giacenza_magazzino")}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Stock totale (torte)
        </button>
      </div>

      <details style={{ marginBottom: 8 }}>
        <summary style={{ cursor: "pointer" }}>Vedi alias attivi ({aliases.length})</summary>
        <div style={{ fontSize: 13, color: "#444", marginTop: 8 }}>
          {aliases.map((a, i) => <code key={i} style={{ marginRight: 8 }}>{a}</code>)}
        </div>
      </details>

      <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap" }}>
{log || "Risultati qui…"}
      </pre>

      <p style={{ color: "#666", marginTop: 8, fontSize: 12 }}>
        Nota: questa pagina usa un’unica chiamata all’endpoint standard dell’app passando tutti i BI insieme.
      </p>
    </div>
  );
}
