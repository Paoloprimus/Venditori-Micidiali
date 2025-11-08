// lib/pdf/types.ts
// Interfacce TypeScript per i dati dei report PDF

/**
 * Dati per generare il Report Planning giornaliero
 */
export interface ReportPlanningData {
  // Header info
  nomeAgente: string;
  data: string; // formato: "2025-11-08"
  dataFormattata: string; // formato: "8 Novembre 2025"
  
  // Riepilogo
  numVisite: number;
  numCompletate: number;
  numSaltate: number;
  fatturatoTotale: number;
  kmTotali: number;
  
  // Dettaglio visite
  visite: VisitaDetail[];
}

/**
 * Dettaglio singola visita nel report
 */
export interface VisitaDetail {
  ordine: number; // 1, 2, 3...
  nomeCliente: string;
  cittaCliente: string;
  ultimaVisita: string | null; // formato: "15/10/2025" o null
  giorniDaUltimaVisita: number | null;
  fatturato: number | null;
  esito: string; // "ordine_acquisito", "altro", ecc.
  noteVisita: string | null;
}

/**
 * Dati per generare Report Lista Clienti
 */
export interface ReportListaClientiData {
  // Header info
  nomeAgente: string;
  dataGenerazione: string;
  
  // Filtri applicati
  filtri: {
    tipo: string; // "periodo", "visite", "fatturato", "km"
    descrizione: string; // "Novembre 2025", ">5 visite", ecc.
  };
  
  // Risultati
  clienti: ClienteListaDetail[];
  
  // Totali
  numClienti: number;
  visiteTotali: number;
  fatturatoTotale: number;
  kmTotali: number;
}

/**
 * Dettaglio singolo cliente nel report lista
 */
export interface ClienteListaDetail {
  nome: string;
  citta: string;
  numVisite: number;
  ultimaVisita: string | null;
  fatturato: number;
  km: number;
  note: string | null;
}

/**
 * Metadata salvati nel database per ogni documento
 */
export interface DocumentMetadata {
  // Per report_planning
  data?: string;
  num_visite?: number;
  fatturato_tot?: number;
  km_tot?: number;
  
  // Per lista_clienti
  filtro_tipo?: string;
  periodo?: string;
  valore_filtro?: string;
  num_clienti?: number;
  visite_tot?: number;
}

/**
 * Record completo del documento nel database
 */
export interface DocumentRecord {
  id: string;
  user_id: string;
  document_type: 'report_planning' | 'lista_clienti';
  title: string;
  filename: string;
  file_path: string;
  metadata: DocumentMetadata;
  file_size: number | null;
  backed_up: boolean;
  backup_url: string | null;
  backup_at: string | null;
  created_at: string;
  updated_at: string;
}
