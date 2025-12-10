-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 RIEPILOGO SETTIMANALE - Tabella per stats e feedback
-- ═══════════════════════════════════════════════════════════════════════════
-- Data: 2025-12-10
-- Descrizione: Traccia metriche settimanali e feedback utente
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Settimana di riferimento (lunedì della settimana)
  week_start DATE NOT NULL,
  
  -- Metriche automatiche
  days_active INT DEFAULT 0,              -- Giorni con almeno 1 azione
  messages_sent INT DEFAULT 0,            -- Messaggi inviati all'assistente
  routes_planned INT DEFAULT 0,           -- Giri pianificati
  suggestions_completed INT DEFAULT 0,    -- Suggerimenti Napoleone completati
  clients_visited INT DEFAULT 0,          -- Clienti visitati (visite registrate)
  
  -- Feedback utente (NULL = non ancora dato)
  feedback_score INT CHECK (feedback_score IN (-1, 0, 1)),  -- 👎=-1, 😐=0, 👍=1
  feedback_note TEXT,                     -- Nota opzionale
  feedback_at TIMESTAMPTZ,                -- Quando ha dato feedback
  
  -- Preferenze
  dismissed BOOLEAN DEFAULT FALSE,        -- L'utente ha chiuso senza dare feedback
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Una sola riga per utente per settimana
  UNIQUE(user_id, week_start)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_weekly_user ON weekly_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_week ON weekly_summaries(week_start);

-- RLS
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries" ON weekly_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries" ON weekly_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries" ON weekly_summaries
  FOR UPDATE USING (auth.uid() = user_id);

-- Commenti
COMMENT ON TABLE weekly_summaries IS 'Riepilogo settimanale attività e feedback utente';
COMMENT ON COLUMN weekly_summaries.week_start IS 'Lunedì della settimana di riferimento';
COMMENT ON COLUMN weekly_summaries.feedback_score IS '-1=negativo, 0=neutro, 1=positivo';

