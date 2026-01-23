"use client";

import Link from "next/link";

/**
 * Mockup statico della dashboard REPING - tutto cliccabile per demo
 * Con CTA prominente sopra
 */
export default function StaticMockupWithCTA() {
  return (
    <Link
      href="/demo"
      className="flex flex-col items-center gap-3 cursor-pointer group"
    >
      {/* CTA prominente SOPRA il mockup */}
      <div className="text-center">
        <p className="text-white text-lg md:text-xl font-bold mb-1 group-hover:text-emerald-400 transition">
          🎮 Prova come funziona REPING
        </p>
        <p className="text-slate-400 text-sm">
          No account • Dati di esempio
        </p>
      </div>

      {/* Mockup del telefono */}
      <div 
        className="relative transition-transform group-hover:scale-105"
        style={{
          width: 200,
          height: 400,
          background: "linear-gradient(180deg, #1e1e1e 0%, #2d2d2d 100%)",
          borderRadius: 28,
          padding: 5,
          boxShadow: "0 16px 48px rgba(0,0,0,0.4), inset 0 0 0 2px #3a3a3a",
        }}
      >
        {/* Notch */}
        <div 
          style={{
            position: "absolute",
            top: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 70,
            height: 20,
            background: "#1e1e1e",
            borderRadius: 14,
            zIndex: 20,
          }}
        />

        {/* Screen */}
        <div 
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
            borderRadius: 24,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Status bar */}
          <div style={{
            height: 32,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #e2e8f0",
            paddingTop: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="14" height="14" viewBox="0 0 512 512" style={{ borderRadius: 3 }}>
                <rect width="512" height="512" fill="#1e1e1e" rx="96"/>
                <text x="256" y="380" fontFamily="system-ui" fontSize="360" fontWeight="900" fill="#BEFF00" textAnchor="middle">R</text>
              </svg>
              <span style={{ fontWeight: 600, fontSize: 10, color: "#1e293b" }}>REPING</span>
            </div>
          </div>

          {/* Dashboard content */}
          <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 5 }}>
            
            {/* Napoleon Card */}
            <div style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
              borderRadius: 6,
              padding: 6,
              color: "white",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 3 }}>
                <span style={{ fontSize: 10 }}>🎯</span>
                <span style={{ fontWeight: 600, fontSize: 8 }}>Suggerimento</span>
              </div>
              <p style={{ fontSize: 7, opacity: 0.95, margin: 0, lineHeight: 1.2 }}>
                Bar Roma non ordina da 45gg
              </p>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 4 }}>
              <div style={{
                flex: 1,
                background: "#fff",
                borderRadius: 5,
                padding: 5,
                border: "1px solid #e2e8f0",
              }}>
                <p style={{ fontSize: 6, color: "#64748b", margin: 0 }}>Visite</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", margin: 0 }}>4</p>
              </div>
              <div style={{
                flex: 1,
                background: "#fff",
                borderRadius: 5,
                padding: 5,
                border: "1px solid #e2e8f0",
              }}>
                <p style={{ fontSize: 6, color: "#64748b", margin: 0 }}>Vendite</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#10b981", margin: 0 }}>€890</p>
              </div>
            </div>

            {/* Recent visits */}
            <div style={{
              background: "#fff",
              borderRadius: 5,
              padding: 5,
              border: "1px solid #e2e8f0",
            }}>
              <p style={{ fontSize: 7, fontWeight: 600, color: "#1e293b", margin: "0 0 3px" }}>
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
                  padding: "2px 0",
                  borderBottom: i < 1 ? "1px solid #f1f5f9" : "none",
                }}>
                  <p style={{ fontSize: 7, color: "#1e293b", margin: 0 }}>{v.name}</p>
                  <span style={{ fontSize: 7, fontWeight: 600, color: "#10b981" }}>{v.amount}</span>
                </div>
              ))}
            </div>

            {/* Chat preview */}
            <div style={{
              background: "#fff",
              borderRadius: 5,
              padding: 5,
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 3 }}>
                <span style={{ fontSize: 8 }}>💬</span>
                <span style={{ fontSize: 7, fontWeight: 600, color: "#1e293b" }}>Chat AI</span>
              </div>
              <div style={{
                background: "#f1f5f9",
                borderRadius: 3,
                padding: 3,
                fontSize: 6,
                color: "#475569",
              }}>
                "Chi non ordina da 30gg?"
              </div>
            </div>
          </div>

          {/* Play overlay */}
          <div 
            className="group-hover:opacity-100 opacity-80 transition-opacity"
            style={{
              position: "absolute",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              borderRadius: 10,
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
            }}
          >
            <span style={{ fontSize: 10 }}>▶</span>
            <span style={{ fontSize: 9, color: "white", fontWeight: 600 }}>Clicca per provare</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
