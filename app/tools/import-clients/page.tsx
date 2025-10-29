"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parse } from "csv-parse/browser/esm/sync";

type CsvRow = {
  name?: string;
  contact_name?: string;
  city?: string;
  address?: string;
  tipo_locale?: string;
  phone?: string;
  email?: string;
  vat_number?: string;
  notes?: string;
};

type ValidationError = {
  row: number;
  field: string;
  message: string;
};

type ProcessedClient = CsvRow & {
  rowIndex: number;
  isValid: boolean;
  errors: string[];
};

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

type ColumnMapping = {
  name?: string;
  contact_name?: string;
  city?: string;
  address?: string;
  tipo_locale?: string;
  phone?: string;
  email?: string;
  vat_number?: string;
  notes?: string;
};

// Auto-detection intelligente delle colonne
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["name", "nome", "ragione sociale", "azienda", "cliente", "company", "business name"],
  contact_name: ["contact_name", "contatto", "nome contatto", "referente", "contact", "person"],
  city: ["city", "città", "citta", "comune", "location"],
  address: ["address", "indirizzo", "via", "street", "location"],
  tipo_locale: ["tipo_locale", "tipo", "type", "categoria", "category"],
  phone: ["phone", "telefono", "tel", "mobile", "cellulare"],
  email: ["email", "mail", "e-mail", "posta"],
  vat_number: ["vat_number", "p.iva", "piva", "partita iva", "vat", "tax id"],
  notes: ["notes", "note", "commenti", "comments", "memo"],
};

export default function ImportClientsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [rawData, setRawData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [processedClients, setProcessedClients] = useState<ProcessedClient[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    duplicates: number;
    errors: string[];
  }>({ success: 0, failed: 0, duplicates: 0, errors: [] });
  const [cryptoReady, setCryptoReady] = useState(false);

  // Inizializza CryptoService
  useEffect(() => {
    const initCrypto = async () => {
      try {
        const { CryptoService } = await import("@/lib/crypto/CryptoService");
        const svc = CryptoService.getInstance();
        await svc.ensureReady();
        setCryptoReady(true);
      } catch (err) {
        console.error("❌ Errore init crypto:", err);
        alert("Errore nell'inizializzazione della cifratura. Ricarica la pagina.");
      }
    };
    initCrypto();
  }, []);

  // Auto-detect colonne
  const autoDetectMapping = (headers: string[]): ColumnMapping => {
    const detected: ColumnMapping = {};
    
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      
      for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.some(alias => normalized.includes(alias))) {
          detected[field as keyof ColumnMapping] = header;
          break;
        }
      }
    }
    
    return detected;
  };

  // Gestione upload file
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        
        // Parse CSV con csv-parse
        const records = parse(csvText, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true, // Gestisce UTF-8 BOM
        });

        if (records.length === 0) {
          alert("Il file CSV è vuoto!");
          return;
        }

        // Estrai headers dal primo record
        const headers = Object.keys(records[0]);
        
        setRawData(records);
        setCsvHeaders(headers);
        
        // Auto-detect mapping
        const detectedMapping = autoDetectMapping(headers);
        setMapping(detectedMapping);
        
        setStep("mapping");
      } catch (error: any) {
        alert(`Errore nel parsing del CSV: ${error.message}`);
      }
    };
    
    reader.onerror = () => {
      alert("Errore nella lettura del file");
    };
    
    reader.readAsText(file, "UTF-8");
  };

  // Validazione singolo cliente
  const validateClient = (row: any, rowIndex: number): ProcessedClient => {
    const errors: string[] = [];
    const client: CsvRow = {};

    // Applica mapping
    for (const [field, csvColumn] of Object.entries(mapping)) {
      if (csvColumn && row[csvColumn]) {
        client[field as keyof CsvRow] = String(row[csvColumn]).trim();
      }
    }

    // Validazione campi obbligatori
    if (!client.name) errors.push("Nome azienda mancante");
    if (!client.contact_name) errors.push("Nome contatto mancante");
    if (!client.city) errors.push("Città mancante");
    if (!client.address) errors.push("Indirizzo mancante");
    if (!client.tipo_locale) errors.push("Tipo locale mancante");
    if (!client.phone) errors.push("Telefono mancante");

    return {
      ...client,
      rowIndex: rowIndex + 1,
      isValid: errors.length === 0,
      errors,
    };
  };

  // Preview e validazione
  const handlePreview = () => {
    const processed = rawData.map((row, idx) => validateClient(row, idx));
    setProcessedClients(processed);
    setStep("preview");
  };

  // Import con cifratura
  const handleImport = async () => {
    if (!cryptoReady) {
      alert("Sistema di cifratura non pronto. Riprova.");
      return;
    }

    setStep("importing");
    setImportProgress(0);

    const validClients = processedClients.filter(c => c.isValid);
    const results = { success: 0, failed: 0, duplicates: 0, errors: [] as string[] };

    try {
      const { CryptoService } = await import("@/lib/crypto/CryptoService");
      const crypto = CryptoService.getInstance();

      for (let i = 0; i < validClients.length; i++) {
        const client = validClients[i];
        
        try {
          // 1. Cifra i campi sensibili
          const nameEnc = await crypto.encryptText(client.name!, "clients");
          const addressEnc = client.address ? await crypto.encryptText(client.address, "clients") : null;
          const contactNameEnc = await crypto.encryptText(client.contact_name!, "clients");
          const phoneEnc = await crypto.encryptText(client.phone!, "clients");
          const emailEnc = client.email ? await crypto.encryptText(client.email, "clients") : null;
          const vatEnc = client.vat_number ? await crypto.encryptText(client.vat_number, "clients") : null;

          // 2. Calcola blind index per name
          const nameBI = await crypto.computeBlindIndex(client.name!);

          // 3. Prepara payload
          const payload: any = {
            name_enc: nameEnc.ciphertext,
            name_iv: nameEnc.iv,
            name_bi: nameBI,
            contact_name_enc: contactNameEnc.ciphertext,
            contact_name_iv: contactNameEnc.iv,
            phone_enc: phoneEnc.ciphertext,
            phone_iv: phoneEnc.iv,
            custom: {
              city: client.city || "",
              tipo_locale: client.tipo_locale || "",
              notes: client.notes || "",
            },
          };

          if (addressEnc) {
            payload.address_enc = addressEnc.ciphertext;
            payload.address_iv = addressEnc.iv;
          }
          if (emailEnc) {
            payload.email_enc = emailEnc.ciphertext;
            payload.email_iv = emailEnc.iv;
          }
          if (vatEnc) {
            payload.vat_number_enc = vatEnc.ciphertext;
            payload.vat_number_iv = vatEnc.iv;
          }

          // 4. Salva via API upsert
          const res = await fetch("/api/clients/upsert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            results.success++;
          } else {
            const err = await res.json();
            results.failed++;
            results.errors.push(`Riga ${client.rowIndex}: ${err.error || "Errore sconosciuto"}`);
          }
        } catch (err: any) {
          results.failed++;
          results.errors.push(`Riga ${client.rowIndex}: ${err.message || "Errore cifratura"}`);
        }

        // Aggiorna progress
        setImportProgress(Math.round(((i + 1) / validClients.length) * 100));
      }

      setImportResults(results);
      setStep("complete");
    } catch (err: any) {
      alert(`Errore durante l'import: ${err.message}`);
      setStep("preview");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            📥 Importa Lista Clienti
          </h1>
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            Carica un file CSV per importare clienti in blocco. Tutti i dati sensibili saranno cifrati automaticamente.
          </p>
        </div>

        {/* Progress indicator */}
        {step !== "upload" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 32, padding: 16, background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            {["upload", "mapping", "preview", "importing", "complete"].map((s, idx) => (
              <div key={s} style={{ flex: 1, textAlign: "center" }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: step === s ? "#2563eb" : idx < ["upload", "mapping", "preview", "importing", "complete"].indexOf(step) ? "#10b981" : "#e5e7eb",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 8px",
                  fontSize: 14,
                  fontWeight: 600,
                }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {s === "upload" ? "Upload" : s === "mapping" ? "Mapping" : s === "preview" ? "Preview" : s === "importing" ? "Import" : "Completato"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========== STEP: UPLOAD ========== */}
        {step === "upload" && (
          <div style={{ background: "white", borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>📁 Seleziona File CSV</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Carica un file CSV con l'elenco dei tuoi clienti. Il sistema cifrerà automaticamente i dati sensibili.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed #d1d5db",
                borderRadius: 12,
                padding: 48,
                textAlign: "center",
                cursor: "pointer",
                background: "#f9fafb",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.borderColor = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f9fafb";
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                Clicca per selezionare un file CSV
              </p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>
                oppure trascina il file qui
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            <div style={{ marginTop: 32, padding: 16, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📋 Formato CSV richiesto</h3>
              <p style={{ fontSize: 13, color: "#1e40af", marginBottom: 8 }}>
                <strong>Campi obbligatori:</strong> Nome Cliente, Nome Contatto, Città, Indirizzo, Tipo Locale, Telefono
              </p>
              <p style={{ fontSize: 13, color: "#1e40af", marginBottom: 12 }}>
                <strong>Campi opzionali:</strong> Email, P.IVA, Note
              </p>
              <p style={{ fontSize: 13, color: "#1e40af", fontFamily: "monospace", background: "white", padding: 8, borderRadius: 4, overflow: "auto" }}>
                name,contact_name,city,address,tipo_locale,phone,email,vat_number,notes
              </p>
            </div>

            <button
              onClick={() => router.push("/clients")}
              style={{
                marginTop: 24,
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "white",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ← Annulla
            </button>
          </div>
        )}

        {/* ========== STEP: MAPPING ========== */}
        {step === "mapping" && (
          <div style={{ background: "white", borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>🔗 Mappa le Colonne</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Collega le colonne del CSV ai campi cliente. Alcuni sono già stati mappati automaticamente.
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              {Object.entries({
                name: "Nome Cliente *",
                contact_name: "Nome Contatto *",
                city: "Città *",
                address: "Indirizzo *",
                tipo_locale: "Tipo Locale *",
                phone: "Telefono *",
                email: "Email",
                vat_number: "P.IVA",
                notes: "Note",
              }).map(([field, label]) => (
                <div key={field} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 200, fontWeight: 500, fontSize: 14 }}>
                    {label}
                  </div>
                  <select
                    value={mapping[field as keyof ColumnMapping] || ""}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      fontSize: 14,
                    }}
                  >
                    <option value="">-- Non mappato --</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, padding: 12, background: "#fef3c7", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
              ℹ️ I campi contrassegnati con * sono <strong>obbligatori</strong>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button
                onClick={() => setStep("upload")}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ← Indietro
              </button>
              <button
                onClick={handlePreview}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Continua →
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP: PREVIEW ========== */}
        {step === "preview" && (
          <div style={{ background: "white", borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>👀 Anteprima Dati</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Verifica i dati prima dell'importazione. I record con errori saranno saltati automaticamente.
            </p>

            <div style={{ marginBottom: 24, display: "flex", gap: 16 }}>
              <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#15803d" }}>
                  {processedClients.filter(c => c.isValid).length}
                </div>
                <div style={{ fontSize: 12, color: "#15803d" }}>✅ Validi</div>
              </div>
              <div style={{ padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#dc2626" }}>
                  {processedClients.filter(c => !c.isValid).length}
                </div>
                <div style={{ fontSize: 12, color: "#dc2626" }}>❌ Con errori</div>
              </div>
            </div>

            <div style={{ maxHeight: 400, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead style={{ background: "#f9fafb", position: "sticky", top: 0 }}>
                  <tr>
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Riga</th>
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Status</th>
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Nome</th>
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Contatto</th>
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Città</th>
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Errori</th>
                  </tr>
                </thead>
                <tbody>
                  {processedClients.map((client, idx) => (
                    <tr key={idx} style={{ background: client.isValid ? "white" : "#fef2f2" }}>
                      <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>{client.rowIndex}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                        {client.isValid ? "✅" : "❌"}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>{client.name || "-"}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>{client.contact_name || "-"}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>{client.city || "-"}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb", color: "#dc2626" }}>
                        {client.errors.join(", ") || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button
                onClick={() => setStep("mapping")}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ← Indietro
              </button>
              <button
                onClick={handleImport}
                disabled={processedClients.filter(c => c.isValid).length === 0}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: processedClients.filter(c => c.isValid).length === 0 ? "#d1d5db" : "#10b981",
                  color: "white",
                  cursor: processedClients.filter(c => c.isValid).length === 0 ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                🚀 Importa {processedClients.filter(c => c.isValid).length} clienti
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP: IMPORTING ========== */}
        {step === "importing" && (
          <div style={{ background: "white", borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Importazione in corso...</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Stiamo cifrando e salvando i tuoi clienti. Non chiudere questa pagina.
            </p>

            <div style={{ maxWidth: 400, margin: "0 auto" }}>
              <div style={{ width: "100%", height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                <div style={{
                  width: `${importProgress}%`,
                  height: "100%",
                  background: "#2563eb",
                  transition: "width 0.3s",
                }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: "#2563eb" }}>
                {importProgress}%
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP: COMPLETE ========== */}
        {step === "complete" && (
          <div style={{ background: "white", borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>
                {importResults.failed === 0 ? "🎉" : "⚠️"}
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                {importResults.failed === 0 ? "Importazione Completata!" : "Importazione Completata con Avvisi"}
              </h2>
              <p style={{ color: "#6b7280" }}>
                Ecco il riepilogo dell'operazione
              </p>
            </div>

            <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
              <div style={{ padding: 16, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#15803d" }}>
                  {importResults.success}
                </div>
                <div style={{ fontSize: 14, color: "#15803d" }}>✅ Clienti importati con successo</div>
              </div>

              {importResults.failed > 0 && (
                <div style={{ padding: 16, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#dc2626" }}>
                    {importResults.failed}
                  </div>
                  <div style={{ fontSize: 14, color: "#dc2626" }}>❌ Errori durante l'importazione</div>
                </div>
              )}
            </div>

            {importResults.errors.length > 0 && (
              <div style={{ marginBottom: 24, padding: 16, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#dc2626" }}>
                  Dettagli Errori:
                </h3>
                <ul style={{ fontSize: 13, color: "#7f1d1d", paddingLeft: 20 }}>
                  {importResults.errors.slice(0, 10).map((err, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>{err}</li>
                  ))}
                  {importResults.errors.length > 10 && (
                    <li style={{ fontStyle: "italic" }}>
                      ... e altri {importResults.errors.length - 10} errori
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => router.push("/clients")}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                📋 Vai alla lista clienti
              </button>
              <button
                onClick={() => {
                  setStep("upload");
                  setRawData([]);
                  setCsvHeaders([]);
                  setMapping({});
                  setProcessedClients([]);
                  setImportProgress(0);
                  setImportResults({ success: 0, failed: 0, duplicates: 0, errors: [] });
                }}
                style={{
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                🔄 Importa altra lista
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
