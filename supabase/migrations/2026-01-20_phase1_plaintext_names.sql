-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 1: Nomi attività in chiaro per RAG
-- ═══════════════════════════════════════════════════════════════════════════
-- Data: 2026-01-20
-- Descrizione: 
--   - Assicura che la colonna `name` sia disponibile per RAG
--   - Aggiunge tabella conversation_history per logging (prep Fase 2)
--   - Aggiunge indici per search su name e notes
-- 
-- NOTA: I dati cifrati (name_enc) NON vengono toccati.
--       La migrazione dati avviene client-side tramite /admin/migrate-names
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Assicura che name possa essere NULL temporaneamente durante migrazione
-- (già NOT NULL nello schema, ma alcuni record potrebbero avere solo name_enc)
ALTER TABLE accounts ALTER COLUMN name DROP NOT NULL;

-- 2. Aggiungi colonna per tracciare stato migrazione
ALTER TABLE accounts 
  ADD COLUMN IF NOT EXISTS name_migrated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN accounts.name_migrated_at IS 'Timestamp migrazione name_enc -> name';

-- 3. Crea tabella conversation_history per logging chat (prep Fase 2)
CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Messaggio
  query TEXT NOT NULL,              -- Domanda utente
  response TEXT NOT NULL,           -- Risposta assistente
  
  -- Metadati elaborazione
  intent TEXT,                      -- Intent riconosciuto (se locale)
  confidence REAL,                  -- Confidence NLU (0-1)
  source TEXT NOT NULL DEFAULT 'unknown' CHECK (source IN ('local', 'rag', 'llm', 'unknown')),
  
  -- Contesto
  account_ids UUID[],               -- Clienti menzionati (array)
  entities JSONB DEFAULT '{}',      -- Entità estratte (città, date, etc.)
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per conversation_history
CREATE INDEX IF NOT EXISTS idx_convhist_user ON conversation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_convhist_user_created ON conversation_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_convhist_intent ON conversation_history(intent) WHERE intent IS NOT NULL;

-- RLS per conversation_history
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own history" ON conversation_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own history" ON conversation_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Indici per search full-text su notes (in accounts)
CREATE INDEX IF NOT EXISTS idx_accounts_note_trgm 
  ON accounts USING gin (note gin_trgm_ops);

-- 5. Indice per search su name (per RAG)
CREATE INDEX IF NOT EXISTS idx_accounts_name_trgm 
  ON accounts USING gin (name gin_trgm_ops);

-- 6. Tabella per embeddings accounts (RAG su nomi + note)
CREATE TABLE IF NOT EXISTS account_embeddings (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  embedding vector(1536),           -- OpenAI text-embedding-3-small
  content_hash TEXT,                -- Hash del contenuto indicizzato (per sapere se aggiornare)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_emb_cosine 
  ON account_embeddings USING ivfflat (embedding vector_cosine_ops);

-- RLS per account_embeddings
ALTER TABLE account_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emb_read_via_account" ON account_embeddings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM accounts a WHERE a.id = account_embeddings.account_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "emb_write_via_account" ON account_embeddings
  FOR ALL USING (EXISTS (
    SELECT 1 FROM accounts a WHERE a.id = account_embeddings.account_id AND a.user_id = auth.uid()
  ));

-- 7. Funzione per match semantico su accounts
CREATE OR REPLACE FUNCTION match_accounts(
  query_embedding vector(1536),
  match_count integer DEFAULT 5,
  user_filter uuid DEFAULT NULL
) RETURNS TABLE(
  account_id uuid,
  name text,
  city text,
  note text,
  similarity double precision
) 
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT 
    a.id as account_id,
    a.name,
    a.city,
    a.note,
    1 - (ae.embedding <=> query_embedding) as similarity
  FROM account_embeddings ae
  JOIN accounts a ON a.id = ae.account_id
  WHERE (user_filter IS NULL OR a.user_id = user_filter)
  ORDER BY ae.embedding <-> query_embedding
  LIMIT coalesce(match_count, 5);
$$;

-- Commenti
COMMENT ON TABLE conversation_history IS 'Log di tutte le conversazioni per RAG e analytics';
COMMENT ON TABLE account_embeddings IS 'Embeddings per search semantica su clienti';
COMMENT ON FUNCTION match_accounts IS 'Cerca clienti per similarità semantica';

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTA: Dopo aver eseguito questa migration, eseguire lo script di migrazione
-- dati client-side da /admin/migrate-names per popolare la colonna `name`
-- dai dati cifrati in `name_enc`
-- ═══════════════════════════════════════════════════════════════════════════
