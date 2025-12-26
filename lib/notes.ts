/**
 * Sistema Note Locali per REPING COPILOT
 * 
 * Le note sono salvate in localStorage e associate ai place_id.
 * Supporta export/import JSON per backup.
 */

export type PlaceNote = {
  place_id: string;
  place_name: string;  // Per riferimento nel JSON export
  note: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  reminder?: string;  // Data reminder ISO
};

export type NotesData = {
  version: number;
  exported_at: string;
  notes: Record<string, PlaceNote>;
};

const STORAGE_KEY = 'reping-copilot-notes';
const CURRENT_VERSION = 1;

/**
 * Ottieni tutte le note da localStorage
 */
export function getAllNotes(): Record<string, PlaceNote> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const data = JSON.parse(stored);
    return data.notes || {};
  } catch (e) {
    console.error('Errore lettura note:', e);
    return {};
  }
}

/**
 * Ottieni nota per un place specifico
 */
export function getNote(placeId: string): PlaceNote | null {
  const notes = getAllNotes();
  return notes[placeId] || null;
}

/**
 * Salva/aggiorna nota per un place
 */
export function saveNote(
  placeId: string, 
  placeName: string,
  noteText: string,
  options?: {
    tags?: string[];
    priority?: 'low' | 'medium' | 'high';
    reminder?: string;
  }
): PlaceNote {
  const notes = getAllNotes();
  const now = new Date().toISOString();
  
  const existingNote = notes[placeId];
  
  const note: PlaceNote = {
    place_id: placeId,
    place_name: placeName,
    note: noteText,
    created_at: existingNote?.created_at || now,
    updated_at: now,
    tags: options?.tags || existingNote?.tags,
    priority: options?.priority || existingNote?.priority,
    reminder: options?.reminder || existingNote?.reminder,
  };
  
  notes[placeId] = note;
  
  const data: NotesData = {
    version: CURRENT_VERSION,
    exported_at: now,
    notes,
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  
  return note;
}

/**
 * Elimina nota per un place
 */
export function deleteNote(placeId: string): boolean {
  const notes = getAllNotes();
  
  if (!notes[placeId]) return false;
  
  delete notes[placeId];
  
  const data: NotesData = {
    version: CURRENT_VERSION,
    exported_at: new Date().toISOString(),
    notes,
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  
  return true;
}

/**
 * Esporta tutte le note come JSON
 */
export function exportNotesAsJSON(): string {
  const notes = getAllNotes();
  
  const data: NotesData = {
    version: CURRENT_VERSION,
    exported_at: new Date().toISOString(),
    notes,
  };
  
  return JSON.stringify(data, null, 2);
}

/**
 * Scarica le note come file JSON
 */
export function downloadNotesAsFile(): void {
  const json = exportNotesAsJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `reping-notes-${date}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Importa note da JSON (merge o sostituisci)
 */
export function importNotesFromJSON(
  jsonString: string, 
  mode: 'merge' | 'replace' = 'merge'
): { imported: number; errors: string[] } {
  const errors: string[] = [];
  let imported = 0;
  
  try {
    const data = JSON.parse(jsonString) as NotesData;
    
    if (!data.notes || typeof data.notes !== 'object') {
      errors.push('Formato JSON non valido: manca il campo "notes"');
      return { imported, errors };
    }
    
    const currentNotes = mode === 'merge' ? getAllNotes() : {};
    
    for (const [placeId, note] of Object.entries(data.notes)) {
      if (!note.place_id || !note.note) {
        errors.push(`Nota non valida per place_id: ${placeId}`);
        continue;
      }
      
      // In merge mode, mantieni la nota più recente
      if (mode === 'merge' && currentNotes[placeId]) {
        const existing = currentNotes[placeId];
        const existingDate = new Date(existing.updated_at);
        const importDate = new Date(note.updated_at);
        
        if (existingDate > importDate) {
          continue; // Mantieni esistente
        }
      }
      
      currentNotes[placeId] = note;
      imported++;
    }
    
    const newData: NotesData = {
      version: CURRENT_VERSION,
      exported_at: new Date().toISOString(),
      notes: currentNotes,
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    
  } catch (e) {
    errors.push(`Errore parsing JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  return { imported, errors };
}

/**
 * Conta note totali
 */
export function getNotesCount(): number {
  const notes = getAllNotes();
  return Object.keys(notes).length;
}

/**
 * Cerca note per testo
 */
export function searchNotes(query: string): PlaceNote[] {
  const notes = getAllNotes();
  const lowerQuery = query.toLowerCase();
  
  return Object.values(notes).filter(note => 
    note.note.toLowerCase().includes(lowerQuery) ||
    note.place_name.toLowerCase().includes(lowerQuery) ||
    note.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Ottieni note con reminder attivo per oggi o scaduti
 */
export function getActiveReminders(): PlaceNote[] {
  const notes = getAllNotes();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return Object.values(notes).filter(note => {
    if (!note.reminder) return false;
    const reminderDate = new Date(note.reminder);
    reminderDate.setHours(0, 0, 0, 0);
    return reminderDate <= today;
  });
}

/**
 * Ottieni note per priorità
 */
export function getNotesByPriority(priority: 'low' | 'medium' | 'high'): PlaceNote[] {
  const notes = getAllNotes();
  return Object.values(notes).filter(note => note.priority === priority);
}

/**
 * Migra note dal vecchio formato (se presente)
 */
export function migrateOldNotes(): number {
  if (typeof window === 'undefined') return 0;
  
  const OLD_KEY = 'reping-horeca-notes';
  const oldData = localStorage.getItem(OLD_KEY);
  
  if (!oldData) return 0;
  
  try {
    const oldNotes = JSON.parse(oldData) as Record<string, string>;
    const currentNotes = getAllNotes();
    let migrated = 0;
    
    for (const [key, noteText] of Object.entries(oldNotes)) {
      if (typeof noteText !== 'string' || !noteText.trim()) continue;
      
      // Il vecchio formato usa chiavi come "nome_comune_idx"
      // Non abbiamo il place_id, creiamo un ID fittizio
      const fakeId = `migrated_${key}`;
      
      if (!currentNotes[fakeId]) {
        currentNotes[fakeId] = {
          place_id: fakeId,
          place_name: key.split('_')[0] || 'Unknown',
          note: noteText,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        migrated++;
      }
    }
    
    if (migrated > 0) {
      const data: NotesData = {
        version: CURRENT_VERSION,
        exported_at: new Date().toISOString(),
        notes: currentNotes,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    
    // Rimuovi vecchio storage
    localStorage.removeItem(OLD_KEY);
    
    return migrated;
  } catch (e) {
    console.error('Errore migrazione note:', e);
    return 0;
  }
}

