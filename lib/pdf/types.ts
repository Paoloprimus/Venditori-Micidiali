// lib/pdf/types.ts
// Interfacce TypeScript per i dati dei report PDF

/**
 * Dati per generare il Report Visite (giornaliero, settimanale o periodo)
 */
export interface ReportVisiteData {
  // Header info
  nomeAgente: string;
  dataInizio: string; // formato: "2025-11-08"
  dataFine: string; // formato: "2025-11-15"
  periodoFormattato: string; // formato: "8 - 15 Novembre 2025" o "8 Novembre 2025"
  
  // Riepilogo
  numVisite: number;
  numClienti: number; // clienti distinti visitati
  fatturatoTotale: number;
  kmTotali: number;
  
  // Dettaglio visite
  visite: VisitaDetail[];
}

/**
 * Dettaglio singola visita nel report
 */
export interface VisitaDetail {
  dataOra: string; // formato: "08/11/2025 14:30"
  nomeCliente: string;
  cittaCliente: string;
  tipo: string; // "visita" o "chiamata"
  esito: string; // "ordine_acquisito", "altro", ecc.
  importoVendita: number | null;
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
  // Per report_planning (ora report_visite)
  data_inizio?: string;
  data_fine?: string;
  num_visite?: number;
  num_clienti?: number;
  fatturato_tot?: number;
  km_tot?: number;
  
  // Per lista_clienti
  filtro_tipo?: string;
  periodo?: string;
  valore_filtro?: string;
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
