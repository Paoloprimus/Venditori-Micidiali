// Types for Sales Co-Pilot MVP (memory + proposals)
export type EntityName = 'accounts' | 'contacts' | 'products';

export type CustomFieldType = 'text' | 'number' | 'boolean' | 'date' | 'enum';

export interface CustomFieldDef {
  field_key: string;
  field_label: string;
  field_type: CustomFieldType;
  options?: string[];
  help?: string;
}

export interface CustomFieldsProposal {
  [entity: string]: CustomFieldDef[];
}

export interface ProposalLineItem {
  prodotto: string;
  sku?: string;
  qta: number;
  prezzo_unit?: number;
  sconti?: string;
  subtotale?: number;
}

export interface ProposalTotals {
  totale?: number;
  sconto?: number;
  iva?: number;
  totale_ivato?: number;
}

export interface ProposalPayload {
  titolo: string;
  intro: string;
  punti_valore: string[];
  tabella_voci: ProposalLineItem[];
  riepilogo_prezzi: ProposalTotals;
  termini_pagamento?: string;
  SLA?: string;
  CTA?: string;
  email_accompagnamento?: string;
}

export interface MemorySearchHit {
  note_id: string;
  similarity: number;
  body?: string;
}
