// app/clients/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useCrypto } from "@/lib/crypto/CryptoProvider";
import { useDrawers, DrawersWithBackdrop } from '@/components/Drawers';
import TopBar from "@/components/home/TopBar";

// Opzioni per tipo locale
const TIPO_LOCALE = [
  'Bar',
  'Ristorante',
  'Pizzeria',
  'Ristorante/Pizzeria',
  'Trattoria',
  'Chiosco',
  'Pub',
  'Pasticceria',
  'Gelateria',
  'Hotel',
  'Altro'
];

// helper: prendi sempre la decryptFields "viva" da window.debugCrypto
function getDbg(): any | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).debugCrypto ?? null;
}

// Tipi
type RawAccount = {
  id: string;
  created_at: string;

  // encrypted (opzionali)
  name_enc?: any; name_iv?: any;
  contact_name_enc?: any; contact_name_iv?: any;
  city?: string; 
  tipo_locale?: string;
  email_enc?: any; email_iv?: any;
  phone_enc?: any; phone_iv?: any;
  vat_number_enc?: any; vat_number_iv?: any;
  address_enc?: any; address_iv?: any;
  
  // plain text
  notes?: string;
  
  // custom (plain text per LLM)
  custom?: any;
};

type PlainAccount = {
  id: string;
  created_at: string;
  name: string;
  contact_name: string;
  city: string;
  tipo_locale: string;
  email: string;
  phone: string;
  vat_number: string;
  notes: string;
};

type SortKey = "name" | "contact_name" | "city" | "tipo_locale" | "email" | "phone" | "vat_number" | "created_at";

const DEFAULT_SCOPES = [
  "table:accounts", "table:contacts", "table:products",
  "table:profiles", "table:notes", "table:conversations",
  "table:messages", "table:proposals",
];

export default function ClientsPage(): JSX.Element {
  const { crypto, ready, unlock, prewarm } = useCrypto();
  
  // Drawer
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  const actuallyReady = ready || !!(crypto as any)?.isUnlocked?.();

useEffect(() => {
  // Spegni checking quando:
  // 1. Crypto è ready E unlocked
  // 2. OPPURE passato abbastanza tempo senza unlock in corso
  if (actuallyReady) {
    setChecking(false);
  } else {
    const timer = setTimeout(() => {
      if (!unlockingRef.current) {
        setChecking(false);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }
}, [actuallyReady]);
  
  
  // ready "reale": se il provider non ha aggiornato lo stato ma il servizio è sbloccato, considera pronto
  const [rows, setRows] = useState<PlainAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [q, setQ] = useState<string>("");

  // 🆕 Funzione per gestire click su header ordinabili
function handleSortClick(key: SortKey) {
  if (sortBy === key) {
    // Stessa colonna → inverti direzione
    setSortDir(sortDir === "asc" ? "desc" : "asc");
  } else {
    // Colonna nuova → imposta quella colonna e DESC
    setSortBy(key);
    setSortDir("desc");
  }
}

  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  const [diag, setDiag] = useState({ auth: "", ready: false, passInStorage: false, unlockAttempts: 0, loaded: 0 });
  const unlockingRef = useRef(false);

  const [pass, setPass] = useState("");

  const [checking, setChecking] = useState(true);

  // 🆕 STATO PER EDITING INLINE
  const [editingCell, setEditingCell] = useState<{rowId: string, field: string} | null>(null);
  const [tempValue, setTempValue] = useState("");

// Logout
async function logout() {
  // Pulisci la passphrase
  try { sessionStorage.removeItem("repping:pph"); } catch {}
  try { localStorage.removeItem("repping:pph"); } catch {}
  
  await supabase.auth.signOut();
  window.location.href = "/login";
}

  // 🔐 (disattivato) Auto-unlock locale in /clients: lasciamo che ci pensi il CryptoProvider
  useEffect(() => {
    if (!authChecked) return;

    const pass =
      typeof window !== "undefined"
        ? (sessionStorage.getItem("repping:pph") || localStorage.getItem("repping:pph") || "")
        : "";

    setDiag((d) => ({ ...d, passInStorage: !!pass }));
    // Non facciamo nulla qui. Niente unlock/prewarm: evita doppie aperture e OperationError.
  }, [authChecked]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;
      if (error) {
        setUserId(null);
        setDiag((d) => ({ ...d, auth: `getUser error: ${error.message}` }));
      } else {
        const uid = data.user?.id ?? null;
        setUserId(uid);
        setDiag((d) => ({ ...d, auth: uid ? "ok" : "null" }));
      }
      setAuthChecked(true);
    })();
    return () => { alive = false; };
  }, []);

// 🔐 Auto-unlock FORZATO: sblocca e carica dati
useEffect(() => {
  if (!authChecked || !crypto) return;
  
  console.log('[/clients] 🔍 Check unlock status:', {
    isUnlocked: crypto.isUnlocked?.(),
    unlockingInProgress: unlockingRef.current,
  });
  
  // Se già unlocked, skip
  if (typeof crypto.isUnlocked === 'function' && crypto.isUnlocked()) {
    console.log('[/clients] ✅ Crypto già unlocked');
    return;
  }
  
  // Se già sta unlockando, skip
  if (unlockingRef.current) {
    console.log('[/clients] ⏳ Unlock già in corso');
    return;
  }

  // Prova a leggere la passphrase
  const pass = 
    typeof window !== 'undefined'
      ? (sessionStorage.getItem('repping:pph') || localStorage.getItem('repping:pph') || '')
      : '';

  console.log('[/clients] 🔑 Passphrase trovata:', !!pass);
  
  if (!pass) {
    console.log('[/clients] ❌ Nessuna passphrase in storage');
    return;
  }

  // FORZA unlock + caricamento dati
  (async () => {
    try {
      unlockingRef.current = true;
      setDiag((d) => ({ ...d, passInStorage: true, unlockAttempts: (d.unlockAttempts ?? 0) + 1 }));
      
      console.log('[/clients] 🔓 Avvio unlock...');
      await unlock(pass);
      console.log('[/clients] ✅ Unlock completato!');
      
      console.log('[/clients] 🔧 Avvio prewarm...');
      await prewarm(DEFAULT_SCOPES);
      console.log('[/clients] ✅ Prewarm completato!');
      
      // 🚀 FORZA caricamento dati dopo unlock
      console.log('[/clients] 📊 Carico i dati...');
      await loadClients();
      console.log('[/clients] ✅ Dati caricati!');
      
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      console.error('[/clients] ❌ Unlock fallito:', msg);
      
      // Se fallisce, pulisci passphrase invalida
      if (!/OperationError/i.test(msg)) {
        sessionStorage.removeItem('repping:pph');
        localStorage.removeItem('repping:pph');
      }
    } finally {
      unlockingRef.current = false;
    }
  })();
}, [authChecked, crypto, unlock, prewarm]);

  async function loadClients(): Promise<void> {
    if (!crypto || !userId) return;
    setLoading(true);

const { data, error } = await supabase
  .from("accounts")
  .select(
    "id,created_at," +
    "name_enc,name_iv," +
    "contact_name_enc,contact_name_iv," +
    "city," + 
    "tipo_locale," +
    "email_enc,email_iv," +
    "phone_enc,phone_iv," +
    "vat_number_enc,vat_number_iv," +
    "address_enc,address_iv," +
    "notes," +
    "custom"
  )
  .order("created_at", { ascending: false });

    if (error) {
      console.error("[/clients] load error:", error);
      setLoading(false);
      return;
    }

    // ✅ Forza creazione scope keys PRIMA di decifrare
    try {
      console.log('[/clients] 🔧 Creo scope keys prima di decifrare...');
      await (crypto as any).getOrCreateScopeKeys('table:accounts');
      console.log('[/clients] ✅ Scope keys creati');
    } catch (e) {
      console.error('[/clients] ❌ Errore creazione scope keys:', e);
    }

    // DEBUG logs (opzionali, puoi rimuoverli dopo il test)
    if (data && data.length > 0) {
      const firstRecord = data[0] as any;
      console.log('🔍 [DEBUG] Primo record RAW:', firstRecord.name_enc?.substring(0, 20) + '...');
    }
      
    const rowsAny = (data ?? []) as any[];
    const plain: PlainAccount[] = [];

    for (const r0 of rowsAny) {
      const r = r0 as RawAccount;
      try {
        const hasEncrypted =
        !!(r.name_enc || r.email_enc || r.phone_enc || r.vat_number_enc || r.address_enc);

        // 🔧 FIX: Converti hex-string in base64 (ORIGINALE - NON MODIFICATO!)
        const hexToBase64 = (hexStr: any): string => {
          if (!hexStr || typeof hexStr !== 'string') return '';
          if (!hexStr.startsWith('\\x')) return hexStr;
          
          const hex = hexStr.slice(2);
          const bytes = hex.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
          return bytes;
        };
        
const recordForDecrypt = {
  ...r,
  name_enc: hexToBase64(r.name_enc),
  name_iv: hexToBase64(r.name_iv),
  contact_name_enc: hexToBase64(r.contact_name_enc),
  contact_name_iv: hexToBase64(r.contact_name_iv),
  email_enc: hexToBase64(r.email_enc),
  email_iv: hexToBase64(r.email_iv),
  phone_enc: hexToBase64(r.phone_enc),
  phone_iv: hexToBase64(r.phone_iv),
  vat_number_enc: hexToBase64(r.vat_number_enc),
  vat_number_iv: hexToBase64(r.vat_number_iv),
  address_enc: hexToBase64(r.address_enc),
  address_iv: hexToBase64(r.address_iv),
};

        if (typeof (crypto as any)?.decryptFields !== "function") {
          throw new Error("decryptFields non disponibile");
        }
        
        const toObj = (x: any): Record<string, unknown> =>
          Array.isArray(x)
            ? x.reduce((acc: Record<string, unknown>, it: any) => {
                if (it && typeof it === "object" && "name" in it) acc[it.name] = it.value ?? "";
                return acc;
              }, {})
            : ((x ?? {}) as Record<string, unknown>);

// ✅✅✅ FIX: Usa l'ID del record come Associated Data (firma)
const decAny = await (crypto as any).decryptFields(
  "table:accounts", 
  "accounts", 
  r.id, // <--- PUNTO CRITICO: Usa r.id invece di ''
  recordForDecrypt,
  ["name", "contact_name", "email", "phone", "vat_number", "address"]
);

        const dec = toObj(decAny);

        // ✅ Estrai note dal campo separato (in chiaro!)
        const notes = r.notes || "";
        const city = r.city || "";
        const tipoLocale = r.tipo_locale || "";

plain.push({
  id: r.id,
  created_at: r.created_at,
  name: String(dec.name ?? ""),
  contact_name: String(dec.contact_name ?? ""),
  city: String(city),  // <-- CAMBIA DA: String(dec.city ?? "")
  tipo_locale: String(tipoLocale),
  email: String(dec.email ?? ""),
  phone: String(dec.phone ?? ""),
  vat_number: String(dec.vat_number ?? ""),
  notes: String(notes),
});
        
      } catch (e) {
        console.warn("[/clients] decrypt error for", r.id, e);
plain.push({
  id: r.id,
  created_at: r.created_at,
  name: "", 
  contact_name: "", 
  city: "",
  tipo_locale: "",
  email: "", 
  phone: "", 
  vat_number: "", 
  notes: "",
});
      }
    }

    setRows(plain);
    setLoading(false);
    setDiag((d) => ({ ...d, loaded: plain.length }));
  }

  // carica dati appena la cifratura è sbloccata e c'è l'utente
useEffect(() => {
  if (actuallyReady) {
    // Appena ready, spegni subito checking
    setChecking(false);
  } else {
    // Controlla se c'è password in storage
    const hasPass = !!(sessionStorage.getItem('repping:pph') || localStorage.getItem('repping:pph'));
    
    // Se c'è password, aspetta 5 secondi (auto-unlock in corso)
    // Se non c'è, aspetta solo 1 secondo
    const delay = hasPass ? 5000 : 1000;
    
    const timer = setTimeout(() => {
      setChecking(false);
    }, delay);
    
    return () => clearTimeout(timer);
  }
}, [actuallyReady]);

  const view: PlainAccount[] = useMemo(() => {
    const norm = (s: string) => (s || "").toLocaleLowerCase();
    let arr = [...rows];
    if (q.trim()) {
      const qq = norm(q);
arr = arr.filter((r) =>
  norm(r.name).includes(qq) ||
  norm(r.contact_name).includes(qq) ||
  norm(r.city).includes(qq) ||
  norm(r.tipo_locale).includes(qq) ||
  norm(r.city).includes(qq) ||
  norm(r.email).includes(qq) ||
  norm(r.phone).includes(qq) ||
  norm(r.vat_number).includes(qq) ||
  norm(r.notes).includes(qq)
);
    }
    arr.sort((a, b) => {
      let va: string | number = a[sortBy] ?? "";
      let vb: string | number = b[sortBy] ?? "";
      if (sortBy === "created_at") {
        va = new Date(a.created_at).getTime();
        vb = new Date(b.created_at).getTime();
      }
      return sortDir === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (vb < va ? -1 : vb > va ? 1 : 0);
    });
    return arr;
  }, [rows, q, sortBy, sortDir]);

  // 🆕 UPDATE CAMPO CIFRATO
  async function updateField(clientId: string, fieldName: string, newValue: string) {
    if (!crypto || !userId) return;
    
    try {
      // Cifra il nuovo valore
      const fieldsToEncrypt: Record<string, string> = {};
      fieldsToEncrypt[fieldName] = newValue;
      
      const encrypted = await (crypto as any).encryptFields(
        "table:accounts",
        "accounts",
        clientId,
        fieldsToEncrypt
      );
      
      // Update su Supabase
      const { error } = await supabase
        .from("accounts")
        .update(encrypted)
        .eq("id", clientId);
      
      if (error) throw error;
      
      // Aggiorna la lista locale
      setRows(prev => prev.map(r => 
        r.id === clientId 
          ? { ...r, [fieldName]: newValue }
          : r
      ));
      
      console.log(`✅ Campo ${fieldName} aggiornato per cliente ${clientId}`);
    } catch (e) {
      console.error(`❌ Errore update ${fieldName}:`, e);
      alert(`Errore durante il salvataggio: ${e}`);
    }
  }

  // 🆕 UPDATE NOTES (custom field, non cifrato)
  async function updateNotes(clientId: string, newNotes: string) {
    if (!userId) return;
    
    try {
      // Recupera custom esistente
      const { data: acc } = await supabase
        .from("accounts")
        .select("custom")
        .eq("id", clientId)
        .single();
      
      const currentCustom = acc?.custom || {};
      const newCustom = { ...currentCustom, notes: newNotes };
      
      // Update
      const { error } = await supabase
        .from("accounts")
        .update({ custom: newCustom })
        .eq("id", clientId);
      
      if (error) throw error;
      
      // Aggiorna la lista locale
      setRows(prev => prev.map(r => 
        r.id === clientId 
          ? { ...r, notes: newNotes }
          : r
      ));
      
      console.log(`✅ Note aggiornate per cliente ${clientId}`);
    } catch (e) {
      console.error("❌ Errore update notes:", e);
      alert(`Errore durante il salvataggio: ${e}`);
    }
  }

// 🆕 UPDATE CITY (campo in chiaro)
async function updateCity(clientId: string, newCity: string) {
  if (!userId) return;
  
  try {
    // Update diretto (non cifrato)
    const { error } = await supabase
      .from("accounts")
      .update({ city: newCity })
      .eq("id", clientId);
    
    if (error) throw error;
    
    // Aggiorna la lista locale
    setRows(prev => prev.map(r => 
      r.id === clientId 
        ? { ...r, city: newCity }
        : r
    ));
    
    console.log(`✅ Città aggiornata per cliente ${clientId}`);
  } catch (e) {
    console.error("❌ Errore update city:", e);
    alert(`Errore durante il salvataggio: ${e}`);
  }
}

// 🆕 UPDATE TIPO_LOCALE (campo in chiaro)
async function updateTipoLocale(clientId: string, newTipoLocale: string) {
  if (!userId) return;
  
  try {
    // Update diretto (non cifrato)
    const { error } = await supabase
      .from("accounts")
      .update({ tipo_locale: newTipoLocale })
      .eq("id", clientId);
    
    if (error) throw error;
    
    // Aggiorna la lista locale
    setRows(prev => prev.map(r => 
      r.id === clientId 
        ? { ...r, tipo_locale: newTipoLocale }
        : r
    ));
    
    console.log(`✅ Tipo locale aggiornato per cliente ${clientId}`);
  } catch (e) {
    console.error("❌ Errore update tipo_locale:", e);
    alert(`Errore durante il salvataggio: ${e}`);
  }
}
  
  // 🆕 DELETE CLIENTE
  async function deleteClient(clientId: string) {
    if (!userId) return;
    
    if (!confirm("Eliminare definitivamente questo cliente?")) return;
    
    try {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", clientId);
      
      if (error) throw error;
      
      // Rimuovi dalla lista locale
      setRows(prev => prev.filter(r => r.id !== clientId));
      
      console.log(`✅ Cliente ${clientId} eliminato`);
    } catch (e) {
      console.error("❌ Errore delete:", e);
      alert(`Errore durante l'eliminazione: ${e}`);
    }
  }

  // 🆕 GESTIONE EDITING
  function startEditing(rowId: string, field: string, currentValue: string) {
    setEditingCell({ rowId, field });
    setTempValue(currentValue);
  }

  function cancelEditing() {
    setEditingCell(null);
    setTempValue("");
  }

async function saveEditing() {
  if (!editingCell) return;
  
  const { rowId, field } = editingCell;
  
  // Gestione campi non cifrati
  if (field === "notes") {
    await updateNotes(rowId, tempValue);
  } else if (field === "city") {  // <-- AGGIUNGI QUESTO ELSE IF
    await updateCity(rowId, tempValue);
  } else if (field === "tipo_locale") {
    await updateTipoLocale(rowId, tempValue);
  } else {
    await updateField(rowId, field, tempValue);
  }
  
  cancelEditing();
}

  if (!authChecked) {
    return <div className="p-6 text-gray-600">Verifico sessione…</div>;
  }

  if (!userId) {
    return (
      <div className="p-6">
        <div className="mb-2 font-semibold">Sessione non attiva</div>
        <p className="text-sm text-gray-600">
          Effettua di nuovo l'accesso per vedere i tuoi clienti.
        </p>
        <button className="px-3 py-2 rounded border mt-3" onClick={() => window.location.href = "/login"}>
          Vai al login
        </button>
      </div>
    );
  }

  if (!actuallyReady || !crypto) {
    return (
      <div className="p-6 max-w-md space-y-3">
        <h2 className="text-lg font-semibold">🔐 Sblocca i dati cifrati</h2>
        <p className="text-sm text-gray-600">
          Inserisci la tua passphrase per sbloccare la cifratura client-side (valida per questa sessione).
        </p>
        <input
          type="password"
          className="border rounded p-2 w-full"
          placeholder="Passphrase"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <button
          className="px-3 py-2 rounded border"
          onClick={async () => {
            try {
              await unlock(pass);
              await prewarm([
                "table:accounts","table:contacts","table:products","table:profiles",
                "table:notes","table:conversations","table:messages","table:proposals",
              ]);
              await loadClients();
              setPass("");
            } catch (e) {
              console.error("[/clients] unlock failed:", e);
              alert("Passphrase non valida o sblocco fallito.");
            }
          }}
        >
          Sblocca
        </button>
        <div className="text-xs text-gray-500">
          auth:{diag.auth} · ready:{String(ready)} · loaded:{diag.loaded}
        </div>
      </div>
    );
  }

return (
    <>
      {/* TopBar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <TopBar
          title="Clienti"
          onOpenLeft={openLeft}
          onOpenDati={openDati}
          onOpenDocs={openDocs}
          onOpenImpostazioni={openImpostazioni}
          onLogout={logout}
        />
      </div>

      {checking ? (
        <div className="p-6 max-w-6xl mx-auto space-y-4">
          <div style={{ height: 70 }} />
          <div style={{ textAlign: 'center', marginTop: 100, fontSize: 18, color: '#6b7280' }}>
            ⏳ Caricamento clienti...
          </div>
        </div>
      ) : (
        <div className="p-6 max-w-6xl mx-auto space-y-4">
          {/* Spacer per TopBar */}
          <div style={{ height: 70 }} />

          <div className="flex gap-2 items-center">
            <input
              className="border rounded p-2 flex-1"
              placeholder="Cerca (nome, contatto, città, tipo locale, email, telefono, P. IVA, note)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="px-3 py-2 rounded border" onClick={() => setQ("")}>Pulisci</button>
          </div>

          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <Th label="Nome"       k="name"           sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                  <Th label="Contatto"   k="contact_name"   sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                  <Th label="Città"      k="city"           sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                  <Th label="Tipo Locale" k="tipo_locale" sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                  <Th label="Email"      k="email"       sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                  <Th label="Telefono"   k="phone"       sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                  <Th label="P. IVA"     k="vat_number"  sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                  <Th label="Creato il"  k="created_at"  sortBy={sortBy} sortDir={sortDir} onClick={handleSortClick} />
                  <th className="px-3 py-2 text-left">Note</th>
                  <th className="px-3 py-2 text-left">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {view.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    {/* Nome - NON EDITABILE */}
                    <td className="px-3 py-2 bg-gray-100">{r.name || "—"}</td>
                    
                    {/* Contatto - EDITABILE */}
                    <EditableCell
                      rowId={r.id}
                      field="contact_name"
                      value={r.contact_name}
                      editingCell={editingCell}
                      tempValue={tempValue}
                      onStartEdit={startEditing}
                      onCancel={cancelEditing}
                      onSave={saveEditing}
                      onTempChange={setTempValue}
                    />
                    
                    {/* Città - EDITABILE */}
                    <EditableCell
                      rowId={r.id}
                      field="city"
                      value={r.city}
                      editingCell={editingCell}
                      tempValue={tempValue}
                      onStartEdit={startEditing}
                      onCancel={cancelEditing}
                      onSave={saveEditing}
                      onTempChange={setTempValue}
                    />
                    
                    {/* Tipo Locale - EDITABILE */}
                    <EditableCell
                      rowId={r.id}
                      field="tipo_locale"
                      value={r.tipo_locale}
                      editingCell={editingCell}
                      tempValue={tempValue}
                      onStartEdit={startEditing}
                      onCancel={cancelEditing}
                      onSave={saveEditing}
                      onTempChange={setTempValue}
                      options={TIPO_LOCALE}
                    />
                    
                    {/* Email - EDITABILE */}
                    <EditableCell
                      rowId={r.id}
                      field="email"
                      value={r.email}
                      editingCell={editingCell}
                      tempValue={tempValue}
                      onStartEdit={startEditing}
                      onCancel={cancelEditing}
                      onSave={saveEditing}
                      onTempChange={setTempValue}
                    />
                    
                    {/* Telefono - EDITABILE */}
                    <EditableCell
                      rowId={r.id}
                      field="phone"
                      value={r.phone}
                      editingCell={editingCell}
                      tempValue={tempValue}
                      onStartEdit={startEditing}
                      onCancel={cancelEditing}
                      onSave={saveEditing}
                      onTempChange={setTempValue}
                    />
                    
                    {/* P.IVA - NON EDITABILE */}
                    <td className="px-3 py-2 bg-gray-100">{r.vat_number || "—"}</td>
                    
                    {/* Data - NON EDITABILE */}
                    <td className="px-3 py-2 bg-gray-100">{new Date(r.created_at).toLocaleString()}</td>
                    
                    {/* Note - EDITABILE */}
                    <EditableCell
                      rowId={r.id}
                      field="notes"
                      value={r.notes}
                      editingCell={editingCell}
                      tempValue={tempValue}
                      onStartEdit={startEditing}
                      onCancel={cancelEditing}
                      onSave={saveEditing}
                      onTempChange={setTempValue}
                    />
                    
                    {/* Azioni - CANCELLAZIONE */}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => deleteClient(r.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Elimina cliente"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                
                {!loading && actuallyReady && view.length === 0 && (
                  <tr>
                    <td className="px-3 py-8 text-center text-gray-500" colSpan={10}>
                      Nessun cliente trovato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && <div className="text-sm text-gray-500">Caricamento…</div>}
        </div>
      )}

      {/* Drawer con backdrop */}
      <DrawersWithBackdrop
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        rightContent={rightContent}
        onCloseLeft={closeLeft}
        onCloseRight={closeRight}
      />
    </>
  );

  }

function Th({ label, k, sortBy, sortDir, onClick }: { label: string; k: SortKey; sortBy: SortKey; sortDir: "asc" | "desc"; onClick: (k: SortKey) => void }) {
  const active = sortBy === k;
  return (
    <th className="px-3 py-2 text-left cursor-pointer select-none" onClick={() => onClick(k)}>
      <span className={active ? "font-semibold" : ""}>{label}</span>
      {active ? <span> {sortDir === "asc" ? "▲" : "▼"}</span> : null}
    </th>
  );
}

function EditableCell({
  rowId,
  field,
  value,
  editingCell,
  tempValue,
  onStartEdit,
  onCancel,
  onSave,
  onTempChange,
  options
}: {
  rowId: string;
  field: string;
  value: string;
  editingCell: {rowId: string, field: string} | null;
  tempValue: string;
  onStartEdit: (rowId: string, field: string, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onTempChange: (value: string) => void;
  options?: string[];
}) {
  const isEditing = editingCell?.rowId === rowId && editingCell?.field === field;
  
  if (isEditing) {
    if (options && options.length > 0) {
      return (
        <td className="px-3 py-2">
          <select
            value={tempValue}
            onChange={(e) => onTempChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onCancel();
            }}
            autoFocus
            className="w-full px-2 py-1 border rounded"
          >
            <option value="">Seleziona...</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </td>
      );
    }
    
    return (
      <td className="px-3 py-2">
        <input
          type="text"
          value={tempValue}
          onChange={(e) => onTempChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
          className="w-full px-2 py-1 border rounded"
        />
      </td>
    );
  }
  
  return (
    <td 
      className="px-3 py-2 cursor-pointer hover:bg-blue-50"
      onClick={() => onStartEdit(rowId, field, value)}
      title="Clicca per modificare"
    >
      {value || "—"}
    </td>
  );
}
