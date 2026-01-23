"use client";

import Link from "next/link";

/**
 * Mockup statico della dashboard REPING con bottone "Prova Demo"
 * Sostituisce AnimatedMockup nella landing page
 */
export default function StaticMockupWithCTA() {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mockup del telefono */}
      <div 
        className="relative"
        style={{
          width: 280,
          height: 560,
          background: "linear-gradient(180deg, #1e1e1e 0%, #2d2d2d 100%)",
          borderRadius: 40,
          padding: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 0 0 2px #3a3a3a",
        }}
      >
        {/* Notch */}
        <div 
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: 100,
            height: 28,
            background: "#1e1e1e",
            borderRadius: 20,
            zIndex: 20,
          }}
        />

        {/* Screen */}
        <div 
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
            borderRadius: 32,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Status bar */}
          <div style={{
            height: 44,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #e2e8f0",
            paddingTop: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="20" height="20" viewBox="0 0 512 512" style={{ borderRadius: 4 }}>
                <rect width="512" height="512" fill="#1e1e1e" rx="96"/>
                <text x="256" y="380" fontFamily="system-ui" fontSize="360" fontWeight="900" fill="#BEFF00" textAnchor="middle">R</text>
              </svg>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>REPING</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>V2</span>
            </div>
          </div>

          {/* Dashboard content */}
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            
            {/* Napoleon Card */}
            <div style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
              borderRadius: 12,
              padding: 12,
              color: "white",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>🎯</span>
                <span style={{ fontWeight: 600, fontSize: 12 }}>Suggerimento</span>
              </div>
              <p style={{ fontSize: 11, opacity: 0.95, margin: 0, lineHeight: 1.4 }}>
                Bar Roma non ordina da 45 giorni. Potrebbe essere il momento giusto per una visita!
              </p>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{
                flex: 1,
                background: "#fff",
                borderRadius: 10,
                padding: 10,
                border: "1px solid #e2e8f0",
              }}>
                <p style={{ fontSize: 9, color: "#64748b", margin: 0 }}>Visite oggi</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>4</p>
              </div>
              <div style={{
                flex: 1,
                background: "#fff",
                borderRadius: 10,
                padding: 10,
                border: "1px solid #e2e8f0",
              }}>
                <p style={{ fontSize: 9, color: "#64748b", margin: 0 }}>Vendite</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#10b981", margin: 0 }}>€890</p>
              </div>
            </div>

            {/* Recent visits */}
            <div style={{
              background: "#fff",
              borderRadius: 10,
              padding: 10,
              border: "1px solid #e2e8f0",
            }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#1e293b", margin: "0 0 8px" }}>
                Ultime visite
              </p>
              {[
                { name: "Pizzeria da Gino", amount: "€280", time: "14:30" },
                { name: "Bar Sport", amount: "€150", time: "11:00" },
                { name: "Enoteca Grappolo", amount: "€460", time: "09:15" },
              ].map((v, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: i < 2 ? "1px solid #f1f5f9" : "none",
                }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 500, color: "#1e293b", margin: 0 }}>{v.name}</p>
                    <p style={{ fontSize: 9, color: "#94a3b8", margin: 0 }}>{v.time}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981" }}>{v.amount}</span>
                </div>
              ))}
            </div>

            {/* Chat preview */}
            <div style={{
              background: "#fff",
              borderRadius: 10,
              padding: 10,
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>💬</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#1e293b" }}>Chat AI</span>
              </div>
              <div style={{
                background: "#f1f5f9",
                borderRadius: 8,
                padding: 8,
                fontSize: 10,
                color: "#475569",
              }}>
                "Chi non ordina da più di 30 giorni?"
              </div>
            </div>
          </div>

          {/* Bottom nav hint */}
          <div style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 100,
            height: 4,
            background: "#1e293b",
            borderRadius: 2,
            opacity: 0.3,
          }} />
        </div>
      </div>

      {/* CTA Button */}
      <Link
        href="/demo"
        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition shadow-lg flex items-center gap-2"
      >
        <span>🎮</span>
        <span>Prova REPING senza registrarti</span>
      </Link>
      <p className="text-slate-400 text-xs text-center">
        Dati di esempio • Nessun account richiesto
      </p>
    </div>
  );
}
