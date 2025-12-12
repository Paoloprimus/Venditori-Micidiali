-- ============================================================================
-- MIGRAZIONE: Allineamento Piani con Sito reping.it
-- Data: 11 Dicembre 2025
-- ============================================================================
-- Ruoli finali:
--   admin     = Amministratori (tutto illimitato)
--   tester    = Collaboratori che testano gratis (= Business completo)
--   premium   = Piano €49/mese (ex agente_premium con limiti rivisti)
--   business  = Piano €99/mese (tutto illimitato + Guida)
-- ============================================================================

-- 1. AGGIUNGI COLONNA max_clients a service_limits
ALTER TABLE public.service_limits 
  ADD COLUMN IF NOT EXISTS max_clients INT;

-- 2. AGGIORNA CONSTRAINT RUOLI su profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['admin'::text, 'tester'::text, 'premium'::text, 'business'::text]));

-- 3. MIGRA RUOLI ESISTENTI
-- agente → premium (chi era base diventa premium)
UPDATE public.profiles SET role = 'premium' WHERE role = 'agente';
-- agente_premium → business (chi era premium diventa business)
UPDATE public.profiles SET role = 'business' WHERE role = 'agente_premium';

-- 4. AGGIORNA/INSERISCI LIMITI DI SERVIZIO
-- Elimina vecchi record
DELETE FROM public.service_limits WHERE role IN ('agente', 'agente_premium');

-- Inserisci nuovi limiti allineati al sito
INSERT INTO public.service_limits (
  role, 
  max_chat_queries_day, 
  history_days, 
  max_pdf_exports_month, 
  analytics_advanced, 
  driving_mode_advanced, 
  detailed_reports,
  max_clients
)
VALUES 
  -- Admin: tutto illimitato
  ('admin', 9999, NULL, NULL, true, true, true, 9999),
  
  -- Tester: come Business (per collaboratori che testano gratis)
  ('tester', 9999, NULL, NULL, true, true, true, 1000),
  
  -- Premium €49/mese: limiti come da sito
  ('premium', 60, 90, 9, false, false, false, 500),
  
  -- Business €99/mese: tutto illimitato + Guida + Analytics
  ('business', 9999, NULL, NULL, true, true, true, 1000)

ON CONFLICT (role) DO UPDATE SET
  max_chat_queries_day = EXCLUDED.max_chat_queries_day,
  history_days = EXCLUDED.history_days,
  max_pdf_exports_month = EXCLUDED.max_pdf_exports_month,
  analytics_advanced = EXCLUDED.analytics_advanced,
  driving_mode_advanced = EXCLUDED.driving_mode_advanced,
  detailed_reports = EXCLUDED.detailed_reports,
  max_clients = EXCLUDED.max_clients,
  updated_at = now();

-- 5. AGGIORNA FUNZIONE get_my_limits PER INCLUDERE max_clients
CREATE OR REPLACE FUNCTION public.get_my_limits()
RETURNS TABLE (
  max_chat_queries_day INT,
  history_days INT,
  max_pdf_exports_month INT,
  analytics_advanced BOOLEAN,
  driving_mode_advanced BOOLEAN,
  detailed_reports BOOLEAN,
  max_clients INT
) AS $$
  SELECT 
    sl.max_chat_queries_day,
    sl.history_days,
    sl.max_pdf_exports_month,
    sl.analytics_advanced,
    sl.driving_mode_advanced,
    sl.detailed_reports,
    sl.max_clients
  FROM public.profiles p
  JOIN public.service_limits sl ON sl.role = p.role
  WHERE p.id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 6. NUOVA FUNZIONE: Conta clienti utente
CREATE OR REPLACE FUNCTION public.get_my_clients_count()
RETURNS INT AS $$
  SELECT COUNT(*)::INT FROM public.accounts WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 7. AGGIORNA can_use_feature PER INCLUDERE max_clients
CREATE OR REPLACE FUNCTION public.can_use_feature(p_feature TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_limit INT;
  v_current INT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  
  IF v_role = 'admin' OR v_role = 'tester' THEN
    RETURN true;
  END IF;
  
  CASE p_feature
    WHEN 'chat_query' THEN
      SELECT max_chat_queries_day INTO v_limit FROM public.service_limits WHERE role = v_role;
      SELECT get_chat_usage_today() INTO v_current;
      RETURN v_current < v_limit;
      
    WHEN 'pdf_export' THEN
      SELECT max_pdf_exports_month INTO v_limit FROM public.service_limits WHERE role = v_role;
      IF v_limit IS NULL THEN RETURN true; END IF;
      SELECT get_pdf_exports_this_month() INTO v_current;
      RETURN v_current < v_limit;
      
    WHEN 'add_client' THEN
      SELECT max_clients INTO v_limit FROM public.service_limits WHERE role = v_role;
      IF v_limit IS NULL THEN RETURN true; END IF;
      SELECT get_my_clients_count() INTO v_current;
      RETURN v_current < v_limit;
      
    WHEN 'analytics_advanced' THEN
      RETURN (SELECT analytics_advanced FROM public.service_limits WHERE role = v_role);
      
    WHEN 'driving_mode' THEN
      RETURN (SELECT driving_mode_advanced FROM public.service_limits WHERE role = v_role);
      
    WHEN 'detailed_reports' THEN
      RETURN (SELECT detailed_reports FROM public.service_limits WHERE role = v_role);
      
    ELSE
      RETURN true;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 8. GRANT NUOVA FUNZIONE
GRANT EXECUTE ON FUNCTION public.get_my_clients_count() TO authenticated;

-- 9. COMMENTI
COMMENT ON COLUMN public.service_limits.max_clients IS 'Numero massimo di clienti consentiti per piano';

-- ============================================================================
-- RIEPILOGO PIANI:
-- ============================================================================
-- | Ruolo    | Prezzo   | Clienti | Query | Storico | PDF   | Guida | Analytics |
-- |----------|----------|---------|-------|---------|-------|-------|-----------|
-- | admin    | -        | ∞       | ∞     | ∞       | ∞     | ✅    | ✅        |
-- | tester   | GRATIS   | 1000    | ∞     | ∞       | ∞     | ✅    | ✅        |
-- | premium  | €49/mese | 500     | 60/g  | 90gg    | 9/m   | ❌    | ❌        |
-- | business | €99/mese | 1000    | ∞     | ∞       | ∞     | ✅    | ✅        |
-- ============================================================================
