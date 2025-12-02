-- ============================================================
-- MIGRAZIONE: Sistema Consensi GDPR
-- Data: 2 Dicembre 2025
-- Fase 5: Legal & Privacy
-- ============================================================

-- Tabella principale per il logging dei consensi
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('tos', 'privacy', 'marketing', 'cookie_analytics', 'cookie_all')),
  granted BOOLEAN NOT NULL DEFAULT false,
  document_version TEXT NOT NULL, -- es. 'privacy_v1.0', 'tos_v1.0'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ogni utente può avere più record per tipo (storico modifiche)
  -- Ma usiamo un indice per query veloci sull'ultimo consenso
  CONSTRAINT unique_consent_per_type_per_timestamp UNIQUE (user_id, consent_type, created_at)
);

-- Indice per query veloci: "ultimo consenso di un utente per tipo"
CREATE INDEX IF NOT EXISTS idx_consents_user_type ON consents(user_id, consent_type, created_at DESC);

-- Indice per audit: "tutti i consensi di un certo tipo"
CREATE INDEX IF NOT EXISTS idx_consents_type ON consents(consent_type, created_at DESC);

-- RLS: ogni utente vede solo i propri consensi
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

-- Policy: utenti autenticati vedono solo i propri
CREATE POLICY "Users can view own consents" ON consents
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: utenti possono inserire solo i propri
CREATE POLICY "Users can insert own consents" ON consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: admin possono vedere tutti (per audit)
CREATE POLICY "Admins can view all consents" ON consents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Funzione helper per ottenere l'ultimo consenso di un utente
CREATE OR REPLACE FUNCTION get_latest_consent(p_user_id UUID, p_consent_type TEXT)
RETURNS TABLE(granted BOOLEAN, document_version TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT c.granted, c.document_version, c.created_at
  FROM consents c
  WHERE c.user_id = p_user_id AND c.consent_type = p_consent_type
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per verificare se un utente ha tutti i consensi obbligatori
CREATE OR REPLACE FUNCTION has_required_consents(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_tos BOOLEAN;
  has_privacy BOOLEAN;
BEGIN
  SELECT granted INTO has_tos
  FROM consents
  WHERE user_id = p_user_id AND consent_type = 'tos'
  ORDER BY created_at DESC
  LIMIT 1;
  
  SELECT granted INTO has_privacy
  FROM consents
  WHERE user_id = p_user_id AND consent_type = 'privacy'
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(has_tos, false) AND COALESCE(has_privacy, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commenti per documentazione
COMMENT ON TABLE consents IS 'Log immutabile dei consensi GDPR. Ogni modifica crea un nuovo record per audit trail.';
COMMENT ON COLUMN consents.consent_type IS 'Tipo: tos (termini), privacy, marketing, cookie_analytics, cookie_all';
COMMENT ON COLUMN consents.document_version IS 'Versione del documento accettato, es. privacy_v1.0';

