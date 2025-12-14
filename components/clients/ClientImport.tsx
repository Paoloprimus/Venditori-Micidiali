// components/clients/ClientImport.tsx 
"use client";
import { useState, useRef } from "react";
import { useCrypto } from "@/lib/crypto/CryptoProvider";
import { parse as csvParse } from "csv-parse/browser/esm/sync";
import { useToast } from "@/components/ui/Toast";
import { geocodeAddressWithDelay } from "@/lib/geocoding";
import { supabase } from "@/lib/supabase/client";

const SCOPE = "table:accounts";
const TABLE = "accounts";

type RawRow = {
  name: string;
  contact_name?: string | null;
  city?: string | null;
  street?: string | null;
  type?: string | null;
  email?: string | null;
  phone?: string | null;
  vat_number?: string | null;
  notes?: string | null;
};

export default function ClientImport({ onImported }: { onImported?: () => void }) {
  const { ready, crypto } = useCrypto();
  const [file, setFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState("");
  const toast = useToast();
  const geocodingAbortRef = useRef(false);

  // Mapping headers flessibili (identico al server)
  const HEADER_MAP: Record<string, keyof RawRow> = {
    // Nome cliente / Ragione sociale
    "nome": "name",
    "name": "name",
    "ragione sociale": "name",
    "cliente": "name",
    // Nome contatto
    "contatto": "contact_name",
    "contact_name": "contact_name",
    "contact": "contact_name",
    "referente": "contact_name",
    "nome contatto": "contact_name",
    // Città
    "città": "city",
    "citta": "city",
    "city": "city",
    "comune": "city",
    "località": "city",
    "localita": "city",
    // Indirizzo
    "indirizzo": "street",
    "address": "street",
    "street": "street",
    "via": "street",
    // Tipo locale
    "tipo locale": "type",
    "tipo_locale": "type",
    "type": "type",
    "tipologia": "type",
    "categoria": "type",
    // Email
    "email": "email",
    "e-mail": "email",
    "mail": "email",
    // Telefono
    "telefono": "phone",
    "tel": "phone",
    "phone": "phone",
    "cellulare": "phone",
    // P.IVA / CF
    "p.iva": "vat_number",
    "piva": "vat_number",
    "partita iva": "vat_number",
    "vat": "vat_number",
    "vat_number": "vat_number",
    "cf": "vat_number",
    "codice fiscale": "vat_number",
    // Note
    "note": "notes",
    "notes": "notes",
    "memo": "notes",
  };

  function normalizeHeader(h: string): string {
    return h.toLowerCase().trim().replace(/\s+/g, " ").replace(/[._-]/g, " ");
  }

  function mapHeaders(record: Record<string, any>): RawRow {
    const out: RawRow = { name: "" };
    
    for (const [k, v] of Object.entries(record)) {
      const key = HEADER_MAP[normalizeHeader(k)];
      if (!key) continue;
      
      const val = v == null ? null : String(v).trim();
      if (!val) continue;
      
      switch (key) {
        case "name":
          out.name = val;
          break;
        case "contact_name":
          out.contact_name = val;
          break;
        case "city":
          out.city = val;
          break;
        case "street":
          out.street = val;
          break;
        case "type":
          out.type = val;
          break;
        case "email":
          out.email = val.toLowerCase();
          break;
        case "phone":
          out.phone = val;
          break;
        case "vat_number":
          out.vat_number = val;
          break;
        case "notes":
          out.notes = val;
          break;
      }
    }
    
    return out;
  }

  function cleanRow(r: RawRow): RawRow | null {
    const name = r.name.trim();
    if (!name) return null;
    
    return {
      name,
      contact_name: r.contact_name?.trim() || null,
      city: r.city?.trim() || null,
      street: r.street?.trim() || null,
      type: r.type?.trim() || null,
      email: r.email?.trim() || null,
      phone: r.phone?.trim() || null,
      vat_number: r.vat_number?.trim() || null,
      notes: r.notes?.trim() || null,
    };
  }

  async function parseCSV(text: string): Promise<RawRow[]> {
    const rows = csvParse(text, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    }) as Record<string, any>[];
    
    return rows
      .map(mapHeaders)
      .map(cleanRow)
      .filter((x): x is RawRow => !!x);
  }

  async function handleImport() {
    if (!file) {
      alert("Seleziona un file CSV");
      return;
    }

    if (!ready || !crypto) {
      alert("🔐 Sistema di cifratura non pronto. Sblocca prima la cifratura.");
      return;
    }

    setBusy(true);
    setResult(null);

    try {
      // 1. Leggi e parse CSV nel browser
      const text = await file.text();
      const rows = await parseCSV(text);
      
      if (!rows.length) {
        throw new Error("File vuoto o nessuna riga valida trovata");
      }

      // 2. Cifra ogni riga NEL BROWSER
      const encrypted = [];
      const failed: Array<{ row: RawRow; error: string }> = [];

      for (const row of rows) {
        try {
          const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          
          // Prepara campi da cifrare
          const fieldsToEncrypt: Record<string, any> = { name: row.name };
          if (row.contact_name) fieldsToEncrypt.contact_name = row.contact_name;
          if (row.email) fieldsToEncrypt.email = row.email;
          if (row.phone) fieldsToEncrypt.phone = row.phone;
          if (row.vat_number) fieldsToEncrypt.vat_number = row.vat_number;
          if (row.notes) fieldsToEncrypt.notes = row.notes;

          // Cifra nel browser
          const enc = await crypto.encryptFields(SCOPE, TABLE, id, fieldsToEncrypt);
          
          // Blind index per email (se presente)
          let email_bi: string | undefined;
          if (row.email && typeof crypto.computeBlindIndex === "function") {
            email_bi = await crypto.computeBlindIndex(SCOPE, row.email);
          }

          const encRow: any = {
            id,
            name_enc: String(enc.name_enc),
            name_iv: String(enc.name_iv),
          };

          // Campi cifrati opzionali
          if (enc.contact_name_enc) {
            encRow.contact_name_enc = String(enc.contact_name_enc);
            encRow.contact_name_iv = String(enc.contact_name_iv);
          }

          if (enc.email_enc) {
            encRow.email_enc = String(enc.email_enc);
            encRow.email_iv = String(enc.email_iv);
            if (email_bi) encRow.email_bi = email_bi;
          }
          
          if (enc.phone_enc) {
            encRow.phone_enc = String(enc.phone_enc);
            encRow.phone_iv = String(enc.phone_iv);
          }
          
          if (enc.vat_number_enc) {
            encRow.vat_number_enc = String(enc.vat_number_enc);
            encRow.vat_number_iv = String(enc.vat_number_iv);
          }
          
          if (enc.notes_enc) {
            encRow.notes_enc = String(enc.notes_enc);
            encRow.notes_iv = String(enc.notes_iv);
          }

          // Campi in chiaro (non cifrati)
          if (row.city) encRow.city = row.city;
          if (row.street) encRow.street = row.street;
          if (row.type) encRow.type = row.type;

          encrypted.push(encRow);
        } catch (e: any) {
          failed.push({ row, error: e.message || "Errore cifratura" });
        }
      }

      if (failed.length > 0) {
        console.warn("Righe fallite durante cifratura:", failed);
      }

      // 3. Invia dati GIÀ CIFRATI alla route
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encrypted,
          overwrite,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Errore HTTP ${res.status}`);
      }

      setResult({ ...data, encryptionFailed: failed.length });
      
      if (data.ok) {
        // Toast di conferma import
        toast(`✅ Import completato: ${data.imported} clienti importati`, "success");
        
        // Reset form
        setFile(null);
        
        // Callback per refresh lista clienti
        onImported?.();
        
        // Avvia geocoding in background se ci sono indirizzi
        const hasAddresses = rows.some(r => r.street && r.city);
        if (hasAddresses && data.imported > 0) {
          toast("📍 Geocodificazione in corso... Le coordinate GPS verranno aggiunte automaticamente", "info");
          // Lancia in background (non blocca l'UI)
          setTimeout(() => geocodeImportedClients(), 500);
        }
      } else {
        toast(
          `⚠️ Import parziale: ${data.imported}/${encrypted.length} importati`,
          "error"
        );
      }
    } catch (e: any) {
      alert(`❌ Errore import:\n${e?.message || "Errore sconosciuto"}`);
      console.error("Import error:", e);
    } finally {
      setBusy(false);
    }
  }

  // Geocoding in background per i clienti appena importati
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

  function downloadTemplate() {
    const csv = [
      "nome,contatto,città,indirizzo,tipo_locale,telefono,email,p.iva,note",
      "Bar Centrale,Marco Rossi,Verona,Via Roma 15,Bar,+39 045 8001234,barcentrale@email.it,IT01234567890,Cliente storico",
      "Trattoria da Mario,Mario Bianchi,Milano,Corso Italia 42,Ristorante,+39 02 5551234,mario@trattoria.it,IT11223344556,Preferisce vini rossi",
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_clienti.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 600 }}>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>
        📁 Carica un file CSV con i clienti da importare.
        <br />
        🔐 I dati verranno <strong>cifrati nel tuo browser</strong> prima dell'invio.
      </div>

      {/* Avviso se crypto non pronto */}
      {!ready && (
        <div style={{
          padding: 12,
          background: "#FEF3C7",
          border: "1px solid #F59E0B",
          borderRadius: 6,
          fontSize: 13,
        }}>
          ⚠️ <strong>Sistema di cifratura non sbloccato.</strong>
          <br />
          Sblocca la cifratura prima di importare clienti.
        </div>
      )}

      {/* Upload file */}
      <div>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
          File CSV
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={busy || !ready}
        />
      </div>

      {/* Opzioni */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
        <input
          type="checkbox"
          checked={overwrite}
          onChange={(e) => setOverwrite(e.target.checked)}
          disabled={busy || !ready}
        />
        <span>Sovrascrivi clienti esistenti (basato su email)</span>
      </label>

      {/* Azioni */}
      <div style={{ display: "flex", gap: 8 }}>
        <button 
          className="btn" 
          onClick={handleImport} 
          disabled={busy || !file || !ready}
        >
          {busy ? "⏳ Cifratura e import..." : "🔐 Cifra e Importa"}
        </button>
        <button className="btn" onClick={downloadTemplate} disabled={busy}>
          📥 Scarica template
        </button>
      </div>

      {/* Info */}
      <div style={{ fontSize: 12, color: "#6B7280" }}>
        <strong>Formato CSV:</strong> nome (obbligatorio), contatto, città, indirizzo, tipo_locale, telefono, email, p.iva, note
        <br />
        <strong>Sicurezza:</strong> Dati sensibili cifrati end-to-end nel browser (nome, contatto, email, telefono, p.iva, note).
      </div>

      {/* Geocoding in corso */}
      {geocoding && (
        <div
          style={{
            padding: 12,
            background: "#EFF6FF",
            border: "1px solid #3B82F6",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ animation: "spin 1s linear infinite" }}>🔄</span>
            <strong>Geocodificazione in corso...</strong>
          </div>
          <div style={{ color: "#1D4ED8" }}>{geocodeProgress}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>
            ⏱️ ~1 secondo per cliente (rate limit OpenStreetMap)
          </div>
          <button
            onClick={() => { geocodingAbortRef.current = true; }}
            style={{
              marginTop: 8,
              padding: "4px 12px",
              fontSize: 12,
              background: "#FEE2E2",
              border: "1px solid #EF4444",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            ⏹️ Interrompi
          </button>
        </div>
      )}

      {/* Risultato */}
      {result && !geocoding && (
        <div
          style={{
            padding: 12,
            background: result.ok ? "#D1FAE5" : "#FEE2E2",
            border: `1px solid ${result.ok ? "#10B981" : "#EF4444"}`,
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {result.ok ? "✅ Import completato" : "⚠️ Import parziale"}
          </div>
          <div>Importati: {result.imported}</div>
          <div>Falliti DB: {result.failed}</div>
          {result.encryptionFailed > 0 && (
            <div>Falliti cifratura: {result.encryptionFailed}</div>
          )}
          {result.duplicatesDropped > 0 && (
            <div>Duplicati scartati: {result.duplicatesDropped}</div>
          )}
        </div>
      )}
    </div>
  );
}
