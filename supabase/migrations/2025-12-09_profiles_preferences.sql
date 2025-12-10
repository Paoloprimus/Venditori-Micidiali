-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Aggiunta campo preferences a profiles
-- ═══════════════════════════════════════════════════════════════════════════
-- Data: 2025-12-09
-- Descrizione: Permette di salvare preferenze utente (es. stile Napoleone)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.preferences IS 'Preferenze utente (napoleonStyle, etc.)';

-- Esempio struttura:
-- {
--   "napoleonStyle": "equilibrato"
-- }

