// app/dev/quick-test/page.tsx
"use client";
import { useState } from "react";
import { makeBiList } from "@/lib/standard/bi";

export default function QuickTest() {
  const [term, setTerm] = useState("");
  const [log, setLog] = useState<string>("");

  async function callExecute(intent_key: string) {
    try {
      if (!term.trim()) {
        setLog("Scrivi una parola (es. arancino, torta)");
        return;
      }
      // 1) costruiamo i BI dalla parola scritta
      const bi_list = await makeBiList([term.trim()]);

      // 2) chiamiamo l'endpoint unico dell'app
      const res = await fetch("/api/standard/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent_key,
          slots: { bi_list }, // ← privacy-safe
        }),
      });

      const json = await res.json();
      setLog(JSON.stringify(json, null, 2));
    } catch (e: any) {
      setLog("Errore: " + (e?.message || String(e)));
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Test rapido (BI → execute)</h1>

      <label style={{ display: "block", marginBottom: 8 }}>
        Parola prodotto (es. <code>arancino</code> o <code>torta</code>)
      </label>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="es. arancino"
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8,
          marginBottom: 12
        }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => callExecute("prod_conteggio_catalogo")}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Conteggio
        </button>
        <button
          onClick={() => callExecute("prod_giacenza_magazzino")}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Stock
        </button>
        <button
          onClick={() => callExecute("count_clients")}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Count clients
        </button>
      </div>

      <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap" }}>
{log || "Risultati qui…"}
      </pre>

      <p style={{ color: "#666", marginTop: 8, fontSize: 12 }}>
        Nota: questa è solo una pagina di prova. Usa la stessa via privacy-safe (bi_list) dell'app.
      </p>
    </div>
  );
}
