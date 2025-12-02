-- ============================================================================
-- MIGRATION: Aggiunta campo prodotti_discussi a visits
-- ============================================================================
-- Data: 2025-12-01
-- Descrizione: Permette di annotare i prodotti discussi/venduti durante una visita
-- ============================================================================

ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS prodotti_discussi TEXT;

COMMENT ON COLUMN visits.prodotti_discussi IS 'Prodotti discussi/venduti durante la visita (testo libero o codici separati da virgola)';

