/**
 * ============================================================================
 * COMPONENTE: Drawers (navigazione laterale destra e sinistra)
 * ============================================================================
 * 
 * PERCORSO: /components/Drawers.tsx
 * 
 * MODIFICHE:
 * - Import clienti: Aggiunto link /tools/import-clients
 * - Planning: Aggiunto link /planning (sezione Uscite)
 * - Prodotti: Aggiunta sezione completa con ProductManager
 * - Documenti: Sistema completo generazione PDF liste
 * 
 * ============================================================================
 */

// components/Drawers.tsx
"use client";
import { useEffect, useState } from "react";

import { fetchDocuments, deleteDocument, formatFileSize, type DocumentRecord } from '@/lib/pdf';
import GenerateListaClientiButton from './GenerateListaClientiButton';
import PromemoriaSection from './PromemoriaSection';

import { fetchPromemoria, createPromemoria, updatePromemoria, deletePromemoria, type Promemoria, type PromemoriaInput } from '@/lib/promemoria';
import PromemoriaList from './PromemoriaList';
import PromemoriaForm from './PromemoriaForm';
import { geocodeAddress } from '@/lib/geocoding';

/* ----------------------- Hook stato drawer sx/dx ----------------------- */
export type RightDrawerContent = 'dati' | 'docs' | 'impostazioni' | null;

export function useDrawers() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightContent, setRightContent] = useState<RightDrawerContent>(null);
  
  return {
    leftOpen,
    rightOpen: rightContent !== null,
    rightContent,
    openLeft: () => setLeftOpen(true),
    closeLeft: () => setLeftOpen(false),
    openDati: () => setRightContent('dati'),
    openDocs: () => setRightContent('docs'),
    openImpostazioni: () => setRightContent('impostazioni'),
    closeRight: () => setRightContent(null),
  };
}

/* ---------------------------- Tipi conversazioni ---------------------------- */
type Conv = { id: string; title: string; updated_at?: string };

/* -------------------------------- LeftDrawer -------------------------------- */
export function LeftDrawer({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect?: (c: Conv) => void; // ← Ora opzionale!
}) {
  const [items, setItems] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // ✅ Funzione di default per selezionare una conversazione
  const handleSelect = (conv: Conv) => {
    if (onSelect) {
      onSelect(conv);
    } else {
      // Default: chiudi drawer e vai alla home con la conversazione
      onClose();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  async function load(reset = false) {
    if (loading) return;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({ limit: "20", offset: String(reset ? 0 : offset) });
    const res = await fetch(`/api/conversations/list?${q.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.details || data?.error || "Errore");
      setLoading(false);
      return;
    }
    const newItems: Conv[] = data.items || [];
    setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
    if (data.nextOffset != null) {
      setOffset(data.nextOffset);
      setHasMore(true);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function remove(id: string) {
    if (!confirm("Eliminare questa sessione?")) return;

    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data?.details || data?.error || `Errore eliminazione (HTTP ${res.status})`);
      return;
    }

    setItems((prev) => prev.filter((x) => x.id !== id));
    await load(true);
  }

  async function createNew() {
    const t = prompt("Titolo nuova sessione:");
    const title = (t ?? "").trim();
    if (!title) return;

    const res = await fetch("/api/conversations/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.details || data?.error || "Errore creazione");
      return;
    }
    const conv: Conv = data?.conversation ?? data?.item ?? data;
    if (!conv?.id) {
      alert("Errore: ID sessione mancante nella risposta");
      return;
    }
    setItems((prev) => [conv, ...prev]);
    handleSelect(conv);
  }

  return (
    <aside className={`drawer ${open ? "open" : ""}`}>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Sessioni</div>
        <div className="spacer" />
        <button className="iconbtn" onClick={() => load(true)}>↻</button>
      </div>

      <div className="list">
        <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <button className="btn" onClick={createNew}>Crea + nomina nuova sessione</button>
        </div>

        {error && <div className="row" style={{ color: "#F59E0B" }}>Errore: {error}</div>}

        {items.map((c) => (
          <div key={c.id} className="row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{ flex: 1, cursor: "pointer" }}
              onClick={() => handleSelect(c)}
              title={c.title}
            >
              <div className="title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.title}
              </div>
            </div>
            <button className="iconbtn" title="Elimina" onClick={() => remove(c.id)}>🗑️</button>
          </div>
        ))}

        {hasMore && items.length > 0 && !loading && (
          <button className="iconbtn" onClick={() => load(false)}>Carica altro…</button>
        )}

        {loading && <div className="helper">Caricamento…</div>}
        {!loading && items.length === 0 && <div className="helper">Nessuna sessione.</div>}
      </div>
    </aside>
  );
}

/* ------------------------------- RightDrawer ------------------------------- */
export function RightDrawer({
  open,
  content,
  onClose,
}: {
  open: boolean;
  content: RightDrawerContent;
  onClose: () => void;
}) {
  return (
    <aside className={`drawer right ${open ? "open" : ""}`}>
      {content === 'dati' && <DrawerDati onClose={onClose} />}
      {content === 'docs' && <DrawerDocs onClose={onClose} />}
      {content === 'impostazioni' && <DrawerImpostazioni onClose={onClose} />}
    </aside>
  );
}

/* ---------------------- WRAPPER CON BACKDROP ---------------------- */
export function DrawersWithBackdrop({
  leftOpen,
  rightOpen,
  rightContent,
  onCloseLeft,
  onCloseRight,
  onSelectConversation,
}: {
  leftOpen: boolean;
  rightOpen: boolean;
  rightContent: RightDrawerContent;
  onCloseLeft: () => void;
  onCloseRight: () => void;
  onSelectConversation?: (c: Conv) => void;
}) {
  return (
    <>
      {/* ✅ Backdrop: chiude i drawer quando clicchi fuori */}
      {(leftOpen || rightOpen) && (
        <div
          onClick={() => {
            if (leftOpen) onCloseLeft();
            if (rightOpen) onCloseRight();
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1999,
            cursor: 'pointer',
          }}
        />
      )}

      {/* Drawer */}
      <div style={{ position: 'relative', zIndex: 2001 }}>
        <LeftDrawer open={leftOpen} onClose={onCloseLeft} onSelect={onSelectConversation} />
        <RightDrawer open={rightOpen} content={rightContent} onClose={onCloseRight} />
      </div>
    </>
  );
}

/* ------------------------ Contenuto: GESTIONE DATI ------------------------ */
function DrawerDati({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'clienti' | 'prodotti' | 'uscite'>('uscite');

  function goQuickAdd() {
    onClose();
    window.location.href = "/tools/quick-add-client";
  }
  
  function goClientsList() {
    onClose();
    window.location.href = "/clients";
  }

  function goImportClients() {
    onClose();
    window.location.href = "/tools/import-clients";
  }

  function goPlanning() {
    onClose();
    window.location.href = "/planning";
  }

  function goProductsList() {
    onClose();
    window.location.href = "/products";
  }

  function goQuickAddProduct() {
    onClose();
    window.location.href = "/tools/quick-add-product";
  }

  function goImportProducts() {
    onClose();
    window.location.href = "/tools/import-products";
  }

  function downloadCSVTemplate() {
    const headers = [
      'name',
      'contact_name',
      'city',
      'address',
      'tipo_locale',
      'phone',
      'email',
      'vat_number',
      'notes'
    ];
    
    const exampleRow = [
      'Bar Centrale',
      'Mario Rossi',
      'Milano',
      'Via Roma 123',
      'Bar',
      '0212345678',
      'info@barcentrale.it',
      '12345678901',
      'Cliente storico, preferisce consegne al mattino'
    ];
    
    const csvContent = [
      headers.join(','),
      exampleRow.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'template-clienti.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadProductsCSVTemplate() {
    const headers = [
      'codice',
      'descrizione_articolo',
      'title',
      'sku',
      'unita_misura',
      'giacenza',
      'base_price',
      'sconto_merce',
      'sconto_fattura',
      'is_active'
    ];
    
    const exampleRow = [
      'ART001',
      'Vino Rosso DOC Superiore 75cl',
      'Vino Rosso DOC',
      '8001234567890',
      'BT',
      '100',
      '12.50',
      '1+1 gratis',
      '10',
      'true'
    ];
    
    const csvContent = [
      headers.join(','),
      exampleRow.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'template-prodotti.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Gestione</div>
      </div>

{/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
        <button
          onClick={() => setTab('uscite')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: tab === 'uscite' ? '#2563eb' : '#6b7280',
            borderBottom: tab === 'uscite' ? '2px solid #2563eb' : '2px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          USCITE
        </button>
        <button
          onClick={() => setTab('clienti')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: tab === 'clienti' ? '#2563eb' : '#6b7280',
            borderBottom: tab === 'clienti' ? '2px solid #2563eb' : '2px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          CLIENTI
        </button>
        <button
          onClick={() => setTab('prodotti')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: tab === 'prodotti' ? '#2563eb' : '#6b7280',
            borderBottom: tab === 'prodotti' ? '2px solid #2563eb' : '2px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          PRODOTTI
        </button>
      </div>

      <div className="list" style={{ padding: 16 }}>
        {tab === 'clienti' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="btn" onClick={goClientsList}>
              📋 Lista clienti
            </button>
            <button className="btn" onClick={goQuickAdd} style={{ background: '#2563eb', color: 'white', border: 'none' }}>
              ➕ Aggiungi singolo
            </button>
            <button className="btn" onClick={goImportClients}>
              📥 Importa lista
            </button>
            <button className="btn" onClick={downloadCSVTemplate}>
              📄 Scarica template CSV
            </button>
          </div>
        )}

        {tab === 'prodotti' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="btn" onClick={goProductsList}>
              📦 Lista prodotti
            </button>
            <button className="btn" onClick={goQuickAddProduct} style={{ background: '#2563eb', color: 'white', border: 'none' }}>
              ➕ Aggiungi singolo
            </button>
            <button className="btn" onClick={goImportProducts}>
              📥 Importa lista
            </button>
            <button className="btn" onClick={downloadProductsCSVTemplate}>
              📄 Scarica template CSV
            </button>
          </div>
        )}

        {tab === 'uscite' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="btn" onClick={() => { onClose(); window.location.href = '/visits'; }}>
              📅 Visite & Chiamate
            </button>
            <button className="btn" onClick={() => { onClose(); window.location.href = '/tools/add-visit'; }} style={{ background: '#2563eb', color: 'white', border: 'none' }}>
              ➕ Nuova visita
            </button>
            <button className="btn" onClick={goPlanning} style={{ background: '#10b981', color: 'white', border: 'none' }}>
              🗺️ Planning Visite
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* -------------------------- Contenuto: DOCS (STRUTTURA CORRETTA) -------------------------- */
function DrawerDocs({ onClose }: { onClose: () => void }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stato accordion
  const [openSection, setOpenSection] = useState<'promemoria' | 'storico' | null>(null);
  
  // Stato promemoria
  const [promemoria, setPromemoria] = useState<Promemoria[]>([]);
  const [loadingPromemoria, setLoadingPromemoria] = useState(true);
  const [showPromemoriaForm, setShowPromemoriaForm] = useState(false);
  const [editingPromemoria, setEditingPromemoria] = useState<Promemoria | undefined>(undefined);

  useEffect(() => {
    loadDocuments();
    loadPromemoria();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (e: any) {
      console.error('[DrawerDocs] Errore:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadPromemoria() {
    setLoadingPromemoria(true);
    try {
      const data = await fetchPromemoria();
      setPromemoria(data);
    } catch (e: any) {
      console.error('[DrawerDocs] Errore promemoria:', e);
      setPromemoria([]);
    } finally {
      setLoadingPromemoria(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('Eliminare questo documento?\n\n⚠️ Il file PDF rimarrà sul dispositivo.')) return;
    try {
      await deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      alert('✅ Documento eliminato');
    } catch (e: any) {
      alert(`Errore: ${e.message}`);
    }
  }

  function handleOpen(doc: DocumentRecord) {
    alert(`📄 ${doc.title}\n\nFile: ${doc.filename}\n\nCerca nei download del dispositivo.`);
  }

  function toggleSection(section: 'promemoria' | 'storico') {
    setOpenSection(openSection === section ? null : section);
  }

  // Gestione promemoria
  function handleNewPromemoria() {
    setEditingPromemoria(undefined);
    setShowPromemoriaForm(true);
  }

  function handleEditPromemoria(p: Promemoria) {
    setEditingPromemoria(p);
    setShowPromemoriaForm(true);
  }

  async function handleSavePromemoria(input: PromemoriaInput) {
    if (editingPromemoria) {
      await updatePromemoria(editingPromemoria.id, input);
    } else {
      await createPromemoria(input);
    }
    
    setShowPromemoriaForm(false);
    setEditingPromemoria(undefined);
    await loadPromemoria();
    
    // Notifica widget home
    window.dispatchEvent(new CustomEvent('promemoria-updated'));
  }

  async function handleDeletePromemoria(id: string) {
    try {
      await deletePromemoria(id);
      setPromemoria(prev => prev.filter(p => p.id !== id));
      alert('✅ Promemoria eliminato');
      
      // Notifica widget home
      window.dispatchEvent(new CustomEvent('promemoria-updated'));
    } catch (e: any) {
      console.error('[DrawerDocs] Errore eliminazione promemoria:', e);
      alert(`Errore: ${e.message}`);
    }
  }

  const reportPlanning = documents.filter(d => d.document_type === 'report_planning');
  const listeClienti = documents.filter(d => d.document_type === 'lista_clienti');

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Documenti</div>
        <div className="spacer" />
        <button className="iconbtn" onClick={() => { loadDocuments(); loadPromemoria(); }} title="Ricarica">↻</button>
      </div>

      <div className="list" style={{ padding: 0 }}>
        
        {/* ========== ACCORDION 1: LISTA PROMEMORIA ========== */}
        <div>
          <button
            onClick={() => toggleSection('promemoria')}
            style={{
              width: '100%',
              padding: '16px',
              border: 'none',
              borderBottom: '1px solid #e5e7eb',
              background: openSection === 'promemoria' ? '#f9fafb' : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 15,
              fontWeight: 600,
              color: '#111827',
              transition: 'background 0.15s',
            }}
          >
            <span>📌 LISTA PROMEMORIA</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {openSection === 'promemoria' ? '▼' : '▶'}
            </span>
          </button>

          {openSection === 'promemoria' && (
            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
              {loadingPromemoria && (
                <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>
                  ⏳ Caricamento...
                </div>
              )}
              
              {!loadingPromemoria && (
                <PromemoriaList
                  promemoria={promemoria}
                  onEdit={handleEditPromemoria}
                  onDelete={handleDeletePromemoria}
                />
              )}
            </div>
          )}
        </div>

        {/* ========== ACCORDION 2: STORICO REPORT ========== */}
        <div>
          <button
            onClick={() => toggleSection('storico')}
            style={{
              width: '100%',
              padding: '16px',
              border: 'none',
              borderBottom: '1px solid #e5e7eb',
              background: openSection === 'storico' ? '#f9fafb' : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 15,
              fontWeight: 600,
              color: '#111827',
              transition: 'background 0.15s',
            }}
          >
            <span>📊 STORICO REPORT</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {openSection === 'storico' ? '▼' : '▶'}
            </span>
          </button>

          {openSection === 'storico' && (
            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
              {loading && (
                <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>
                  ⏳ Caricamento...
                </div>
              )}

              {error && (
                <div style={{ padding: 16, background: '#fee2e2', borderRadius: 8, color: '#991b1b', fontSize: 13 }}>
                  ❌ Errore: {error}
                </div>
              )}
              
              {!loading && !error && documents.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
                  <div style={{ color: '#6b7280', fontSize: 14 }}>
                    Nessun report generato ancora.
                  </div>
                </div>
              )}

              {!loading && !error && documents.length > 0 && (
                <>
                  {reportPlanning.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #e5e7eb' }}>
                        📊 Report Planning ({reportPlanning.length})
                      </div>
                      {reportPlanning.map(doc => (
                        <div key={doc.id} style={{ padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#111827' }}>{doc.title}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                            {new Date(doc.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                          </div>
                          {doc.metadata && (
                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              {doc.metadata.num_visite && <span>👥 {doc.metadata.num_visite} visite</span>}
                              {doc.metadata.fatturato_tot !== undefined && <span>💰 €{doc.metadata.fatturato_tot.toFixed(2)}</span>}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleOpen(doc)} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid #2563eb', background: 'white', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              📂 Info
                            </button>
                            <button onClick={() => handleDelete(doc.id)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ef4444', background: 'white', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {listeClienti.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #e5e7eb' }}>
                        📋 Liste Clienti ({listeClienti.length})
                      </div>
                      {listeClienti.map(doc => (
                        <div key={doc.id} style={{ padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#111827' }}>{doc.title}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                            {new Date(doc.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                          </div>
                          {doc.metadata && doc.metadata.num_clienti && (
                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>👥 {doc.metadata.num_clienti} clienti</div>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleOpen(doc)} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid #2563eb', background: 'white', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              📂 Info
                            </button>
                            <button onClick={() => handleDelete(doc.id)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ef4444', background: 'white', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ========== BOTTONI FISSI ========== */}
        <div style={{ padding: 16, borderTop: '2px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Bottone Nuovo Promemoria */}
          <button
            onClick={handleNewPromemoria}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            ➕ NUOVO PROMEMORIA
          </button>

          {/* Bottone Nuovo Report */}
          <GenerateListaClientiButton onSuccess={() => {
            loadDocuments();
            setOpenSection('storico');
          }} />
        </div>

      </div>

      {/* Form Promemoria (modale) */}
      {showPromemoriaForm && (
        <PromemoriaForm
          promemoria={editingPromemoria}
          onSave={handleSavePromemoria}
          onCancel={() => {
            setShowPromemoriaForm(false);
            setEditingPromemoria(undefined);
          }}
        />
      )}
    </>
  );
}

/* --------------------- Contenuto: IMPOSTAZIONI --------------------- */
function DrawerImpostazioni({ onClose }: { onClose: () => void }) {
  const [homeAddress, setHomeAddress] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCoords, setSavedCoords] = useState<string | null>(null);

  // Carica impostazioni salvate
  useEffect(() => {
    const saved = localStorage.getItem('repping_settings');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.homeAddress) setHomeAddress(data.homeAddress);
        if (data.homeCity) setHomeCity(data.homeCity);
        if (data.homeLat && data.homeLon) {
          setSavedCoords(`${data.homeLat}, ${data.homeLon}`);
        }
      } catch {}
    }
  }, []);

  async function handleSave() {
    if (!homeAddress.trim() || !homeCity.trim()) {
      alert('Inserisci indirizzo e città');
      return;
    }

    setSaving(true);
    try {
      // Geocoding
      const coords = await geocodeAddress(homeAddress, homeCity);
      
      if (!coords) {
        alert('Indirizzo non trovato. Verifica i dati.');
        return;
      }

      // Salva in localStorage
      const settings = {
        homeAddress,
        homeCity,
        homeLat: coords.latitude,
        homeLon: coords.longitude,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('repping_settings', JSON.stringify(settings));
      setSavedCoords(`${coords.latitude}, ${coords.longitude}`);
      alert('✅ Impostazioni salvate!\nIl punto di partenza verrà usato per ottimizzare i percorsi.');
      
    } catch (e: any) {
      console.error(e);
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Impostazioni</div>
      </div>
      <div className="list" style={{ padding: 16 }}>
        
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#111827' }}>📍 Punto di Partenza</h3>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Imposta il tuo indirizzo di casa o ufficio. Verrà usato per ottimizzare i percorsi giornalieri.
          </p>
          
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Indirizzo</label>
              <input 
                value={homeAddress}
                onChange={e => setHomeAddress(e.target.value)}
                placeholder="Es. Via Roma 10"
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Città</label>
              <input 
                value={homeCity}
                onChange={e => setHomeCity(e.target.value)}
                placeholder="Es. Milano"
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db' }}
              />
            </div>

            <button 
              onClick={handleSave}
              disabled={saving}
              style={{ 
                marginTop: 8,
                width: '100%', 
                padding: '12px', 
                borderRadius: 8, 
                border: 'none', 
                background: '#2563eb', 
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Salvataggio...' : '💾 Salva Indirizzo'}
            </button>

            {savedCoords && (
              <div style={{ marginTop: 8, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 12, color: '#15803d' }}>
                ✅ Coordinate salvate: {savedCoords}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8, fontSize: 13, color: '#6b7280' }}>
          ℹ️ Altre impostazioni in arrivo...
        </div>
      </div>
    </>
  );
}
