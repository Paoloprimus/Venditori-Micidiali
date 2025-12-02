-- ============================================================================
-- MIGRAZIONE: Sistema Ruoli e Limiti di Servizio
-- Data: 2 Dicembre 2025
-- ============================================================================

-- 1. MODIFICA CONSTRAINT RUOLI su profiles
-- Rimuovo il vecchio constraint e ne creo uno nuovo
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['admin'::text, 'agente'::text, 'agente_premium'::text]));

-- Aggiorno i ruoli esistenti: 'venditore' → 'agente'
UPDATE public.profiles SET role = 'agente' WHERE role = 'venditore';

-- 2. MODIFICA INDICE ADMIN (da 1 a max 2)
DROP INDEX IF EXISTS public.one_admin_only;

-- Creo funzione per contare admin (usata nel trigger)
CREATE OR REPLACE FUNCTION public.check_max_admins()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    IF (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin' AND id != NEW.id) >= 2 THEN
      RAISE EXCEPTION 'Massimo 2 admin consentiti';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per limitare a 2 admin
DROP TRIGGER IF EXISTS trg_check_max_admins ON public.profiles;
CREATE TRIGGER trg_check_max_admins
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_admins();

-- 3. TABELLA LIMITI DI SERVIZIO
CREATE TABLE IF NOT EXISTS public.service_limits (
  role TEXT PRIMARY KEY,
  max_chat_queries_day INT NOT NULL DEFAULT 30,
  history_days INT,  -- NULL = illimitato
  max_pdf_exports_month INT,  -- NULL = illimitato
  analytics_advanced BOOLEAN NOT NULL DEFAULT false,
  driving_mode_advanced BOOLEAN NOT NULL DEFAULT false,
  detailed_reports BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Popolo i limiti
INSERT INTO public.service_limits (role, max_chat_queries_day, history_days, max_pdf_exports_month, analytics_advanced, driving_mode_advanced, detailed_reports)
VALUES 
  ('admin', 9999, NULL, NULL, true, true, true),
  ('agente', 30, 90, 3, false, false, false),
  ('agente_premium', 300, NULL, NULL, true, true, true)
ON CONFLICT (role) DO UPDATE SET
  max_chat_queries_day = EXCLUDED.max_chat_queries_day,
  history_days = EXCLUDED.history_days,
  max_pdf_exports_month = EXCLUDED.max_pdf_exports_month,
  analytics_advanced = EXCLUDED.analytics_advanced,
  driving_mode_advanced = EXCLUDED.driving_mode_advanced,
  detailed_reports = EXCLUDED.detailed_reports,
  updated_at = now();

-- 4. TABELLA USAGE TRACKING (per contare query/export)
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL,  -- 'chat_query', 'pdf_export'
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, usage_type, usage_date)
);

-- Indice per query veloci
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date 
  ON public.usage_tracking(user_id, usage_type, usage_date);

-- RLS su usage_tracking
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_select_own" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usage_insert_own" ON public.usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usage_update_own" ON public.usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. FUNZIONI HELPER per controllo limiti

-- Ottieni limiti per l'utente corrente
CREATE OR REPLACE FUNCTION public.get_my_limits()
RETURNS TABLE (
  max_chat_queries_day INT,
  history_days INT,
  max_pdf_exports_month INT,
  analytics_advanced BOOLEAN,
  driving_mode_advanced BOOLEAN,
  detailed_reports BOOLEAN
) AS $$
  SELECT 
    sl.max_chat_queries_day,
    sl.history_days,
    sl.max_pdf_exports_month,
    sl.analytics_advanced,
    sl.driving_mode_advanced,
    sl.detailed_reports
  FROM public.profiles p
  JOIN public.service_limits sl ON sl.role = p.role
  WHERE p.id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Conta uso giornaliero chat
CREATE OR REPLACE FUNCTION public.get_chat_usage_today()
RETURNS INT AS $$
  SELECT COALESCE(
    (SELECT count FROM public.usage_tracking 
     WHERE user_id = auth.uid() 
       AND usage_type = 'chat_query' 
       AND usage_date = CURRENT_DATE),
    0
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Conta export PDF del mese
CREATE OR REPLACE FUNCTION public.get_pdf_exports_this_month()
RETURNS INT AS $$
  SELECT COALESCE(
    (SELECT SUM(count)::INT FROM public.usage_tracking 
     WHERE user_id = auth.uid() 
       AND usage_type = 'pdf_export' 
       AND usage_date >= date_trunc('month', CURRENT_DATE)),
    0
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Incrementa contatore uso
CREATE OR REPLACE FUNCTION public.increment_usage(p_type TEXT)
RETURNS VOID AS $$
  INSERT INTO public.usage_tracking (user_id, usage_type, usage_date, count)
  VALUES (auth.uid(), p_type, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_type, usage_date)
  DO UPDATE SET count = usage_tracking.count + 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Verifica se può usare funzionalità
CREATE OR REPLACE FUNCTION public.can_use_feature(p_feature TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_limit INT;
  v_current INT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  
  IF v_role = 'admin' THEN
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
      
    WHEN 'analytics_advanced' THEN
      RETURN (SELECT analytics_advanced FROM public.service_limits WHERE role = v_role);
      
    WHEN 'detailed_reports' THEN
      RETURN (SELECT detailed_reports FROM public.service_limits WHERE role = v_role);
      
    ELSE
      RETURN true;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 6. RLS AGGIORNATE PER ADMIN

-- Admin può vedere TUTTI gli accounts (ma non decriptare - lato app)
DROP POLICY IF EXISTS "acc_select_own" ON public.accounts;
CREATE POLICY "acc_select_own_or_admin" ON public.accounts 
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin può vedere TUTTE le visite
DROP POLICY IF EXISTS "visits_select_own" ON public.visits;
CREATE POLICY "visits_select_own_or_admin" ON public.visits 
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin può vedere TUTTI i profili (per dashboard admin)
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
CREATE POLICY "profiles_read_own_or_admin" ON public.profiles 
  FOR SELECT USING (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin può vedere tutte le conversazioni (per audit)
DROP POLICY IF EXISTS "conv_select_own" ON public.conversations;
CREATE POLICY "conv_select_own_or_admin" ON public.conversations 
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. GRANT PERMISSIONS
GRANT SELECT ON public.service_limits TO authenticated;
GRANT ALL ON public.usage_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_limits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_usage_today() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pdf_exports_this_month() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_feature(TEXT) TO authenticated;

-- ============================================================================
-- FINE MIGRAZIONE
-- ============================================================================

