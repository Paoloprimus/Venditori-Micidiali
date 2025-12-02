-- Migration: test_notes
-- Tabella per note di testing funzionale (Test Companion Panel)

CREATE TABLE IF NOT EXISTS test_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  page_title TEXT,
  category TEXT NOT NULL DEFAULT 'altro',
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice per query veloci
CREATE INDEX IF NOT EXISTS idx_test_notes_user_date ON test_notes(user_id, created_at DESC);

-- RLS: solo l'utente vede le proprie note
ALTER TABLE test_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own test notes"
  ON test_notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Commento
COMMENT ON TABLE test_notes IS 'Note di testing funzionale catturate dal Test Companion Panel';

