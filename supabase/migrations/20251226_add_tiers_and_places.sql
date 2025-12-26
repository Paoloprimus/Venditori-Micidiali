-- ============================================================================
-- MIGRAZIONE: Sistema Places per REPING COPILOT
-- Data: 26 Dicembre 2025
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. AGGIORNA RUOLI (aggiungi agente_premium_plus)
-- ═══════════════════════════════════════════════════════════════════════════

-- Rimuovo il vecchio constraint e ne creo uno nuovo con il ruolo extra
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY[
    'admin'::text, 
    'agente'::text,              -- FREE
    'agente_premium'::text,       -- PREMIUM €9
    'agente_premium_plus'::text,  -- PREMIUM+ €29
    'tester'::text
  ]));

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. AGGIORNA SERVICE_LIMITS
-- ═══════════════════════════════════════════════════════════════════════════

-- Aggiungi nuove colonne per places limits
ALTER TABLE public.service_limits 
  ADD COLUMN IF NOT EXISTS max_active_places INT DEFAULT 100,  -- POI attivi (visitati/note/itinerari)
  ADD COLUMN IF NOT EXISTS provinces_limit INT DEFAULT 1,       -- NULL = illimitate
  ADD COLUMN IF NOT EXISTS napoleon_enabled BOOLEAN DEFAULT true;

-- NOTA: max_routes NON serve, itinerari sono liberi per tutti
-- NOTA: max_active_places ≠ limite download POI pubblici (da definire separatamente)

-- Aggiorna i limiti esistenti e aggiungi agente_premium_plus
-- REPING COPILOT tiers:
INSERT INTO public.service_limits (
  role, 
  max_chat_queries_day, 
  history_days, 
  max_pdf_exports_month, 
  analytics_advanced, 
  driving_mode_advanced, 
  detailed_reports,
  max_active_places,
  provinces_limit,
  napoleon_enabled
)
VALUES 
  -- FREE (agente) - 5 AI msg/day, 1 provincia, 100 POI attivi, Napoleon SI
  ('agente', 5, 90, 3, false, false, false, 100, 1, true),
  
  -- PREMIUM (agente_premium) - 20 AI msg/day, 1 provincia, 200 POI attivi, Napoleon SI
  ('agente_premium', 20, NULL, 10, true, true, true, 200, 1, true),
  
  -- PREMIUM+ (agente_premium_plus) - token TBD, province libere, 2000 POI attivi, Napoleon SI
  ('agente_premium_plus', 100, NULL, NULL, true, true, true, 2000, NULL, true),
  
  -- Admin - tutto illimitato
  ('admin', 9999, NULL, NULL, true, true, true, 999999, NULL, true)
  
ON CONFLICT (role) DO UPDATE SET
  max_chat_queries_day = EXCLUDED.max_chat_queries_day,
  history_days = EXCLUDED.history_days,
  max_pdf_exports_month = EXCLUDED.max_pdf_exports_month,
  analytics_advanced = EXCLUDED.analytics_advanced,
  driving_mode_advanced = EXCLUDED.driving_mode_advanced,
  detailed_reports = EXCLUDED.detailed_reports,
  max_active_places = EXCLUDED.max_active_places,
  provinces_limit = EXCLUDED.provinces_limit,
  napoleon_enabled = EXCLUDED.napoleon_enabled,
  updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CREA TABELLA PLACES (POI pubblici HoReCa)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT,
  indirizzo_stradale TEXT,
  comune TEXT,
  provincia TEXT,
  cap TEXT,
  lat DECIMAL(10,8) NOT NULL,
  lon DECIMAL(11,8) NOT NULL,
  telefono TEXT,
  website TEXT,
  email TEXT,
  opening_hours TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- 'osm', 'wikidata', 'manual', 'user'
  verified BOOLEAN DEFAULT false,
  flag_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per query geografiche e ricerca
CREATE INDEX IF NOT EXISTS places_comune_idx ON public.places(lower(comune));
CREATE INDEX IF NOT EXISTS places_provincia_idx ON public.places(provincia);
CREATE INDEX IF NOT EXISTS places_tipo_idx ON public.places(tipo);
CREATE INDEX IF NOT EXISTS places_lat_lon_idx ON public.places(lat, lon);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. CREA TABELLA USER_SELECTED_PLACES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_selected_places (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_visited TIMESTAMPTZ,
  PRIMARY KEY (user_id, place_id)
);

CREATE INDEX IF NOT EXISTS user_selected_places_user_idx ON public.user_selected_places(user_id);
CREATE INDEX IF NOT EXISTS user_selected_places_place_idx ON public.user_selected_places(place_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. CREA TABELLA USER_ROUTES (itinerari - senza limiti)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descrizione TEXT,
  places_sequence UUID[] NOT NULL, -- Array di place_id in ordine
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_routes_user_idx ON public.user_routes(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. CREA TABELLA PLACES_CHANGELOG (audit log)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.places_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'flagged', 'verified', 'deleted')),
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS places_changelog_place_idx ON public.places_changelog(place_id);
CREATE INDEX IF NOT EXISTS places_changelog_created_idx ON public.places_changelog(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. TRIGGERS PER UPDATED_AT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TRIGGER places_set_updated_at 
  BEFORE UPDATE ON public.places 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_routes_set_updated_at 
  BEFORE UPDATE ON public.user_routes 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_selected_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_changelog ENABLE ROW LEVEL SECURITY;

-- Places: tutti possono leggere, autenticati possono flaggare
CREATE POLICY "places_select_all" ON public.places
  FOR SELECT USING (true);

CREATE POLICY "places_update_flag" ON public.places
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- User selected places: solo propri
CREATE POLICY "user_selected_places_select_own" ON public.user_selected_places
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_selected_places_insert_own" ON public.user_selected_places
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_selected_places_delete_own" ON public.user_selected_places
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "user_selected_places_update_own" ON public.user_selected_places
  FOR UPDATE USING (auth.uid() = user_id);

-- User routes: solo propri (nessun limite)
CREATE POLICY "user_routes_select_own" ON public.user_routes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_routes_insert_own" ON public.user_routes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_routes_delete_own" ON public.user_routes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "user_routes_update_own" ON public.user_routes
  FOR UPDATE USING (auth.uid() = user_id);

-- Changelog: tutti possono leggere
CREATE POLICY "places_changelog_select_all" ON public.places_changelog
  FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. FUNZIONI HELPER
-- ═══════════════════════════════════════════════════════════════════════════

-- Conta luoghi selezionati dall'utente
CREATE OR REPLACE FUNCTION public.get_selected_places_count()
RETURNS INT AS $$
  SELECT COUNT(*)::INT 
  FROM public.user_selected_places 
  WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verifica se può aggiungere luoghi ATTIVI (controlla limite POI attivi)
CREATE OR REPLACE FUNCTION public.can_add_active_place()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_limit INT;
  v_current INT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  SELECT max_active_places INTO v_limit FROM public.service_limits WHERE role = v_role;
  SELECT get_selected_places_count() INTO v_current;
  RETURN v_current < v_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Ottieni province disponibili per l'utente
CREATE OR REPLACE FUNCTION public.get_available_provinces()
RETURNS TABLE (
  provinces_limit INT,
  is_unlimited BOOLEAN
) AS $$
DECLARE
  v_role TEXT;
  v_limit INT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  SELECT sl.provinces_limit INTO v_limit FROM public.service_limits sl WHERE sl.role = v_role;
  
  RETURN QUERY SELECT 
    COALESCE(v_limit, 999999) as provinces_limit,
    (v_limit IS NULL) as is_unlimited;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. GRANT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT SELECT ON public.places TO anon, authenticated;
GRANT UPDATE (flag_count) ON public.places TO authenticated;

GRANT ALL ON public.user_selected_places TO authenticated;
GRANT ALL ON public.user_routes TO authenticated;
GRANT SELECT ON public.places_changelog TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_selected_places_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_active_place() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_provinces() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. COMMENTI DOCUMENTAZIONE
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.places IS 'Database pubblico POI HoReCa (bar, ristoranti, caffè) - visibile a tutti';
COMMENT ON TABLE public.user_selected_places IS 'POI ATTIVI dell utente (visitati, con note, in itinerari) - QUESTI hanno il limite per tier';
COMMENT ON TABLE public.user_routes IS 'Itinerari/percorsi creati dagli utenti (senza limiti di numero)';
COMMENT ON TABLE public.places_changelog IS 'Audit log modifiche ai POI';

COMMENT ON COLUMN public.service_limits.max_active_places IS 'Limite POI ATTIVI (visitati/note/itinerari): FREE=100, PREMIUM=200, PREMIUM+=2000. NON è il limite di visualizzazione!';
COMMENT ON COLUMN public.service_limits.provinces_limit IS 'Limite province accessibili: 1 per FREE/PREMIUM, NULL (illimitato) per PREMIUM+';
COMMENT ON COLUMN public.service_limits.napoleon_enabled IS 'Napoleon attivo per tutti i tier COPILOT';

-- ============================================================================
-- RIEPILOGO TIER REPING COPILOT:
-- 
-- | Tier       | Ruolo               | €/mese | AI msg/g | Province | POI ATTIVI* | Itinerari | Napoleon |
-- |------------|---------------------|--------|----------|----------|-------------|-----------|----------|
-- | FREE       | agente              | 0      | 5        | 1        | 100         | ∞         | ✅       |
-- | PREMIUM    | agente_premium      | 9      | 20       | 1        | 200         | ∞         | ✅       |
-- | PREMIUM+   | agente_premium_plus | 29     | TBD      | ∞        | 2000        | ∞         | ✅       |
-- 
-- * POI ATTIVI = luoghi visitati, con note, o inseriti in itinerari
--   (NON è il limite di visualizzazione/download dalla lista pubblica)
-- 
-- ============================================================================
