-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2 (fix): Estendi messages per supportare RAG
-- ═══════════════════════════════════════════════════════════════════════════
-- Data: 2026-01-20
-- Descrizione: Aggiunge campi metadati a messages per RAG e analytics
-- ═══════════════════════════════════════════════════════════════════════════

-- Aggiungi campi per RAG/analytics
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS intent TEXT,
  ADD COLUMN IF NOT EXISTS confidence REAL,
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('local', 'rag', 'llm', 'unknown')),
  ADD COLUMN IF NOT EXISTS entities JSONB,
  ADD COLUMN IF NOT EXISTS account_ids UUID[];

-- Indici per analytics
CREATE INDEX IF NOT EXISTS idx_messages_intent ON messages(intent) WHERE intent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source) WHERE source IS NOT NULL;

-- Commenti
COMMENT ON COLUMN messages.intent IS 'Intent NLU riconosciuto (es. client_count, visit_today)';
COMMENT ON COLUMN messages.confidence IS 'Confidence NLU (0-1)';
COMMENT ON COLUMN messages.source IS 'Fonte risposta: local (intent), rag, llm, unknown';
COMMENT ON COLUMN messages.entities IS 'Entità estratte (clientName, period, etc.)';
COMMENT ON COLUMN messages.account_ids IS 'UUID clienti menzionati nella conversazione';

-- ═══════════════════════════════════════════════════════════════════════════
-- PULIZIA: Rimuovi conversation_history (creata per errore, non usata)
-- ═══════════════════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS conversation_history CASCADE;