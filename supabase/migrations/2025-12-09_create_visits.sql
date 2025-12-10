-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Creazione tabella visits (visite)
-- ═══════════════════════════════════════════════════════════════════════════
-- Data: 2025-12-09
-- Descrizione: Tabella per tracciare le visite ai clienti
-- ═══════════════════════════════════════════════════════════════════════════

-- Crea la tabella visits se non esiste
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  data_visita DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT DEFAULT 'visita' CHECK (tipo IN ('visita', 'telefonata', 'richiamo', 'email')),
  importo_vendita NUMERIC DEFAULT 0,
  prodotti_discussi TEXT,
  note TEXT,
  esito TEXT,
  prossima_azione TEXT,
  prossima_data DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_account_id ON visits(account_id);
CREATE INDEX IF NOT EXISTS idx_visits_data ON visits(data_visita DESC);
CREATE INDEX IF NOT EXISTS idx_visits_user_data ON visits(user_id, data_visita DESC);

-- RLS (Row Level Security)
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Policy: utente vede solo le proprie visite
DROP POLICY IF EXISTS "visits_select_own" ON visits;
CREATE POLICY "visits_select_own" ON visits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: utente inserisce solo proprie visite  
DROP POLICY IF EXISTS "visits_insert_own" ON visits;
CREATE POLICY "visits_insert_own" ON visits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: utente aggiorna solo proprie visite
DROP POLICY IF EXISTS "visits_update_own" ON visits;
CREATE POLICY "visits_update_own" ON visits
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: utente elimina solo proprie visite
DROP POLICY IF EXISTS "visits_delete_own" ON visits;
CREATE POLICY "visits_delete_own" ON visits
  FOR DELETE
  USING (auth.uid() = user_id);

-- Commenti
COMMENT ON TABLE visits IS 'Registro delle visite ai clienti';
COMMENT ON COLUMN visits.data_visita IS 'Data della visita';
COMMENT ON COLUMN visits.tipo IS 'Tipo: visita, telefonata, richiamo, email';
COMMENT ON COLUMN visits.importo_vendita IS 'Importo venduto (0 se nessuna vendita)';
COMMENT ON COLUMN visits.prodotti_discussi IS 'Prodotti discussi/venduti (testo libero)';
COMMENT ON COLUMN visits.esito IS 'Esito della visita';
COMMENT ON COLUMN visits.prossima_azione IS 'Azione da fare al prossimo contatto';
COMMENT ON COLUMN visits.prossima_data IS 'Data prevista per il prossimo contatto';

-- ═══════════════════════════════════════════════════════════════════════════
-- Aggiungi campo type a accounts se mancante
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS type TEXT;
COMMENT ON COLUMN accounts.type IS 'Tipo locale: Bar, Ristorante, Hotel, Pizzeria, Enoteca, Pub, ecc.';

