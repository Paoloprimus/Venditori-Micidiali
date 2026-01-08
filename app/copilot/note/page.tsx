'use client';

import { useEffect, useState, useRef } from 'react';
import {
  getAllNotes,
  getNote,
  saveNote,
  deleteNote,
  downloadNotesAsFile,
  importNotesFromJSON,
  getNotesCount,
  searchNotes,
  migrateOldNotes,
  type PlaceNote,
} from '@/lib/notes';

export default function NotePage() {
  const [notes, setNotes] = useState<PlaceNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<PlaceNote | null>(null);
  const [editedNote, setEditedNote] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Migra note vecchie se presenti
    const migrated = migrateOldNotes();
    if (migrated > 0) {
      console.log(`Migrate ${migrated} note dal vecchio formato`);
    }
    
    loadNotes();
  }, []);

  const loadNotes = () => {
    const allNotes = getAllNotes();
    const notesList = Object.values(allNotes).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    setNotes(notesList);
    setLoading(false);
  };

  const filteredNotes = searchQuery
    ? searchNotes(searchQuery)
    : notes;

  const handleSaveNote = () => {
    if (!selectedNote) return;
    
    saveNote(selectedNote.place_id, selectedNote.place_name, editedNote, {
      priority: selectedNote.priority,
      tags: selectedNote.tags,
      reminder: selectedNote.reminder,
    });
    
    loadNotes();
    setSelectedNote(null);
    setEditedNote('');
  };

  const handleDeleteNote = (placeId: string) => {
    if (!confirm('Eliminare questa nota?')) return;
    
    deleteNote(placeId);
    loadNotes();
    
    if (selectedNote?.place_id === placeId) {
      setSelectedNote(null);
      setEditedNote('');
    }
  };

  const handleExport = () => {
    downloadNotesAsFile();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setShowImportModal(true);
      
      // Mostra anteprima
      try {
        const data = JSON.parse(content);
        const count = Object.keys(data.notes || {}).length;
        setImportResult({ imported: count, errors: [] });
      } catch {
        setImportResult({ imported: 0, errors: ['File JSON non valido'] });
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = (mode: 'merge' | 'replace') => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importNotesFromJSON(content, mode);
      setImportResult(result);
      loadNotes();
      
      if (result.errors.length === 0) {
        setTimeout(() => {
          setShowImportModal(false);
          setImportResult(null);
        }, 2000);
      }
    };
    reader.readAsText(file);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const priorityColors = {
    high: 'bg-red-600/20 text-red-400 border-red-500/50',
    medium: 'bg-amber-600/20 text-amber-400 border-amber-500/50',
    low: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                📝 Le Mie Note
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {notes.length} note salvate localmente
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={notes.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                📤 Esporta JSON
              </button>
              <button
                onClick={handleImportClick}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                📥 Importa
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <input
          type="text"
          placeholder="Cerca nelle note..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Lista note */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="font-semibold text-white">
                {searchQuery ? `Risultati: ${filteredNotes.length}` : 'Tutte le note'}
              </h2>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Caricamento...</div>
              ) : filteredNotes.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  {searchQuery ? 'Nessun risultato' : (
                    <>
                      <p>Nessuna nota salvata.</p>
                      <p className="text-sm mt-2">
                        Le note vengono create dalla pagina{' '}
                        <a href="/luoghi" className="text-blue-400 hover:underline">I Miei Luoghi</a>
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.place_id}
                      onClick={() => {
                        setSelectedNote(note);
                        setEditedNote(note.note);
                      }}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedNote?.place_id === note.place_id
                          ? 'bg-blue-900/30 border-l-4 border-blue-500'
                          : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-white truncate">
                              {note.place_name}
                            </h3>
                            {note.priority && (
                              <span className={`px-2 py-0.5 text-xs rounded-full border ${priorityColors[note.priority]}`}>
                                {note.priority === 'high' ? '🔴' : note.priority === 'medium' ? '🟡' : '🟢'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 line-clamp-2">
                            {note.note}
                          </p>
                          <p className="text-xs text-slate-500 mt-2">
                            Aggiornata: {formatDate(note.updated_at)}
                          </p>
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {note.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.place_id);
                          }}
                          className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Editor nota */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="font-semibold text-white">
                {selectedNote ? `Modifica nota: ${selectedNote.place_name}` : 'Seleziona una nota'}
              </h2>
            </div>
            
            {selectedNote ? (
              <div className="p-4">
                <textarea
                  value={editedNote}
                  onChange={(e) => setEditedNote(e.target.value)}
                  placeholder="Scrivi la tua nota..."
                  className="w-full h-64 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Priorità */}
                <div className="mt-4">
                  <label className="block text-sm text-slate-400 mb-2">Priorità</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedNote({ ...selectedNote, priority: p })}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          selectedNote.priority === p
                            ? priorityColors[p]
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {p === 'high' ? '🔴 Alta' : p === 'medium' ? '🟡 Media' : '🟢 Bassa'}
                      </button>
                    ))}
                    {selectedNote.priority && (
                      <button
                        onClick={() => setSelectedNote({ ...selectedNote, priority: undefined })}
                        className="px-3 py-1.5 rounded-lg text-sm bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                      >
                        ✕ Rimuovi
                      </button>
                    )}
                  </div>
                </div>

                {/* Azioni */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setSelectedNote(null);
                      setEditedNote('');
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    💾 Salva
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <p>Seleziona una nota dalla lista per modificarla</p>
                <p className="text-sm mt-2">
                  Oppure crea nuove note dalla pagina{' '}
                  <a href="/luoghi" className="text-blue-400 hover:underline">I Miei Luoghi</a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-medium text-white">Le note sono salvate localmente</h3>
              <p className="text-sm text-slate-400 mt-1">
                Le note vengono memorizzate nel browser (localStorage). Usa "Esporta JSON" per fare backup 
                e "Importa" per ripristinarle su un altro dispositivo o dopo aver cancellato i dati del browser.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Import */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">📥 Importa Note</h3>
            
            {importResult && (
              <div className={`p-4 rounded-lg mb-4 ${
                importResult.errors.length > 0 
                  ? 'bg-red-900/30 border border-red-500/50' 
                  : 'bg-emerald-900/30 border border-emerald-500/50'
              }`}>
                {importResult.errors.length > 0 ? (
                  <div>
                    <p className="text-red-400 font-medium">Errori:</p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-sm text-red-300">{err}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-emerald-400">
                    ✅ {importResult.imported} note pronte per l'importazione
                  </p>
                )}
              </div>
            )}

            <p className="text-slate-400 mb-4">Come vuoi importare le note?</p>
            
            <div className="space-y-3">
              <button
                onClick={() => confirmImport('merge')}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-left"
              >
                <strong>🔀 Unisci</strong>
                <p className="text-sm opacity-80">Mantieni le note esistenti, aggiungi le nuove</p>
              </button>
              <button
                onClick={() => confirmImport('replace')}
                className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-left"
              >
                <strong>🔄 Sostituisci</strong>
                <p className="text-sm opacity-80">Cancella tutto e importa solo dal file</p>
              </button>
            </div>

            <button
              onClick={() => {
                setShowImportModal(false);
                setImportResult(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="w-full mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

