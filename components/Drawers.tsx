/**
 * ============================================================================
 * COMPONENTE: Drawers (navigazione laterale destra e sinistra)
 * ============================================================================
 * 
 * PERCORSO: /components/Drawers.tsx
 * 
 * MODIFICHE PER IMPORT CLIENTI:
 * - Riga ~248: Aggiunta funzione goImportClients()
 * - Riga ~329: Collegato bottone "📥 Importa lista" alla funzione
 * 
 * MODIFICHE FASE 4 - DRAWER DOCUMENTI:
 * - Riga ~394+: Implementato DrawerDocs completo con lista PDF
 * - Fetch documenti dal DB
 * - Lista raggruppata per tipo
 * - Bottoni Apri/Elimina per ogni documento
 * 
 * ============================================================================
 */

// components/Drawers.tsx
"use client";
// components/Drawers.tsx
"use client";
import { useEffect, useState } from "react";
import { fetchDocuments, deleteDocument, formatFileSize, type DocumentRecord } from '@/lib/pdf';
import GenerateListaClientiButton from './GenerateListaClientiButton';

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
  const [tab, setTab] = useState<'clienti' | 'prodotti' | 'uscite'>('clienti');

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

  function goProductsList() {
    onClose();
    window.location.href = "/products";
  }

  function goQuickAddProduct() {
    onClose();
    window.location.href = "/tools/quick-add-product";
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
            <button className="btn" onClick={() => alert('Template CSV clienti - in arrivo')}>
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
            <button className="btn" onClick={() => alert('Importa lista prodotti - in arrivo')}>
              📥 Importa lista
            </button>
            <button className="btn" onClick={() => alert('Template CSV prodotti - in arrivo')}>
              📄 Scarica template CSV
            </button>
          </div>
        )}

        {tab === 'uscite' && (
          <div style={{ padding: 16 }}>
            <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>
              Qui vedrai il diario delle tue giornate lavorative.
            </div>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px dashed #d1d5db' }}>
              <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                📅 Coming soon...
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
                Lista cronologica delle giornate lavorative con sintesi delle attività
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// SOLO LA FUNZIONE DrawerDocs AGGIORNATA

/* -------------------------- Contenuto: DOCS -------------------------- */
function DrawerDocs({ onClose }: { onClose: () => void }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carica documenti al mount
  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (e: any) {
      console.error('[DrawerDocs] Errore caricamento:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('Eliminare questo documento?\n\n⚠️ Il file PDF rimarrà sul dispositivo, verrà rimosso solo il riferimento nell\'app.')) {
      return;
    }

    try {
      await deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      alert('✅ Documento eliminato');
    } catch (e: any) {
      console.error('[DrawerDocs] Errore eliminazione:', e);
      alert(`Errore: ${e.message}`);
    }
  }

  function handleOpen(doc: DocumentRecord) {
    // In ambiente browser non possiamo "aprire" un file locale
    // Ma possiamo informare l'utente dove trovarlo
    alert(
      `📄 ${doc.title}\n\n` +
      `File salvato come:\n${doc.filename}\n\n` +
      `Cerca il file nei download del tuo dispositivo.`
    );
  }

  // Raggruppa documenti per tipo
  const reportPlanning = documents.filter(d => d.document_type === 'report_planning');
  const listeClienti = documents.filter(d => d.document_type === 'lista_clienti');

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Documenti</div>
        <div className="spacer" />
        <button className="iconbtn" onClick={loadDocuments} title="Ricarica">↻</button>
      </div>

      <div className="list" style={{ padding: 16 }}>
        {/* 🆕 BOTTONE GENERA NUOVO REPORT */}
        <div style={{ marginBottom: 24 }}>
          <GenerateListaClientiButton onSuccess={loadDocuments} />
        </div>

        {/* Separatore */}
        {!loading && documents.length > 0 && (
          <div style={{ 
            height: 1, 
            background: '#e5e7eb', 
            margin: '16px 0',
          }} />
        )}

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
              Nessun documento generato ancora.
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>
              Clicca il bottone sopra per generare il tuo primo report.
            </div>
          </div>
        )}

        {!loading && !error && documents.length > 0 && (
          <>
            {/* Report Planning */}
            {reportPlanning.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: '#374151',
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  📊 Report Planning ({reportPlanning.length})
                </div>
                
                {reportPlanning.map(doc => (
                  <div 
                    key={doc.id}
                    style={{
                      padding: 12,
                      background: '#f9fafb',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#111827' }}>
                      {doc.title}
                    </div>
                    
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      {new Date(doc.created_at).toLocaleDateString('it-IT', { 
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                    </div>

                    {doc.metadata && (
                      <div style={{ 
                        fontSize: 11, 
                        color: '#9ca3af', 
                        marginBottom: 8,
                        display: 'flex',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}>
                        {doc.metadata.num_visite && <span>👥 {doc.metadata.num_visite} visite</span>}
                        {doc.metadata.fatturato_tot !== undefined && (
                          <span>💰 €{doc.metadata.fatturato_tot.toFixed(2)}</span>
                        )}
                        {doc.metadata.km_tot !== undefined && doc.metadata.km_tot > 0 && (
                          <span>🚗 {doc.metadata.km_tot}km</span>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleOpen(doc)}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #2563eb',
                          background: 'white',
                          color: '#2563eb',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        📂 Info
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #ef4444',
                          background: 'white',
                          color: '#ef4444',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Liste Clienti */}
            {listeClienti.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: '#374151',
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  📋 Liste Clienti ({listeClienti.length})
                </div>
                
                {listeClienti.map(doc => (
                  <div 
                    key={doc.id}
                    style={{
                      padding: 12,
                      background: '#f9fafb',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#111827' }}>
                      {doc.title}
                    </div>
                    
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      {new Date(doc.created_at).toLocaleDateString('it-IT', { 
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                    </div>

                    {doc.metadata && doc.metadata.num_clienti && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                        👥 {doc.metadata.num_clienti} clienti
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleOpen(doc)}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #2563eb',
                          background: 'white',
                          color: '#2563eb',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        📂 Info
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #ef4444',
                          background: 'white',
                          color: '#ef4444',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
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
    </>
  );
}

/* --------------------- Contenuto: IMPOSTAZIONI --------------------- */
function DrawerImpostazioni({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Impostazioni</div>
      </div>
      <div className="list" style={{ padding: 16 }}>
        <div style={{ color: '#6b7280', fontSize: 14 }}>
          Qui ci saranno le configurazioni dell'app.
        </div>
        <div style={{ marginTop: 16, padding: 12, background: '#f9fafb', borderRadius: 8, fontSize: 13 }}>
          ⚙️ Coming soon...
        </div>
      </div>
    </>
  );
}
