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
 * - PDF: Estrazione testo con pdfjs-dist (browser-compatible)
 * - Foto (JPG, JPEG, PNG, HEIC): OCR con Tesseract.js + Column Detection
 * - Scatta foto: Accesso diretto alla fotocamera del dispositivo
 * 
 * FUNZIONALITÀ:
 * - Upload universale con drag & drop
 * - Scatta foto diretta dalla fotocamera
 * - Riconoscimento automatico formato da estensione
 * - OCR migliorato con preprocessing immagine e column detection
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
 * - pdfjs-dist (per PDF, browser-compatible)
 * - tesseract.js (per OCR foto con TSV output)
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
  const cameraInputRef = useRef<HTMLInputElement>(null); // NUOVO: per la fotocamera
  
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

      reader.onerror = () => reject(new Error("Errore lettura file"));
      reader.readAsText(file);
    });
  }

  // Parser XLSX/XLS
  async function parseXLSX(file: File): Promise<{ headers: string[]; data: any[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          if (jsonData.length === 0) {
            reject(new Error("Il file Excel è vuoto!"));
            return;
          }

          const headers = Object.keys(jsonData[0] as any);
          resolve({ headers, data: jsonData as any[] });
        } catch (error: any) {
          reject(new Error(`Errore parsing Excel: ${error.message}`));
        }
      };

      reader.onerror = () => reject(new Error("Errore lettura file"));
      reader.readAsArrayBuffer(file);
    });
  }

  // Parser PDF (con pdfjs-dist per browser)
  async function parsePDF(file: File): Promise<{ headers: string[]; data: any[] }> {
    return new Promise(async (resolve, reject) => {
      try {
        setParsingProgress("Caricamento PDF...");
        
        // Import dinamico di pdfjs-dist (compatibile browser)
        const pdfjsLib = await import("pdfjs-dist");
        
        // Configurazione worker da CDN
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        // Leggi il file come ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        setParsingProgress("Estrazione testo...");
        
        // Carica il PDF
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = "";
        
        // Estrai testo da tutte le pagine
        for (let i = 1; i <= pdf.numPages; i++) {
          setParsingProgress(`Pagina ${i}/${pdf.numPages}...`);
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n";
        }

        setParsingProgress("Analisi dati...");

        // Parsing intelligente: cerca pattern di tabelle
        const lines = fullText.split("\n").filter(l => l.trim().length > 0);
        
        if (lines.length < 2) {
          reject(new Error("Il PDF non contiene dati tabulari riconoscibili"));
          return;
        }

        // Prima riga = headers
        const headerLine = lines[0];
        const headers = headerLine.split(/\s{2,}|\t/).map(h => h.trim()).filter(h => h.length > 0);

        if (headers.length === 0) {
          reject(new Error("Impossibile identificare le colonne nel PDF"));
          return;
        }

        // Resto = dati
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

  // ==================== OCR MIGLIORATO CON COLUMN DETECTION ====================
  // Parser Immagini con OCR avanzato + Column Detection
  async function parseImage(file: File): Promise<{ headers: string[]; data: any[] }> {
    return new Promise(async (resolve, reject) => {
      try {
        setParsingProgress("Inizializzazione OCR...");
        
        // ========== STEP 1: PREPROCESSING IMMAGINE ==========
        setParsingProgress("Ottimizzazione immagine...");
        
        const preprocessedImage = await preprocessImage(file);
        
        // ========== STEP 2: OCR CON COORDINATE TSV ==========
        setParsingProgress("Lettura testo con OCR...");
        
        const worker = await createWorker("ita");
        
        // Configurazione Tesseract per output TSV (include coordinate XY)
        await worker.setParameters({
          tessedit_create_tsv: "1",
        });
        
        // Esegui OCR ottenendo sia testo che coordinate
        const { data: { text, tsv } } = await worker.recognize(preprocessedImage);
        
        await worker.terminate();
        
        setParsingProgress("Analisi struttura tabella...");
        
        // ========== STEP 3: PARSING TSV PER COORDINATE ==========
        if (!tsv) {
          reject(new Error("OCR non ha prodotto coordinate utilizzabili"));
          return;
        }
        const words = parseTSV(tsv);
        
        if (words.length === 0) {
          reject(new Error("Nessun testo riconosciuto nell'immagine"));
          return;
        }
        
        // ========== STEP 4: COLUMN DETECTION ==========
        const { headers, rows } = detectColumnsFromWords(words);
        
        if (headers.length === 0) {
          reject(new Error("Impossibile identificare le colonne nell'immagine"));
          return;
        }
        
        if (rows.length === 0) {
          reject(new Error("Nessun dato trovato nell'immagine"));
          return;
        }
        
        // ========== STEP 5: COSTRUZIONE TABELLA ==========
        setParsingProgress("Costruzione tabella...");
        
        const data = rows.map(row => {
          const obj: any = {};
          headers.forEach((header, idx) => {
            obj[header] = row[idx] || "";
          });
          return obj;
        });
        
        setParsingProgress(null);
        resolve({ headers, data });
        
      } catch (error: any) {
        setParsingProgress(null);
        reject(new Error(`Errore OCR: ${error.message}`));
      }
    });
  }

  // Preprocessing immagine (migliora qualità per OCR)
  async function preprocessImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      
      img.onload = () => {
        // Crea canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        
        // Ridimensiona se troppo grande (max 2000px)
        const maxSize = 2000;
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Disegna immagine
        ctx.drawImage(img, 0, 0, width, height);
        
        // Ottimizzazioni per OCR
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // 1. Conversione scala di grigi + aumento contrasto
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          
          // Aumento contrasto (±30)
          let adjusted = ((gray - 128) * 1.3) + 128;
          adjusted = Math.max(0, Math.min(255, adjusted));
          
          // Binarizzazione (soglia 140)
          const binary = adjusted > 140 ? 255 : 0;
          
          data[i] = data[i + 1] = data[i + 2] = binary;
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Converti in Blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Errore preprocessing immagine"));
          }
        }, "image/png");
      };
      
      img.onerror = () => reject(new Error("Errore caricamento immagine"));
      reader.onerror = () => reject(new Error("Errore lettura file"));
      reader.readAsDataURL(file);
    });
  }

  // Parsing TSV output di Tesseract (coordinate XY)
  function parseTSV(tsv: string): Array<{ text: string; x: number; y: number; width: number; height: number }> {
    const lines = tsv.split("\n");
    const words: Array<{ text: string; x: number; y: number; width: number; height: number }> = [];
    
    // Salta header TSV
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split("\t");
      
      if (cols.length < 12) continue;
      
      const level = parseInt(cols[0]);
      const text = cols[11]?.trim();
      const left = parseInt(cols[6]);
      const top = parseInt(cols[7]);
      const width = parseInt(cols[8]);
      const height = parseInt(cols[9]);
      
      // Considera solo parole (level 5) con testo
      if (level === 5 && text && text.length > 0) {
        words.push({
          text,
          x: left,
          y: top,
          width,
          height,
        });
      }
    }
    
    return words;
  }

  // Column Detection Algorithm
  function detectColumnsFromWords(words: Array<{ text: string; x: number; y: number; width: number; height: number }>): { headers: string[]; rows: string[][] } {
    if (words.length === 0) return { headers: [], rows: [] };
    
    // ========== STEP 1: RAGGRUPPA PAROLE PER RIGHE (Y simile) ==========
    const rowTolerance = 15; // pixel di tolleranza Y
    const rows: Array<Array<{ text: string; x: number; y: number; width: number; height: number }>> = [];
    
    // Ordina per Y crescente
    const sortedWords = [...words].sort((a, b) => a.y - b.y);
    
    let currentRow: Array<{ text: string; x: number; y: number; width: number; height: number }> = [];
    let currentY = sortedWords[0].y;
    
    for (const word of sortedWords) {
      if (Math.abs(word.y - currentY) <= rowTolerance) {
        // Stessa riga
        currentRow.push(word);
      } else {
        // Nuova riga
        if (currentRow.length > 0) {
          rows.push(currentRow.sort((a, b) => a.x - b.x)); // ordina per X
        }
        currentRow = [word];
        currentY = word.y;
      }
    }
    if (currentRow.length > 0) {
      rows.push(currentRow.sort((a, b) => a.x - b.x));
    }
    
    if (rows.length < 2) {
      // Serve almeno header + 1 riga dati
      return { headers: [], rows: [] };
    }
    
    // ========== STEP 2: IDENTIFICA COLONNE DALLA PRIMA RIGA (HEADER) ==========
    const headerRow = rows[0];
    const columnRanges: Array<{ start: number; end: number }> = [];
    
    const columnTolerance = 50; // pixel di tolleranza X per identificare colonna
    
    for (const word of headerRow) {
      const centerX = word.x + word.width / 2;
      columnRanges.push({
        start: centerX - columnTolerance,
        end: centerX + columnTolerance,
      });
    }
    
    // Headers
    const headers = headerRow.map(w => w.text);
    
    // ========== STEP 3: ASSEGNA PAROLE ALLE COLONNE PER OGNI RIGA ==========
    const dataRows: string[][] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowData: string[] = new Array(headers.length).fill("");
      
      for (const word of row) {
        const wordCenterX = word.x + word.width / 2;
        
        // Trova colonna più vicina
        let bestCol = 0;
        let bestDist = Math.abs(wordCenterX - (columnRanges[0].start + columnRanges[0].end) / 2);
        
        for (let col = 1; col < columnRanges.length; col++) {
          const colCenterX = (columnRanges[col].start + columnRanges[col].end) / 2;
          const dist = Math.abs(wordCenterX - colCenterX);
          
          if (dist < bestDist) {
            bestDist = dist;
            bestCol = col;
          }
        }
        
        // Aggiungi parola alla colonna (gestisce celle multi-parola)
        if (rowData[bestCol]) {
          rowData[bestCol] += " " + word.text;
        } else {
          rowData[bestCol] = word.text;
        }
      }
      
      dataRows.push(rowData);
    }
    
    return { headers, rows: dataRows };
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

    return {
      ...client,
      rowIndex: rowIndex + 1,
      isValid: errors.length === 0,
      errors,
    };
  };

  // Preview dopo mapping
  const handlePreview = () => {
    const validated = rawData.map((row, idx) => validateClient(row, idx));
    setProcessedClients(validated);
    setStep("preview");
  };

  // Import finale
  const handleImport = async () => {
    setStep("importing");
    setImportProgress(0);
    
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
        // Cifra campi sensibili
        const encryptedClient: any = {};
        
        for (const [key, value] of Object.entries(client)) {
          if (key === "rowIndex" || key === "isValid" || key === "errors" || !value) continue;
          
          // Cifra solo campi sensibili
          if (["name", "contact_name", "phone", "email", "address", "vat_number", "notes"].includes(key)) {
            const encrypted = await cryptoSvc.encrypt(String(value), "table:accounts");
            encryptedClient[key] = encrypted.ciphertext;
          } else {
            encryptedClient[key] = value;
          }
        }

        // Invia al server
        const response = await fetch("/api/clients/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(encryptedClient),
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
  };

  return (
  <>
    <TopBar
      leftOpen={leftOpen}
      rightOpen={rightOpen}
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
            Carica un file o scatta una foto della lista clienti. Tutti i dati sensibili saranno cifrati automaticamente.
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
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>📁 Seleziona File o Scatta Foto</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Carica un file o scatta una foto della lista clienti. Supportiamo CSV, Excel, PDF e foto. Il sistema cifrerà automaticamente i dati sensibili.
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

            {/* DUE BOTTONI AFFIANCATI: Carica File + Scatta Foto */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {/* BOTTONE 1: Carica File */}
              <div
                onClick={() => !parsingProgress && fileInputRef.current?.click()}
                style={{
                  border: "2px dashed #d1d5db",
                  borderRadius: 12,
                  padding: 32,
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
                <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
                <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                  Carica file
                </p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  CSV, Excel, PDF, Foto
                </p>
              </div>

              {/* BOTTONE 2: Scatta Foto */}
              <div
                onClick={() => !parsingProgress && cameraInputRef.current?.click()}
                style={{
                  border: "2px dashed #10b981",
                  borderRadius: 12,
                  padding: 32,
                  textAlign: "center",
                  cursor: parsingProgress ? "wait" : "pointer",
                  background: "#f0fdf4",
                  transition: "all 0.2s",
                  opacity: parsingProgress ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!parsingProgress) {
                    e.currentTarget.style.background = "#dcfce7";
                    e.currentTarget.style.borderColor = "#059669";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!parsingProgress) {
                    e.currentTarget.style.background = "#f0fdf4";
                    e.currentTarget.style.borderColor = "#10b981";
                  }
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                  Scatta foto
                </p>
                <p style={{ fontSize: 12, color: "#059669" }}>
                  Apri fotocamera
                </p>
              </div>
            </div>

            {/* Input nascosto per file dalla galleria */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.heic"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              disabled={!!parsingProgress}
            />

            {/* Input nascosto per fotocamera (capture="environment" apre fotocamera posteriore) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              disabled={!!parsingProgress}
            />

            <div style={{ marginTop: 24, padding: 16, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
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
                    Foto di liste stampate con OCR avanzato (riconoscimento colonne automatico)
                  </p>
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: "#059669" }}>📱 Scatta Foto:</strong>
                  <p style={{ fontSize: 12, color: "#059669", marginTop: 4 }}>
                    Accedi direttamente alla fotocamera per scattare foto della lista al momento (più veloce!)
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
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>🔗 Mapping Colonne</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Verifica o modifica l'associazione tra le colonne del file e i campi dell'applicazione.
              Il sistema ha già provato a rilevare automaticamente le colonne.
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              {Object.entries({
                name: "Nome Cliente *",
                contact_name: "Nome Contatto *",
                city: "Città *",
                address: "Indirizzo",
                tipo_locale: "Tipo Locale",
                phone: "Telefono",
                email: "Email",
                vat_number: "P.IVA",
                notes: "Note",
              }).map(([field, label]) => (
                <div key={field}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    {label}
                  </label>
                  <select
                    value={mapping[field as keyof ColumnMapping] || ""}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || undefined })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      fontSize: 14,
                    }}
                  >
                    <option value="">-- Non mappare --</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, padding: 16, background: "#fef3c7", borderRadius: 8, border: "1px solid #fbbf24" }}>
              <p style={{ fontSize: 13, color: "#92400e" }}>
                <strong>Nota:</strong> I campi contrassegnati con * sono obbligatori. Assicurati che siano mappati correttamente.
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
                <div style={{ fontSize: 12, color: "#15803d" }}>✅ Pronti per import</div>
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
