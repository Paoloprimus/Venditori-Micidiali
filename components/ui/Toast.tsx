"use client";
import { createContext, useContext, useState, useCallback } from "react";

type Variant = "success" | "error" | "info";
type Toast = { id: number; message: string; variant: Variant };

const ToastCtx = createContext<{ push: (msg: string, variant?: Variant) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, variant: Variant = "info") => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, message, variant }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={{ position: "fixed", right: 16, bottom: 16, display: "grid", gap: 8, zIndex: 3000 }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              background: t.variant === "success" ? "#16a34a" : t.variant === "error" ? "#dc2626" : "#111827",
              color: "white",
              padding: "10px 12px",
              borderRadius: 10,
              boxShadow: "0 10px 25px rgba(0,0,0,.2)",
              maxWidth: 380
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.push;
}
