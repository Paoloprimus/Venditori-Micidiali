// components/drawers/DrawerDocs.tsx
// Estratto da components/Drawers.tsx per mantenibilità

"use client";
import { useEffect, useState } from "react";
import { fetchDocuments, deleteDocument, formatFileSize, type DocumentRecord } from '@/lib/pdf';
import { fetchPromemoria, createPromemoria, updatePromemoria, deletePromemoria, type Promemoria, type PromemoriaInput } from '@/lib/promemoria';
import GenerateListaClientiButton from '../GenerateListaClientiButton';
import PromemoriaList from '../PromemoriaList';
import PromemoriaForm from '../PromemoriaForm';

interface DrawerDocsProps {
  onClose: () => void;
}

export default function DrawerDocs({ onClose }: DrawerDocsProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [openSection, setOpenSection] = useState<'promemoria' | 'storico' | null>(null);
  
  const [promemoria, setPromemoria] = useState<Promemoria[]>([]);
  const [loadingPromemoria, setLoadingPromemoria] = useState(true);
  const [showPromemoriaForm, setShowPromemoriaForm] = useState(false);
  const [editingPromemoria, setEditingPromemoria] = useState<Promemoria | undefined>(undefined);

  useEffect(() => {
    loadDocuments();
    loadPromemoria();
  }, []);

  // Ascolta evento per aprire direttamente la sezione promemoria
  useEffect(() => {
    function handleOpenPromemoria() {
      setOpenSection('promemoria');
    }
    window.addEventListener('open-promemoria', handleOpenPromemoria);
    return () => window.removeEventListener('open-promemoria', handleOpenPromemoria);
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
    window.dispatchEvent(new CustomEvent('promemoria-updated'));
  }

  async function handleDeletePromemoria(id: string) {
    try {
      await deletePromemoria(id);
      setPromemoria(prev => prev.filter(p => p.id !== id));
      alert('✅ Promemoria eliminato');
      window.dispatchEvent(new CustomEvent('promemoria-updated'));
    } catch (e: any) {
      console.error('[DrawerDocs] Errore eliminazione promemoria:', e);
      alert(`Errore: ${e.message}`);
    }
  }

  const reportPlanning = documents.filter(d => d.document_type === 'report_planning');
  const listeClienti = documents.filter(d => d.document_type === 'lista_clienti');

  const accordionButtonStyle = (isOpen: boolean) => ({
    width: '100%',
    padding: '16px',
    border: 'none',
    borderBottom: '1px solid #e5e7eb',
    background: isOpen ? '#f9fafb' : 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 15,
    fontWeight: 600,
    color: '#111827',
    transition: 'background 0.15s',
  });

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}>Chiudi</button>
        <div className="title">Documenti</div>
        <div className="spacer" />
        <button className="iconbtn" onClick={() => { loadDocuments(); loadPromemoria(); }} title="Ricarica">↻</button>
      </div>

      <div className="list" style={{ padding: 0 }}>
        
        {/* ACCORDION: LISTA PROMEMORIA */}
        <div>
          <button onClick={() => toggleSection('promemoria')} style={accordionButtonStyle(openSection === 'promemoria')}>
            <span>📌 LISTA PROMEMORIA</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{openSection === 'promemoria' ? '▼' : '▶'}</span>
          </button>

          {openSection === 'promemoria' && (
            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
              {loadingPromemoria ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>⏳ Caricamento...</div>
              ) : (
                <PromemoriaList promemoria={promemoria} onEdit={handleEditPromemoria} onDelete={handleDeletePromemoria} />
              )}
            </div>
          )}
        </div>

        {/* ACCORDION: STORICO REPORT */}
        <div>
          <button onClick={() => toggleSection('storico')} style={accordionButtonStyle(openSection === 'storico')}>
            <span>📊 STORICO REPORT</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{openSection === 'storico' ? '▼' : '▶'}</span>
          </button>

          {openSection === 'storico' && (
            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
              {loading && <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>⏳ Caricamento...</div>}
              {error && <div style={{ padding: 16, background: '#fee2e2', borderRadius: 8, color: '#991b1b', fontSize: 13 }}>❌ Errore: {error}</div>}
              
              {!loading && !error && documents.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
                  <div style={{ color: '#6b7280', fontSize: 14 }}>Nessun report generato ancora.</div>
                </div>
              )}

              {!loading && !error && documents.length > 0 && (
                <>
                  {reportPlanning.length > 0 && (
                    <DocumentSection title="📊 Report Planning" documents={reportPlanning} onOpen={handleOpen} onDelete={handleDelete} />
                  )}
                  {listeClienti.length > 0 && (
                    <DocumentSection title="📋 Liste Clienti" documents={listeClienti} onOpen={handleOpen} onDelete={handleDelete} />
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* BOTTONI FISSI */}
        <div style={{ padding: 16, borderTop: '2px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleNewPromemoria}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 8, border: 'none',
              background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer',
              fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            ➕ NUOVO PROMEMORIA
          </button>

          <GenerateListaClientiButton onSuccess={() => { loadDocuments(); setOpenSection('storico'); }} />
        </div>
      </div>

      {/* Form Promemoria */}
      {showPromemoriaForm && (
        <PromemoriaForm
          promemoria={editingPromemoria}
          onSave={handleSavePromemoria}
          onCancel={() => { setShowPromemoriaForm(false); setEditingPromemoria(undefined); }}
        />
      )}
    </>
  );
}

// Sub-component per sezione documenti
function DocumentSection({ 
  title, 
  documents, 
  onOpen, 
  onDelete 
}: { 
  title: string; 
  documents: DocumentRecord[]; 
  onOpen: (doc: DocumentRecord) => void; 
  onDelete: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #e5e7eb' }}>
        {title} ({documents.length})
      </div>
      {documents.map(doc => (
        <div key={doc.id} style={{ padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#111827' }}>{doc.title}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
            {new Date(doc.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
          </div>
          {doc.metadata && (
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {doc.metadata.num_visite && <span>👥 {doc.metadata.num_visite} visite</span>}
              {doc.metadata.num_clienti && <span>👥 {doc.metadata.num_clienti} clienti</span>}
              {doc.metadata.fatturato_tot !== undefined && <span>💰 €{doc.metadata.fatturato_tot.toFixed(2)}</span>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onOpen(doc)} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid #2563eb', background: 'white', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              📂 Info
            </button>
            <button onClick={() => onDelete(doc.id)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ef4444', background: 'white', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

