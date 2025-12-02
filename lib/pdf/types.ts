// lib/pdf/types.ts
// Interfacce TypeScript per i dati dei report PDF

/**
 * Dati per generare il Report Visite (giornaliero, settimanale o periodo)
 */
export interface ReportVisiteData {
  // Header info
  nomeAgente: string;
  dataInizio: string; 
  dataFine: string; 
  periodoFormattato: string; 
  
  // Riepilogo
  numVisite: number;
  numClienti: number; 
  fatturatoTotale: number;
  kmTotali: number;

  // NUOVI CAMPI TEMPO
  tempoTotaleOre: string; // es. "8h 30m"
  tempoVisiteOre: string; // es. "4h 15m"
  tempoViaggioOre: string; // es. "4h 15m"
  
  // Dettaglio visite
  visite: VisitaDetail[];
}

/**
 * Dettaglio singola visita nel report
 */
export interface VisitaDetail {
  dataOra: string; 
  nomeCliente: string;
  cittaCliente: string;
  tipo: string; 
  esito: string; 
  importoVendita: number | null;
  noteVisita: string | null;
  durataMinuti: number | null; // Aggiunto per visualizzazione
}

/**
 * Dati per generare Report Lista Clienti
 */
export interface ReportListaClientiData {
  nomeAgente: string;
  dataGenerazione: string;
  filtri: {
    tipo: string;
    descrizione: string;
  };
  clienti: ClienteListaDetail[];
  numClienti: number;
  visiteTotali: number;
  fatturatoTotale: number;
  kmTotali: number;
}

export interface ClienteListaDetail {
  nome: string;
  citta: string;
  numVisite: number;
  ultimaVisita: string | null;
  fatturato: number;
  km: number;
  note: string | null;
}

export interface DocumentMetadata {
  data_inizio?: string;
  data_fine?: string;
  num_visite?: number;
  num_clienti?: number;
  fatturato_tot?: number;
  km_tot?: number;
  filtro_tipo?: string;
  periodo?: string;
  valore_filtro?: string;
  visite_tot?: number;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  document_type: 'report_planning' | 'lista_clienti' | 'scheda_cliente';
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

/**
 * Dati per generare Report Scheda Cliente
 */
export interface ReportSchedaClienteData {
  // Header
  nomeAgente: string;
  dataGenerazione: string;
  
  // Dati cliente
  cliente: {
    nome: string;
    contatto: string;
    indirizzo: string;
    citta: string;
    tipoLocale: string;
    telefono: string;
    email: string;
    piva: string;
    clienteDal: string;
    note: string;
  };
  
  // KPI
  stats: {
    totaleVisite: number;
    totaleChiamate: number;
    totaleVendite: number;
    ultimaVisita: string | null;
    mediaDurataVisita: number;
    visiteMese: number;
    venditeMese: number;
  };
  
  // Storico attività
  attivita: Array<{
    data: string;
    tipo: 'visita' | 'chiamata';
    esito: string;
    importo: number | null;
    durata: number | null;
    note: string;
  }>;
}
