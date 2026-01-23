"use client";

import Link from "next/link";

/**
 * Mockup statico della dashboard REPING - tutto cliccabile per demo
 */
export default function StaticMockupWithCTA() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Tutto il mockup è un link */}
      <Link
        href="/demo"
        className="block relative cursor-pointer transition-transform hover:scale-105"
        style={{
          width: 220,
          height: 440,
          background: "linear-gradient(180deg, #1e1e1e 0%, #2d2d2d 100%)",
          borderRadius: 32,
          padding: 6,
          boxShadow: "0 16px 48px rgba(0,0,0,0.4), inset 0 0 0 2px #3a3a3a",
        }}
      >
        {/* Notch */}
        <div 
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 80,
            height: 22,
            background: "#1e1e1e",
            borderRadius: 16,
            zIndex: 20,
          }}
        />

        {/* Screen */}
        <div 
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
            borderRadius: 26,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Status bar */}
          <div style={{
            height: 36,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #e2e8f0",
            paddingTop: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="16" height="16" viewBox="0 0 512 512" style={{ borderRadius: 3 }}>
                <rect width="512" height="512" fill="#1e1e1e" rx="96"/>
                <text x="256" y="380" fontFamily="system-ui" fontSize="360" fontWeight="900" fill="#BEFF00" textAnchor="middle">R</text>
              </svg>
              <span style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>REPING</span>
            </div>
          </div>

          {/* Dashboard content */}
          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            
            {/* Napoleon Card */}
            <div style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
              borderRadius: 8,
              padding: 8,
              color: "white",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>🎯</span>
                <span style={{ fontWeight: 600, fontSize: 9 }}>Suggerimento</span>
              </div>
              <p style={{ fontSize: 8, opacity: 0.95, margin: 0, lineHeight: 1.3 }}>
                Bar Roma non ordina da 45 giorni
              </p>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{
                flex: 1,
                background: "#fff",
                borderRadius: 6,
                padding: 6,
                border: "1px solid #e2e8f0",
              }}>
                <p style={{ fontSize: 7, color: "#64748b", margin: 0 }}>Visite</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: 0 }}>4</p>
              </div>
              <div style={{
                flex: 1,
                background: "#fff",
                borderRadius: 6,
                padding: 6,
                border: "1px solid #e2e8f0",
              }}>
                <p style={{ fontSize: 7, color: "#64748b", margin: 0 }}>Vendite</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#10b981", margin: 0 }}>€890</p>
              </div>
            </div>

            {/* Recent visits */}
            <div style={{
              background: "#fff",
              borderRadius: 6,
              padding: 6,
              border: "1px solid #e2e8f0",
            }}>
              <p style={{ fontSize: 8, fontWeight: 600, color: "#1e293b", margin: "0 0 4px" }}>
                Ultime visite
              </p>
              {[
                { name: "Pizzeria da Gino", amount: "€280" },
                { name: "Bar Sport", amount: "€150" },
              ].map((v, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "3px 0",
                  borderBottom: i < 1 ? "1px solid #f1f5f9" : "none",
                }}>
                  <p style={{ fontSize: 8, color: "#1e293b", margin: 0 }}>{v.name}</p>
                  <span style={{ fontSize: 8, fontWeight: 600, color: "#10b981" }}>{v.amount}</span>
                </div>
              ))}
            </div>

            {/* Chat preview */}
            <div style={{
              background: "#fff",
              borderRadius: 6,
              padding: 6,
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 10 }}>💬</span>
                <span style={{ fontSize: 8, fontWeight: 600, color: "#1e293b" }}>Chat AI</span>
              </div>
              <div style={{
                background: "#f1f5f9",
                borderRadius: 4,
                padding: 4,
                fontSize: 7,
                color: "#475569",
              }}>
                "Chi non ordina da 30gg?"
              </div>
            </div>
          </div>

          {/* Play overlay hint */}
          <div style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(16, 185, 129, 0.9)",
            borderRadius: 12,
            padding: "4px 10px",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <span style={{ fontSize: 10 }}>▶</span>
            <span style={{ fontSize: 9, color: "white", fontWeight: 600 }}>Prova</span>
          </div>
        </div>
      </Link>

      {/* Testo sotto */}
      <p className="text-slate-400 text-xs text-center">
        🎮 Clicca per provare • Nessun account
      </p>
    </div>
  );
}
