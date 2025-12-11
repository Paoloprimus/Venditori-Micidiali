/**
 * ============================================================================
 * PAGINA: Import Clienti (CSV e Excel)
 * ============================================================================
 * * PERCORSO: /app/tools/import-clients/page.tsx
 * URL: https://reping.app/tools/import-clients
 * * DESCRIZIONE:
 * Pagina completa per l'importazione massiva di clienti da file CSV e Excel.
 * Include 5 step: Upload → Mapping → Preview → Import → Report
 * * FORMATI SUPPORTATI:
 * - CSV: Parsing con csv-parse
 * - XLSX/XLS: Parsing con libreria xlsx
 * * FUNZIONALITÀ:
 * - Upload universale con drag & drop
 * - Riconoscimento automatico formato da estensione
 * - Auto-detection intelligente delle colonne (match esatti + parziali)
 * - Mapping manuale con dropdown
 * - Validazione campi obbligatori
 * - Cifratura automatica campi sensibili (usa scope "table:accounts")
 * - Gestione duplicati tramite blind index
 * - Progress bar durante parsing e import
 * - Report dettagliato finale
 * * DIPENDENZE:
 * - csv-parse/browser/esm/sync (per CSV)
 * - xlsx (per Excel)
 * - window.cryptoSvc (fornito da CryptoProvider)
 * - API /api/clients/upsert (per salvare i clienti)
 * * NOTA IMPORTANTE:
 * Usa scope "table:accounts" per la cifratura, NON "clients"!
 * * ============================================================================
 */

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { parse } from "csv-parse/browser/esm/sync";
import * as XLSX from "xlsx";
import { useDrawers, LeftDrawer, RightDrawer } from "@/components/Drawers";
import TopBar from "@/components/home/TopBar";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { geocodeAddressWithDelay } from "@/lib/geocoding";

// Aggiungo l'import per crypto se non esiste. Se l'ambiente non ha crypto.randomUUID() disponibile globalmente,
// questo potrebbe essere necessario. Tuttavia, in ambienti moderni come Next.js client side, è spesso globale.
// Per sicurezza, lo usiamo come metodo disponibile.

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
  latitude?: string;
  longitude?: string;
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

// Mapping: colonna CSV -> campo app
type ColumnMapping = Record<string, string | undefined>;

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
  latitude: ["latitude", "lat", "latitudine"],
  longitude: ["longitude", "lon", "lng", "longitudine"],
};

export default function ImportClientsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const geocodingAbortRef = useRef(false);
  
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
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState("");
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
  
  // Funzione helper per generare UUID (usiamo l'API standard dei browser/Node.js)
  const generateUUID = (): string => {
    // Usiamo crypto.randomUUID() che è standard in Node.js >= 14 e nei browser moderni
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback se l'ambiente non ha crypto.randomUUID (improbabile in Next.js moderno)
    // Qui puoi mettere un'implementazione di fallback, ma per ora assumiamo la presenza.
    throw new Error("UUID generator non disponibile. Ambiente non supportato.");
  }


  // Auto-detect colonne con priorità ai match esatti (INVERTITO: header -> field)
  const autoDetectMapping = (headers: string[]): ColumnMapping => {
    const detected: ColumnMapping = {};
    
    // Prima passata: match esatti
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      
      for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
        // Match esatto con uno degli alias
        if (aliases.some(alias => normalized === alias)) {
          detected[header] = field; // INVERTITO: header -> field
          break;
        }
      }
    }
    
    // Seconda passata: match parziali (solo per colonne non ancora mappate)
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      
      for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
        // Salta se già mappato nella prima passata
        if (detected[header]) continue;
        
        // Match parziale
        if (aliases.some(alias => normalized.includes(alias))) {
          detected[header] = field; // INVERTITO: header -> field
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
          setParsingProgress(null);
          resolve({ headers, data: records });
        } catch (error: any) {
          setParsingProgress(null);
          reject(new Error(`Errore parsing CSV: ${error.message}`));
        }
      };

      reader.onerror = () => {
        setParsingProgress(null);
        reject(new Error("Errore lettura file CSV"));
      };

      reader.readAsText(file);
    });
  }

  // Parser Excel
  async function parseExcel(file: File): Promise<{ headers: string[]; data: any[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: "array" });

          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          if (jsonData.length === 0) {
            reject(new Error("Il file Excel è vuoto!"));
            return;
          }

          const headers = Object.keys(jsonData[0] as any);
          setParsingProgress(null);
          resolve({ headers, data: jsonData });
        } catch (error: any) {
          setParsingProgress(null);
          reject(new Error(`Errore parsing Excel: ${error.message}`));
        }
      };

      reader.onerror = () => {
        setParsingProgress(null);
        reject(new Error("Errore lettura file Excel"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  // Gestione upload file
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
        result = await parseExcel(file);
      } else {
        throw new Error(`Formato file non supportato: ${extension}`);
      }

      // Salva headers e dati
      setCsvHeaders(result.headers);
      setRawData(result.data);

      // Auto-detect mapping
      const detected = autoDetectMapping(result.headers);
      setMapping(detected);

      // Vai a step mapping
      setStep("mapping");

    } catch (error: any) {
      alert(error.message);
      setParsingProgress(null);
    }
  };

  // Preview con validazione
  const handlePreview = () => {
    const processed: ProcessedClient[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const rawRow = rawData[i];
      const mappedRow: CsvRow = {};
      const errors: string[] = [];

      // Applica mapping
      for (const [csvCol, appField] of Object.entries(mapping)) {
        if (appField) {
          mappedRow[appField as keyof CsvRow] = rawRow[csvCol];
        }
      }

      // Validazione campi obbligatori
      if (!mappedRow.name || mappedRow.name.trim() === "") {
        errors.push("Nome Cliente mancante");
      }
      if (!mappedRow.contact_name || mappedRow.contact_name.trim() === "") {
        errors.push("Nome Contatto mancante");
      }
      if (!mappedRow.phone || mappedRow.phone.trim() === "") {
        errors.push("Telefono mancante");
      }
      if (!mappedRow.address || mappedRow.address.trim() === "") {
        errors.push("Indirizzo mancante");
      }

      processed.push({
        ...mappedRow,
        rowIndex: i + 1,
        isValid: errors.length === 0,
        errors,
      });
    }

    setProcessedClients(processed);
    setStep("preview");
  };

  // Geocoding automatico dopo import
  async function geocodeImportedClients() {
    geocodingAbortRef.current = false;
    setGeocoding(true);
    setGeocodeProgress("Avvio geocodificazione...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast("❌ Utente non autenticato", "error");
        return;
      }

      // Trova clienti senza coordinate (appena importati)
      const { data: clients, error } = await supabase
        .from("accounts")
        .select("id, street, city")
        .eq("user_id", user.id)
        .or("latitude.is.null,longitude.is.null")
        .not("street", "is", null)
        .not("city", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[Geocode] Errore query:", error);
        toast("❌ Errore durante geocodificazione", "error");
        return;
      }

      if (!clients || clients.length === 0) {
        toast("✅ Tutti i clienti hanno già coordinate GPS", "success");
        return;
      }

      const total = clients.length;
      let success = 0;
      let failed = 0;

      for (let i = 0; i < clients.length; i++) {
        if (geocodingAbortRef.current) {
          toast(`⏹️ Geocodificazione interrotta (${success} completati)`, "info");
          break;
        }

        const client = clients[i];
        setGeocodeProgress(`📍 ${i + 1}/${total}: ${client.city}...`);

        try {
          const coords = await geocodeAddressWithDelay(
            client.street || "",
            client.city || "Italia"
          );

          if (coords) {
            await supabase
              .from("accounts")
              .update({
                latitude: coords.latitude,
                longitude: coords.longitude,
              })
              .eq("id", client.id);
            success++;
          } else {
            failed++;
          }
        } catch (e) {
          console.error("[Geocode] Errore cliente:", e);
          failed++;
        }
      }

      if (!geocodingAbortRef.current) {
        if (failed === 0) {
          toast(`✅ Geocodificazione completata! ${success} clienti con coordinate GPS`, "success");
        } else {
          toast(`⚠️ Geocodificazione: ${success} OK, ${failed} non trovati`, "info");
        }
      }
    } catch (e: any) {
      console.error("[Geocode] Errore:", e);
      toast("❌ Errore durante geocodificazione", "error");
    } finally {
      setGeocoding(false);
      setGeocodeProgress("");
    }
  }

  // Import finale
  const handleImport = async () => {
    setStep("importing");
    setImportProgress(0);
    
    // Inizializza scope crypto prima di tutto
    try {
      const cryptoSvc = getCryptoService();
      await cryptoSvc.getOrCreateScopeKeys("table:accounts");
      console.log("✅ [Import] Scope table:accounts inizializzato");
    } catch (e: any) {
      const errorMsg = `Errore inizializzazione crypto: ${e.message}`;
      console.error("❌ [Import]", errorMsg);
      alert(errorMsg);
      setStep("preview");
      return;
    }
    
    const results = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [] as string[],
    };

    const validClients = processedClients.filter(c => c.isValid);
    const cryptoSvc = getCryptoService();

    for (let i = 0; i < validClients.length; i++) {
      const client = validClients[i];
      
      try {
        // ========== INIZIO MODIFICHE CRITICHE ==========

        // 1. Genera un UUID per il nuovo account PRIMA di cifrare.
        const accountId = generateUUID(); 

        // Prepara l'oggetto con i campi da cifrare
        const fieldsToEncrypt: Record<string, string> = {};
        
        if (client.name) fieldsToEncrypt.name = client.name;
        if (client.contact_name) fieldsToEncrypt.contact_name = client.contact_name;
        // city NON viene cifrata - va in chiaro per Text-to-SQL
        if (client.phone) fieldsToEncrypt.phone = client.phone;
        if (client.address) fieldsToEncrypt.address = client.address;
        if (client.email) fieldsToEncrypt.email = client.email;
        if (client.vat_number) fieldsToEncrypt.vat_number = client.vat_number;
        
        // 2. Cifra tutti i campi, passando l'UUID appena creato come ID dell'oggetto.
        // Questo UUID diventerà l'Associated Data (AD) che DEVE corrispondere
        // durante la decifratura (decryptFields)
        const encrypted = await (cryptoSvc as any).encryptFields(
          "table:accounts",
          "accounts",
          accountId, // PASSAGGIO CHIAVE: USARE l'ID dell'account!
          fieldsToEncrypt
        );
        
        // Genera blind index per il name
        const nameBlindIndex = await (cryptoSvc as any).computeBlindIndex(
          "table:accounts",
          client.name || ""
        );
        
        // 3. Aggiungi l'ID generato al payload per l'upsert
        const payload: any = { 
          id: accountId, // ✅ ID del nuovo account
          ...encrypted,
          name_bi: nameBlindIndex  // ✅ OBBLIGATORIO!
        };
        
        // ========== FINE MODIFICHE CRITICHE ==========

        // Aggiungi city in chiaro (per Text-to-SQL)
        if (client.city) {
          payload.city = client.city;
        }

        // Aggiungi notes in chiaro (campo separato)
        if (client.notes) {
          payload.notes = client.notes;
        }

        // Custom vuoto per ora
        payload.custom = {};

        // Aggiungi tipo_locale come campo separato (non in custom)
        if (client.tipo_locale) {
          payload.tipo_locale = client.tipo_locale;
        }

        // Aggiungi coordinate GPS (in chiaro, non cifrate)
        if (client.latitude) {
          const lat = parseFloat(client.latitude);
          if (!isNaN(lat)) {
            // Converti in stringa con max 8 decimali per numeric(10,8)
            payload.latitude = lat.toFixed(8);
          }
        }
        if (client.longitude) {
          const lon = parseFloat(client.longitude);
          if (!isNaN(lon)) {
            // Converti in stringa con max 8 decimali per numeric(11,8)
            payload.longitude = lon.toFixed(8);
          }
        }

        // Invia al server
        const response = await fetch("/api/clients/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          results.success++;
        } else {
          const errorData = await response.json();
          if (errorData.error?.includes("duplicate")) {
            results.duplicates++;
          } else {
            results.failed++;
            results.errors.push(`Riga ${client.rowIndex}: ${errorData.error || "Errore sconosciuto"}`);
          }
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Riga ${client.rowIndex}: ${error.message}`);
      }

      setImportProgress(Math.round(((i + 1) / validClients.length) * 100));
    }

    setImportResults(results);
    setStep("complete");
    
    // Toast di conferma import
    if (results.success > 0) {
      toast(`✅ Import completato: ${results.success} clienti importati`, "success");
      
      // Avvia geocoding in background se ci sono clienti con indirizzo
      const hasAddresses = validClients.some(c => c.address && c.city);
      if (hasAddresses) {
        toast("📍 Geocodificazione in corso... Le coordinate GPS verranno aggiunte automaticamente", "info");
        setTimeout(() => geocodeImportedClients(), 1000);
      }
    }
  };

  return (
  <>
    <TopBar
      title="Import Clienti"
      onOpenLeft={openLeft}
      onOpenDati={openDati}
      onOpenDocs={openDocs}
      onOpenImpostazioni={openImpostazioni}
      onLogout={logout}
    />
    
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(to bottom right, #f0f9ff, #e0f2fe)",
      paddingTop: 80,
      paddingBottom: 40,
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            📥 Importa Lista Clienti
          </h1>
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            Carica un file CSV o Excel. Tutti i dati sensibili saranno cifrati automaticamente.
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
              Carica un file CSV o Excel. Il sistema cifrerà automaticamente i dati sensibili.
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

            {/* Area upload */}
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
              <div style={{ fontSize: 64, marginBottom: 16 }}>📂</div>
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                Carica file CSV o Excel
              </p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>
                Clicca qui o trascina il file
              </p>
            </div>

            {/* Input nascosto */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              disabled={!!parsingProgress}
            />

            <div style={{ marginTop: 24, padding: 16, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📋 Formati Supportati</h3>
              
              <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                <div>
                  <strong style={{ fontSize: 13, color: "#1e40af" }}>📄 CSV:</strong>
                  <p style={{ fontSize: 12, color: "#1e40af", marginTop: 4 }}>
                    File di testo con valori separati da virgola
                  </p>
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: "#1e40af" }}>📊 Excel (XLSX/XLS):</strong>
                  <p style={{ fontSize: 12, color: "#1e40af", marginTop: 4 }}>
                    Fogli di calcolo Microsoft Excel
                  </p>
                </div>
              </div>

              <p style={{ fontSize: 13, color: "#1e40af", fontFamily: "monospace", background: "white", padding: 8, borderRadius: 4, overflow: "auto" }}>
                Esempio colonne: name, contact_name, city, address, tipo_locale, phone, email, vat_number, notes, latitude, longitude
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
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>🔗 Assegna Campi</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Per ogni colonna riconosciuta, scegli a quale campo corrisponde guardando i dati della prima riga.
            </p>

            {/* Tabella con dropdown sopra ogni colonna */}
            <div style={{ overflow: "auto", marginBottom: 24 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {csvHeaders.map((header, idx) => (
                      <th key={idx} style={{ 
                        padding: 12, 
                        background: "#f9fafb", 
                        borderBottom: "2px solid #e5e7eb",
                        verticalAlign: "top",
                        minWidth: 150
                      }}>
                        <select
                          value={mapping[header] || ""}
                          onChange={(e) => setMapping({ ...mapping, [header]: e.target.value || undefined })}
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: 6,
                            border: "2px solid #2563eb",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#2563eb",
                            cursor: "pointer",
                          }}
                        >
                          <option value="">Scegli dato</option>
                          <option value="name">Nome Cliente *</option>
                          <option value="contact_name">Nome Contatto *</option>
                          <option value="phone">Telefono *</option>
                          <option value="address">Indirizzo *</option>
                          <option value="email">Email</option>
                          <option value="vat_number">P.IVA</option>
                          <option value="city">Città</option>
                          <option value="tipo_locale">Tipo Locale</option>
                          <option value="notes">Note</option>
                        </select>
                        <div style={{ 
                          marginTop: 8, 
                          fontSize: 11, 
                          color: "#9ca3af",
                          fontWeight: "normal"
                        }}>
                          Colonna: {header}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {csvHeaders.map((header, idx) => (
                      <td key={idx} style={{ 
                        padding: "20px 12px", 
                        borderBottom: "2px solid #e5e7eb",
                        background: "#fffbeb",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#111827",
                        textAlign: "center"
                      }}>
                        {rawData[0]?.[header] || "-"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 24, padding: 16, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
              <p style={{ fontSize: 13, color: "#1e40af" }}>
                <strong>💡 Suggerimento:</strong> Guarda i valori nella prima riga per capire a quale campo corrisponde ogni colonna. I campi con * sono obbligatori.
              </p>
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
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>👁️ Anteprima Clienti</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Verifica i dati prima dell'importazione. I clienti con errori non saranno importati.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#15803d" }}>
                  {processedClients.filter(c => c.isValid).length}
                </div>
                <div style={{ fontSize: 12, color: "#15803d" }}>✅ Clienti validi</div>
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
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Telefono</th>
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Indirizzo</th>
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
                      <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>{client.phone || "-"}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>{client.address || "-"}</td>
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
            {/* Geocoding in corso */}
            {geocoding && (
              <div style={{
                padding: 16,
                background: "#EFF6FF",
                border: "1px solid #3B82F6",
                borderRadius: 8,
                marginBottom: 24,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>🔄</span>
                  <strong style={{ color: "#1D4ED8" }}>Geocodificazione in corso...</strong>
                </div>
                <div style={{ color: "#1D4ED8", fontSize: 14 }}>{geocodeProgress}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>
                  ⏱️ ~1 secondo per cliente (rate limit OpenStreetMap)
                </div>
                <button
                  onClick={() => { geocodingAbortRef.current = true; }}
                  style={{
                    marginTop: 12,
                    padding: "6px 16px",
                    fontSize: 13,
                    background: "#FEE2E2",
                    border: "1px solid #EF4444",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "#DC2626",
                  }}
                >
                  ⏹️ Interrompi
                </button>
              </div>
            )}

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
