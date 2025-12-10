-- ═══════════════════════════════════════════════════════════════════════════
-- 🎩 NAPOLEONE - Tabella Suggerimenti Proattivi
-- ═══════════════════════════════════════════════════════════════════════════
-- Data: 2025-12-10
-- Descrizione: Suggerimenti d'azione generati da Napoleone
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS napoleon_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Cliente target (opzionale, alcuni suggerimenti sono generici)
  client_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  client_name TEXT,
  
  -- Azione suggerita
  action_type TEXT NOT NULL CHECK (action_type IN ('chiama', 'visita', 'proponi', 'recupera', 'consolida', 'segui')),
  action_text TEXT NOT NULL,        -- "Chiama Bar Rossi"
  reason TEXT NOT NULL,             -- "Non ordina da 25 giorni"
  context_data JSONB DEFAULT '{}',  -- Dati aggiuntivi per dettagli
  
  -- Priorità e stato
  priority TEXT NOT NULL DEFAULT 'utile' CHECK (priority IN ('urgente', 'importante', 'utile')),
  status TEXT NOT NULL DEFAULT 'nuovo' CHECK (status IN ('nuovo', 'completato', 'rimandato', 'ignorato')),
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,  -- Per suggerimenti temporanei
  
  -- Deduplicazione: evita suggerimenti duplicati per stesso cliente/azione
  trigger_key TEXT,  -- es. "churn:client_id:2025-12-10"
  
  UNIQUE(user_id, trigger_key)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_napoleon_user_status ON napoleon_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_napoleon_user_priority ON napoleon_suggestions(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_napoleon_client ON napoleon_suggestions(client_id);

-- RLS (Row Level Security)
ALTER TABLE napoleon_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suggestions" ON napoleon_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suggestions" ON napoleon_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions" ON napoleon_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own suggestions" ON napoleon_suggestions
  FOR DELETE USING (auth.uid() = user_id);

-- Commenti
COMMENT ON TABLE napoleon_suggestions IS 'Suggerimenti proattivi generati da Napoleone';
COMMENT ON COLUMN napoleon_suggestions.action_type IS 'Tipo azione: chiama, visita, proponi, recupera, consolida, segui';
COMMENT ON COLUMN napoleon_suggestions.trigger_key IS 'Chiave per evitare duplicati (es. churn:uuid:data)';

