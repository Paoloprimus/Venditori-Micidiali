-- ============================================================
-- FIX: Ricorsione infinita nelle RLS policy di profiles
-- Data: 2 Dicembre 2025
-- Problema: La policy "profiles_read_own_or_admin" fa SELECT su profiles
--           dentro una policy SU profiles = infinite recursion
-- ============================================================

-- 1. Prima creiamo una funzione SECURITY DEFINER che bypassa RLS
-- per verificare se l'utente corrente è admin
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Rimuoviamo la policy problematica
DROP POLICY IF EXISTS "profiles_read_own_or_admin" ON public.profiles;

-- 3. Ricreiamo policy separate che non causano ricorsione

-- Policy: ogni utente può leggere il proprio profilo
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
CREATE POLICY "profiles_read_own" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

-- Policy: admin può leggere tutti i profili (usa la funzione SECURITY DEFINER)
CREATE POLICY "profiles_admin_read_all" ON public.profiles 
  FOR SELECT USING (public.current_user_is_admin());

-- 4. Aggiorniamo anche le altre policy che potrebbero avere lo stesso problema

-- visits: admin può vedere tutte
DROP POLICY IF EXISTS "visits_admin_select" ON public.visits;
CREATE POLICY "visits_admin_select" ON public.visits
  FOR SELECT USING (public.current_user_is_admin());

-- conversations: admin può vedere tutte  
DROP POLICY IF EXISTS "conversations_admin_select" ON public.conversations;
CREATE POLICY "conversations_admin_select" ON public.conversations
  FOR SELECT USING (public.current_user_is_admin());

-- usage_tracking: admin può vedere tutto
DROP POLICY IF EXISTS "usage_admin_select" ON public.usage_tracking;
CREATE POLICY "usage_admin_select" ON public.usage_tracking
  FOR SELECT USING (public.current_user_is_admin());

-- 5. Anche la policy su consents aveva lo stesso problema
DROP POLICY IF EXISTS "Admins can view all consents" ON public.consents;
CREATE POLICY "Admins can view all consents" ON public.consents
  FOR SELECT USING (public.current_user_is_admin());

-- ============================================================
-- NOTA: Esegui questa migrazione su Supabase Dashboard:
-- SQL Editor → Incolla questo script → Run
-- ============================================================

