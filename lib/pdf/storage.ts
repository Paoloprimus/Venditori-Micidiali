// lib/pdf/storage.ts
// Funzioni per salvare PDF sul device e metadata nel database

import type { DocumentMetadata, DocumentRecord } from './types';

/**
 * Salva il PDF sul device dell'utente
 * @param blob - Blob del PDF
 * @param filename - Nome del file (es: "Report_Planning_2025-11-08.pdf")
 * @returns Promise con il percorso del file salvato (o null se annullato)
 */
export async function savePdfToDevice(
  blob: Blob, 
  filename: string
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // Crea link temporaneo per download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      // Ritorna il filename come "file_path"
      // In ambiente browser non abbiamo accesso al path reale,
      // ma salviamo il filename per riferimento
      resolve(filename);
      
    } catch (error) {
      console.error('Errore salvataggio PDF:', error);
      resolve(null);
    }
  });
}

/**
 * Salva i metadata del documento nel database
 * @param documentData - Dati del documento da salvare
 * @returns Promise con il record salvato
 */
export async function saveDocumentMetadata(documentData: {
  document_type: 'report_planning' | 'lista_clienti';
  title: string;
  filename: string;
  file_path: string;
  metadata: DocumentMetadata;
  file_size?: number;
}): Promise<DocumentRecord> {
  const response = await fetch('/api/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(documentData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
    throw new Error(error.error || error.details || 'Errore salvataggio metadata');
  }

  const result = await response.json();
  return result.document;
}

/**
 * Recupera la lista dei documenti dell'utente
 * @param filters - Filtri opzionali
 * @returns Promise con array di documenti
 */
export async function fetchDocuments(filters?: {
  document_type?: 'report_planning' | 'lista_clienti';
  limit?: number;
}): Promise<DocumentRecord[]> {
  const params = new URLSearchParams();
  
  if (filters?.document_type) {
    params.append('type', filters.document_type);
  }
  if (filters?.limit) {
    params.append('limit', filters.limit.toString());
  }

  const response = await fetch(`/api/documents?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
    throw new Error(error.error || error.details || 'Errore caricamento documenti');
  }

  const result = await response.json();
  return result.documents || [];
}

/**
 * Elimina un documento (solo metadata, non il file fisico)
 * @param documentId - ID del documento da eliminare
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`/api/documents/${documentId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
    throw new Error(error.error || error.details || 'Errore eliminazione documento');
  }
}

/**
 * Genera filename per report planning
 * @param data - Data del report (formato: YYYY-MM-DD)
 * @returns Nome file
 */
export function generatePlanningFilename(data: string): string {
  return `Report_Planning_${data}.pdf`;
}

/**
 * Genera filename per lista clienti
 * @param criterio - Tipo di criterio (es: "Settimana", "Fatturato", ecc.)
 * @param valore - Valore del criterio (opzionale)
 * @param data - Data generazione
 * @returns Nome file
 */
export function generateListaClientiFilename(
  criterio: string, 
  valore?: string,
  data?: string
): string {
  const dataStr = data || new Date().toISOString().split('T')[0];
  const valoreStr = valore ? `_${valore}` : '';
  return `Lista_${criterio}${valoreStr}_${dataStr}.pdf`;
}

/**
 * Formatta la dimensione del file in formato leggibile
 * @param bytes - Dimensione in bytes
 * @returns Stringa formattata (es: "1.2 MB")
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '-';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Formatta la data in formato italiano
 * @param isoDate - Data in formato ISO (es: "2025-11-08")
 * @returns Data formattata (es: "8 Novembre 2025")
 */
export function formatDateItalian(isoDate: string): string {
  const date = new Date(isoDate);
  const formatter = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return formatter.format(date);
}
