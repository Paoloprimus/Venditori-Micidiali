"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

interface BetaToken {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
  note: string | null;
}

export default function AdminTokensPage() {
  const [tokens, setTokens] = useState<BetaToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [batchCount, setBatchCount] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Carica tokens
  const loadTokens = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("beta_tokens")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      setError("Errore caricamento tokens: " + error.message);
    } else {
      setTokens(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // Genera un singolo token
  async function generateToken() {
    setGenerating(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc("generate_beta_token", {
        p_note: newNote || null,
      });
      
      if (error) throw error;
      
      setNewNote("");
      await loadTokens();
    } catch (err: any) {
      setError("Errore generazione token: " + (err.message || "Errore sconosciuto"));
    } finally {
      setGenerating(false);
    }
  }

  // Genera batch di tokens
  async function generateBatch() {
    setGenerating(true);
    setError(null);
    
    try {
      for (let i = 0; i < batchCount; i++) {
        await supabase.rpc("generate_beta_token", {
          p_note: `Batch ${new Date().toLocaleDateString("it-IT")} #${i + 1}`,
        });
      }
      await loadTokens();
    } catch (err: any) {
      setError("Errore generazione batch: " + (err.message || "Errore sconosciuto"));
    } finally {
      setGenerating(false);
    }
  }

  // Copia token negli appunti
  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback
      const textArea = document.createElement("textarea");
      textArea.value = token;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  // Stats
  const available = tokens.filter(t => !t.used_by && new Date(t.expires_at) > new Date()).length;
  const used = tokens.filter(t => t.used_by).length;
  const expired = tokens.filter(t => !t.used_by && new Date(t.expires_at) <= new Date()).length;

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#0B1220", 
      color: "#C9D1E7",
      padding: 24
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <Link href="/admin" style={{ color: "#3B82F6", textDecoration: "none" }}>
            ← Admin
          </Link>
          <h1 style={{ margin: 0, fontSize: 24 }}>🎟️ Token Beta</h1>
        </div>

        {/* Stats */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(3, 1fr)", 
          gap: 16, 
          marginBottom: 24 
        }}>
          <div style={{ 
            background: "#0D2818", 
            padding: 16, 
            borderRadius: 12, 
            textAlign: "center",
            border: "1px solid #22C55E"
          }}>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#22C55E" }}>{available}</div>
            <div style={{ color: "#9CA3AF", fontSize: 12 }}>Disponibili</div>
          </div>
          <div style={{ 
            background: "#1E1B2E", 
            padding: 16, 
            borderRadius: 12, 
            textAlign: "center",
            border: "1px solid #8B5CF6"
          }}>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#8B5CF6" }}>{used}</div>
            <div style={{ color: "#9CA3AF", fontSize: 12 }}>Usati</div>
          </div>
          <div style={{ 
            background: "#1F1F1F", 
            padding: 16, 
            borderRadius: 12, 
            textAlign: "center",
            border: "1px solid #6B7280"
          }}>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#6B7280" }}>{expired}</div>
            <div style={{ color: "#9CA3AF", fontSize: 12 }}>Scaduti</div>
          </div>
        </div>

        {/* Genera nuovo token */}
        <div style={{ 
          background: "#111827", 
          padding: 20, 
          borderRadius: 12, 
          marginBottom: 24,
          border: "1px solid #1F2937"
        }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>Genera Token</h3>
          
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Nota (opzionale, es. 'Per Mario Rossi')"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              style={{
                flex: 1,
                padding: 10,
                background: "#0B1220",
                border: "1px solid #1F2937",
                borderRadius: 8,
                color: "#C9D1E7"
              }}
            />
            <button
              onClick={generateToken}
              disabled={generating}
              style={{
                padding: "10px 20px",
                background: "#3B82F6",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: generating ? "wait" : "pointer",
                opacity: generating ? 0.5 : 1
              }}
            >
              {generating ? "..." : "🎟️ Genera 1"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ color: "#9CA3AF", fontSize: 13 }}>Oppure genera batch:</span>
            <select
              value={batchCount}
              onChange={e => setBatchCount(Number(e.target.value))}
              style={{
                padding: 8,
                background: "#0B1220",
                border: "1px solid #1F2937",
                borderRadius: 6,
                color: "#C9D1E7"
              }}
            >
              <option value={5}>5 token</option>
              <option value={10}>10 token</option>
              <option value={20}>20 token</option>
            </select>
            <button
              onClick={generateBatch}
              disabled={generating}
              style={{
                padding: "8px 16px",
                background: "#22C55E",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: generating ? "wait" : "pointer",
                opacity: generating ? 0.5 : 1
              }}
            >
              {generating ? "Generando..." : `Genera ${batchCount}`}
            </button>
          </div>
        </div>

        {/* Errore */}
        {error && (
          <div style={{ 
            background: "#2D1B1B", 
            border: "1px solid #EF4444", 
            padding: 12, 
            borderRadius: 8,
            marginBottom: 16,
            color: "#F87171"
          }}>
            {error}
          </div>
        )}

        {/* Lista tokens */}
        <div style={{ 
          background: "#111827", 
          borderRadius: 12, 
          overflow: "hidden",
          border: "1px solid #1F2937"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0B1220" }}>
                <th style={{ padding: 12, textAlign: "left", color: "#9CA3AF", fontSize: 12 }}>Token</th>
                <th style={{ padding: 12, textAlign: "left", color: "#9CA3AF", fontSize: 12 }}>Stato</th>
                <th style={{ padding: 12, textAlign: "left", color: "#9CA3AF", fontSize: 12 }}>Nota</th>
                <th style={{ padding: 12, textAlign: "left", color: "#9CA3AF", fontSize: 12 }}>Creato</th>
                <th style={{ padding: 12, textAlign: "left", color: "#9CA3AF", fontSize: 12 }}>Scade</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#6B7280" }}>
                    Caricamento...
                  </td>
                </tr>
              ) : tokens.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#6B7280" }}>
                    Nessun token generato. Usa i pulsanti sopra per crearne.
                  </td>
                </tr>
              ) : tokens.map((t) => {
                const isExpired = new Date(t.expires_at) <= new Date();
                const isUsed = !!t.used_by;
                
                return (
                  <tr key={t.id} style={{ borderTop: "1px solid #1F2937" }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <code style={{ 
                          fontFamily: "monospace", 
                          color: isUsed ? "#6B7280" : "#22C55E",
                          textDecoration: isExpired && !isUsed ? "line-through" : "none"
                        }}>
                          {t.token}
                        </code>
                        {!isUsed && !isExpired && (
                          <button
                            onClick={() => copyToken(t.token)}
                            style={{
                              padding: "4px 8px",
                              background: copied === t.token ? "#22C55E" : "#1F2937",
                              border: "none",
                              borderRadius: 4,
                              color: copied === t.token ? "white" : "#9CA3AF",
                              cursor: "pointer",
                              fontSize: 11
                            }}
                          >
                            {copied === t.token ? "✓" : "📋"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 12 }}>
                      {isUsed ? (
                        <span style={{ 
                          background: "#1E1B2E", 
                          color: "#8B5CF6", 
                          padding: "4px 8px", 
                          borderRadius: 4,
                          fontSize: 11
                        }}>
                          Usato
                        </span>
                      ) : isExpired ? (
                        <span style={{ 
                          background: "#1F1F1F", 
                          color: "#6B7280", 
                          padding: "4px 8px", 
                          borderRadius: 4,
                          fontSize: 11
                        }}>
                          Scaduto
                        </span>
                      ) : (
                        <span style={{ 
                          background: "#0D2818", 
                          color: "#22C55E", 
                          padding: "4px 8px", 
                          borderRadius: 4,
                          fontSize: 11
                        }}>
                          Disponibile
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 12, color: "#9CA3AF", fontSize: 13 }}>
                      {t.note || "-"}
                    </td>
                    <td style={{ padding: 12, color: "#6B7280", fontSize: 12 }}>
                      {new Date(t.created_at).toLocaleDateString("it-IT")}
                    </td>
                    <td style={{ padding: 12, color: "#6B7280", fontSize: 12 }}>
                      {new Date(t.expires_at).toLocaleDateString("it-IT")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

