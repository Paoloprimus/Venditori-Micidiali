"use client";
import { useState } from "react";
import ProductImport from "./ProductImport";
import ProductManual from "./ProductManual";

export default function ProductManager({ onCloseDrawer }: { onCloseDrawer?: () => void }) {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button className={`btn ${mode === "auto" ? "active" : ""}`} onClick={() => setMode("auto")}>
          Automatica (import)
        </button>
        <button className={`btn ${mode === "manual" ? "active" : ""}`} onClick={() => setMode("manual")}>
          Manuale (lista/scheda)
        </button>
      </div>
      {mode === "auto" && <ProductImport />}
      {mode === "manual" && <ProductManual onSaved={onCloseDrawer} />}
    </div>
  );
}
