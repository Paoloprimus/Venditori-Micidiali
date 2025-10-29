/**
 * ============================================================================
 * PAGINA: Import Clienti (Multipli Formati)
 * ============================================================================
 * 
 * PERCORSO: /app/tools/import-clients/page.tsx
 * URL: https://reping.app/tools/import-clients
 * 
 * DESCRIZIONE:
 * Pagina completa per l'importazione massiva di clienti da file multipli.
 * Include 5 step: Upload → Mapping → Preview → Import → Report
 * 
 * FORMATI SUPPORTATI:
 * - CSV: Parsing con csv-parse
 * - XLSX/XLS: Parsing con libreria xlsx
 * - PDF: Estrazione testo con pdf-parse (solo testo stampato, no scansioni)
 * - Foto (JPG, JPEG, PNG, HEIC): OCR con Tesseract.js (solo testo stampato)
 * 
 * FUNZIONALITÀ:
 * - Upload universale con drag & drop
 * - Riconoscimento automatico formato da estensione
 * - Auto-detection intelligente delle colonne (match esatti + parziali)
 * - Mapping manuale con dropdown
 * - Validazione campi obbligatori
 * - Cifratura automatica campi sensibili (usa scope "table:accounts")
 * - Gestione duplicati tramite blind index
 * - Progress bar durante parsing e import
 * - Report dettagliato finale
 * 
 * DIPENDENZE:
 * - csv-parse/browser/esm/sync (per CSV)
 * - xlsx (per Excel)
 * - pdf-parse (per PDF)
 * - tesseract.js (per OCR foto)
 * - window.cryptoSvc (fornito da CryptoProvider)
 * - API /api/clients/upsert (per salvare i clienti)
 * 
 * NOTA IMPORTANTE:
 * Usa scope "table:accounts" per la cifratura, NON "clients"!
 * 
 * ============================================================================
 */

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { parse } from "csv-parse/browser/esm/sync";
import * as XLSX from "xlsx";
import { createWorker } from "tesseract.js";
import { useDrawers, LeftDrawer, RightDrawer } from "@/components/Drawers";
import TopBar from "@/components/home/TopBar";
import { supabase } from "@/lib/supabase/client";

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
  
  // Drawer
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();
  
  // Logout
  async function logout() {
    try { sessionStorage.removeItem("repping:pph"); } catch {}
    try { localStorage.removeItem("repping:pph"); } catch {}
    await supabase.auth.signOut();
    window.location.href = "/login";
  }
  
  const [step, setStep] = useState<ImportStep>("upload");
  const [rawData, setRawData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [processedClients, setProcessedClients] = useState<ProcessedClient[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [parsingProgress, setParsingProgress] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>("");
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    duplicates: number;
    errors: string[];
  }>({ success: 0, failed: 0, duplicates: 0, errors: [] });

  // Verifica che il crypto sia pronto (esposto dal CryptoProvider su window.cryptoSvc)
  const getCryptoService = () => {
    const svc = (window as any).cryptoSvc;
    if (!svc) {
      throw new Error("CryptoService non disponibile. Assicurati che il CryptoProvider sia attivo.");
    }
    return svc;
  };

  // Auto-detect colonne con priorità ai match esatti
  const autoDetectMapping = (headers: string[]): ColumnMapping => {
    const detected: ColumnMapping = {};
    
    // Prima passata: match esatti
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      
      for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
        // Match esatto con uno degli alias
        if (aliases.some(alias => normalized === alias)) {
          detected[field as keyof ColumnMapping] = header;
          break;
        }
      }
    }
    
    // Seconda passata: match parziali (solo per campi non ancora mappati)
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      
      for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
        // Salta se già mappato nella prima passata
        if (detected[field as keyof ColumnMapping]) continue;
        
        // Match parziale
        if (aliases.some(alias => normalized.includes(alias))) {
          detected[field as keyof ColumnMapping] = header;
          break;
        }
      }
    }
    
    return detected;
  };

  // ==================== PARSER PER OGNI FORMATO ====================

  // Parser CSV
  async function parseCSV(file: File): Promise<{ headers: string[]; data: any[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csvText = event.target?.result as string;
          const records = parse(csvText, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
          });

          if (records.length === 0) {
            reject(new Error("Il file CSV è vuoto!"));
            return;
          }

          const headers = Object.keys(records[0]);
          resolve({ headers, data: records });
        } catch (error: any) {
          reject(new Error(`Errore parsing CSV: ${error.message}`));
        }
      };
      
      reader.onerror = () => reject(new Error("Errore nella lettura del file"));
      reader.readAsText(file, "UTF-8");
    });
  }

  // Parser XLSX
  async function parseXLSX(file: File): Promise<{ headers: string[]; data: any[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          
          // Prendi il primo foglio
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Converti in JSON
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: false, defval: "" });
          
          if (jsonData.length === 0) {
            reject(new Error("Il file Excel è vuoto!"));
            return;
          }

          const headers = Object.keys(jsonData[0] as any);
          resolve({ headers, data: jsonData });
        } catch (error: any) {
          reject(new Error(`Errore parsing Excel: ${error.message}`));
        }
      };
      
      reader.onerror = () => reject(new Error("Errore nella lettura del file"));
      reader.readAsArrayBuffer(file);
    });
  }

  // Parser PDF
  async function parsePDF(file: File): Promise<{ headers: string[]; data: any[] }> {
    return new Promise(async (resolve, reject) => {
      try {
        setParsingProgress("Estrazione testo dal PDF...");
        
        // Leggi il file come ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Usa pdf-parse (importazione dinamica per evitare problemi SSR)
        const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
        const pdfData = await pdfParse(arrayBuffer);
        
        setParsingProgress("Analisi del testo...");
        
        // Estrai il testo e prova a riconoscere righe e colonne
        const text = pdfData.text;
        const lines = text.split("\n").filter(l => l.trim().length > 0);
        
        if (lines.length < 2) {
          reject(new Error("Il PDF non contiene dati tabulari riconoscibili"));
          return;
        }

        // Prova a riconoscere la riga di intestazione
        // (prima riga con più "parole" separate da spazi/tab)
        const headerLine = lines[0];
        const headers = headerLine.split(/\s{2,}|\t/).map(h => h.trim()).filter(h => h.length > 0);
        
        if (headers.length === 0) {
          reject(new Error("Impossibile identificare le colonne nel PDF"));
          return;
        }

        // Prova a parsare le righe successive
        const data: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(/\s{2,}|\t/).map(v => v.trim()).filter(v => v.length > 0);
          
          if (values.length === 0) continue;
          
          const row: any = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || "";
          });
          data.push(row);
        }

        if (data.length === 0) {
          reject(new Error("Nessun dato trovato nel PDF"));
          return;
        }

        setParsingProgress(null);
        resolve({ headers, data });
      } catch (error: any) {
        setParsingProgress(null);
        reject(new Error(`Errore parsing PDF: ${error.message}`));
      }
    });
  }

  // Parser Immagini (OCR)
  async function parseImage(file: File): Promise<{ headers: string[]; data: any[] }> {
    return new Promise(async (resolve, reject) => {
      try {
        setParsingProgress("Inizializzazione OCR...");
        
        // Crea worker Tesseract
        const worker = await createWorker("ita");
        
        setParsingProgress("Lettura del testo dall'immagine...");
        
        // Esegui OCR
        const { data: { text } } = await worker.recognize(file);
        
        await worker.terminate();
        
        setParsingProgress("Analisi del testo estratto...");
        
        // Analizza il testo estratto (simile al PDF)
        const lines = text.split("\n").filter(l => l.trim().length > 0);
        
        if (lines.length < 2) {
          reject(new Error("L'immagine non contiene dati tabulari riconoscibili"));
          return;
        }

        // Prima riga = headers
        const headerLine = lines[0];
        const headers = headerLine.split(/\s{2,}|\t/).map(h => h.trim()).filter(h => h.length > 0);
        
        if (headers.length === 0) {
          reject(new Error("Impossibile identificare le colonne nell'immagine"));
          return;
        }

        // Righe successive = dati
        const data: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(/\s{2,}|\t/).map(v => v.trim()).filter(v => v.length > 0);
          
          if (values.length === 0) continue;
          
          const row: any = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || "";
          });
          data.push(row);
        }

        if (data.length === 0) {
          reject(new Error("Nessun dato trovato nell'immagine"));
          return;
        }

        setParsingProgress(null);
        resolve({ headers, data });
      } catch (error: any) {
        setParsingProgress(null);
        reject(new Error(`Errore OCR: ${error.message}`));
      }
    });
  }

  // Gestione upload file (UNIVERSALE)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Rileva estensione
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf("."));
    
    setFileType(extension);
    setParsingProgress("Caricamento file...");

    try {
      let result: { headers: string[]; data: any[] };

      // Switch sul tipo di file
      if (extension === ".csv") {
        result = await parseCSV(file);
      } else if (extension === ".xlsx" || extension === ".xls") {
        result = await parseXLSX(file);
      } else if (extension === ".pdf") {
        result = await parsePDF(file);
      } else if (extension === ".jpg" || extension === ".jpeg" || extension === ".heic" || extension === ".png") {
        result = await parseImage(file);
      } else {
        alert(`Formato file non supportato: ${extension}\n\nFormati accettati: CSV, XLSX, XLS, PDF, JPG, JPEG, PNG, HEIC`);
        setParsingProgress(null);
        return;
      }

      // Unifica i risultati
      setRawData(result.data);
      setCsvHeaders(result.headers);
      
      // Auto-detect mapping
      const detectedMapping = autoDetectMapping(result.headers);
      setMapping(detectedMapping);
      
      setParsingProgress(null);
      setStep("mapping");
    } catch (error: any) {
      setParsingProgress(null);
      alert(error.message);
    }
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
    setStep("importing");
    setImportProgress(0);

    const validClients = processedClients.filter(c => c.isValid);
    const results = { success: 0, failed: 0, duplicates: 0, errors: [] as string[] };

    try {
      const crypto = getCryptoService();

      // IMPORTANTE: Assicurati che lo scope sia inizializzato
      try {
        console.log("🔐 Inizializzazione scope table:accounts...");
        await crypto.prewarm(["table:accounts"]);
        console.log("✅ Scope table:accounts pronto!");
      } catch (err: any) {
        console.error("❌ Errore init scope:", err);
        alert(`Errore nell'inizializzazione della cifratura: ${err.message}\n\nRicarica la pagina e riprova.`);
        setStep("preview");
        return;
      }

      for (let i = 0; i < validClients.length; i++) {
        const client = validClients[i];
        
        try {
          // 1. Prepara i campi da cifrare
          const fieldsToEncrypt: Record<string, string> = {
            name: client.name!,
            contact_name: client.contact_name!,
            phone: client.phone!,
          };

          // Aggiungi campi opzionali solo se presenti
          if (client.address) fieldsToEncrypt.address = client.address;
          if (client.email) fieldsToEncrypt.email = client.email;
          if (client.vat_number) fieldsToEncrypt.vat_number = client.vat_number;

          // 2. Cifra tutti i campi in un colpo solo
          const encrypted = await crypto.encryptFields("table:accounts", "accounts", null, fieldsToEncrypt);

          // 3. Calcola blind index per name
          const nameBI = await crypto.computeBlindIndex("table:accounts", client.name!);

          // 4. Prepara payload per l'API
          const payload: any = {
            // Campi cifrati obbligatori
            name_enc: encrypted.name_enc,
            name_iv: encrypted.name_iv,
            name_bi: nameBI,
            contact_name_enc: encrypted.contact_name_enc,
            contact_name_iv: encrypted.contact_name_iv,
            phone_enc: encrypted.phone_enc,
            phone_iv: encrypted.phone_iv,
            // Campi in chiaro per LLM
            custom: {
              city: client.city || "",
              tipo_locale: client.tipo_locale || "",
              notes: client.notes || "",
            },
          };

          // Aggiungi campi cifrati opzionali se presenti
          if (encrypted.address_enc) {
            payload.address_enc = encrypted.address_enc;
            payload.address_iv = encrypted.address_iv;
          }
          if (encrypted.email_enc) {
            payload.email_enc = encrypted.email_enc;
            payload.email_iv = encrypted.email_iv;
          }
          if (encrypted.vat_number_enc) {
            payload.vat_number_enc = encrypted.vat_number_enc;
            payload.vat_number_iv = encrypted.vat_number_iv;
          }

          // 5. Salva via API upsert
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
    <>
      {/* TopBar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <TopBar
          title="Importa Clienti"
          onOpenLeft={openLeft}
          onOpenDati={openDati}
          onOpenDocs={openDocs}
          onOpenImpostazioni={openImpostazioni}
          onLogout={logout}
        />
      </div>

      <div style={{ minHeight: "100vh", background: "#f9fafb", padding: 24 }}>
        {/* Spacer per TopBar */}
        <div style={{ height: 70 }} />
        
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
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>📁 Seleziona File</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Carica un file con l'elenco dei tuoi clienti. Supportiamo CSV, Excel, PDF e foto. Il sistema cifrerà automaticamente i dati sensibili.
            </p>

            {/* Indicatore parsing progress */}
            {parsingProgress && (
              <div style={{ marginBottom: 24, padding: 16, background: "#fef3c7", borderRadius: 8, border: "1px solid #fbbf24" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 24 }}>⏳</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#92400e" }}>{parsingProgress}</div>
                    <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>
                      Attendi... l'operazione potrebbe richiedere alcuni secondi
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div
              onClick={() => !parsingProgress && fileInputRef.current?.click()}
              style={{
                border: "2px dashed #d1d5db",
                borderRadius: 12,
                padding: 48,
                textAlign: "center",
                cursor: parsingProgress ? "wait" : "pointer",
                background: "#f9fafb",
                transition: "all 0.2s",
                opacity: parsingProgress ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!parsingProgress) {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.borderColor = "#9ca3af";
                }
              }}
              onMouseLeave={(e) => {
                if (!parsingProgress) {
                  e.currentTarget.style.background = "#f9fafb";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                Clicca per selezionare un file
              </p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>
                oppure trascina il file qui
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                CSV • Excel • PDF • Foto (JPG, PNG, HEIC)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.heic"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              disabled={!!parsingProgress}
            />

            <div style={{ marginTop: 32, padding: 16, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📋 Formati Supportati</h3>
              
              <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                <div>
                  <strong style={{ fontSize: 13, color: "#1e40af" }}>📄 CSV / Excel:</strong>
                  <p style={{ fontSize: 12, color: "#1e40af", marginTop: 4 }}>
                    File tabellari con colonne Nome Cliente, Nome Contatto, Città, Indirizzo, Tipo Locale, Telefono (Email, P.IVA, Note opzionali)
                  </p>
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: "#1e40af" }}>📕 PDF:</strong>
                  <p style={{ fontSize: 12, color: "#1e40af", marginTop: 4 }}>
                    Documenti PDF con tabelle o liste (testo stampato, non scansioni)
                  </p>
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: "#1e40af" }}>📸 Foto:</strong>
                  <p style={{ fontSize: 12, color: "#1e40af", marginTop: 4 }}>
                    Foto di liste stampate con OCR (solo testo stampato, non manoscritto)
                  </p>
                </div>
              </div>

              <p style={{ fontSize: 13, color: "#1e40af", fontFamily: "monospace", background: "white", padding: 8, borderRadius: 4, overflow: "auto" }}>
                Esempio colonne: name,contact_name,city,address,tipo_locale,phone
              </p>
            </div>

            <button
              onClick={() => router.push("/clients")}
              disabled={!!parsingProgress}
              style={{
                marginTop: 24,
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "white",
                cursor: parsingProgress ? "not-allowed" : "pointer",
                fontSize: 14,
                opacity: parsingProgress ? 0.6 : 1,
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

    {/* Drawer */}
    <div style={{ position: "relative", zIndex: 2001 }}>
      <LeftDrawer open={leftOpen} onClose={closeLeft} onSelect={() => {}} />
      <RightDrawer open={rightOpen} content={rightContent} onClose={closeRight} />
    </div>
  </>
  );
}
