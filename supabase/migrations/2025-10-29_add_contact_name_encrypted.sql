-- Migration: Aggiungi campi per nome contatto cifrato in accounts
-- Data: 2025-10-29
-- Descrizione: Sposta il nome del contatto principale dalla tabella contacts a accounts (cifrato)

-- Aggiungi colonne per il nome contatto cifrato
ALTER TABLE accounts 
  ADD COLUMN IF NOT EXISTS contact_name_enc TEXT,
  ADD COLUMN IF NOT EXISTS contact_name_iv TEXT;

-- Commenti per documentazione
COMMENT ON COLUMN accounts.contact_name_enc IS 'Nome contatto principale (cifrato con AES-256-GCM)';
COMMENT ON COLUMN accounts.contact_name_iv IS 'IV per decifrare contact_name_enc';

-- Note: I campi sono opzionali (NULL permesso) per compatibilità con record esistenti
-- I nuovi record dovrebbero sempre includere contact_name cifrato
