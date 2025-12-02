-- ============================================================
-- MIGRAZIONE: Sistema Beta Tokens per accesso su invito
-- Data: 2 Dicembre 2025
-- ============================================================

-- 1. AGGIUNGI RUOLO TESTER
-- Modifica il constraint per includere 'tester'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['admin'::text, 'agente'::text, 'agente_premium'::text, 'tester'::text]));

-- 2. TABELLA BETA TOKENS
CREATE TABLE IF NOT EXISTS public.beta_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,              -- es. "BETA-A1B2C3D4"
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  note TEXT,                                -- es. "Per Mario Rossi"
  
  -- Token può essere usato una sola volta
  CONSTRAINT token_used_once CHECK (
    (used_by IS NULL AND used_at IS NULL) OR 
    (used_by IS NOT NULL AND used_at IS NOT NULL)
  )
);

-- 3. INDICI
CREATE INDEX IF NOT EXISTS idx_beta_tokens_token ON public.beta_tokens(token);
CREATE INDEX IF NOT EXISTS idx_beta_tokens_used_by ON public.beta_tokens(used_by);

-- 4. RLS
ALTER TABLE public.beta_tokens ENABLE ROW LEVEL SECURITY;

-- Solo admin può vedere tutti i token
CREATE POLICY "admin_manage_tokens" ON public.beta_tokens
  FOR ALL USING (public.current_user_is_admin());

-- Utenti non autenticati possono verificare se un token esiste e non è usato
-- (necessario per il form di signup)
CREATE POLICY "anon_check_token" ON public.beta_tokens
  FOR SELECT USING (true);  -- Tutti possono leggere (ma solo token, non dati sensibili)

-- 5. FUNZIONE PER GENERARE TOKEN
CREATE OR REPLACE FUNCTION public.generate_beta_token(p_note TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_user_id UUID;
BEGIN
  -- Verifica che sia admin
  v_user_id := auth.uid();
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo gli admin possono generare token';
  END IF;
  
  -- Genera token unico (BETA-XXXXXXXX)
  v_token := 'BETA-' || upper(substr(md5(random()::text), 1, 8));
  
  -- Inserisci
  INSERT INTO public.beta_tokens (token, created_by, note)
  VALUES (v_token, v_user_id, p_note);
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNZIONE PER VALIDARE E USARE TOKEN
CREATE OR REPLACE FUNCTION public.use_beta_token(p_token TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_token_id UUID;
BEGIN
  -- Cerca token valido (non usato, non scaduto)
  SELECT id INTO v_token_id
  FROM public.beta_tokens
  WHERE token = upper(trim(p_token))
    AND used_by IS NULL
    AND expires_at > now();
  
  IF v_token_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Marca come usato
  UPDATE public.beta_tokens
  SET used_by = p_user_id, used_at = now()
  WHERE id = v_token_id;
  
  -- Imposta ruolo tester sul profilo
  UPDATE public.profiles
  SET role = 'tester'
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNZIONE PER VERIFICARE TOKEN (senza usarlo)
CREATE OR REPLACE FUNCTION public.check_beta_token(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.beta_tokens
    WHERE token = upper(trim(p_token))
      AND used_by IS NULL
      AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. GRANT
GRANT SELECT ON public.beta_tokens TO anon;
GRANT SELECT ON public.beta_tokens TO authenticated;
GRANT ALL ON public.beta_tokens TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_beta_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_beta_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_beta_token TO anon;
GRANT EXECUTE ON FUNCTION public.check_beta_token TO authenticated;

-- ============================================================
-- NOTA: Dopo aver eseguito questa migrazione, devi:
-- 1. Aggiungere il tuo user_id in global_admins (se non già fatto)
-- 2. Generare i primi token con: SELECT generate_beta_token('Nota');
-- ============================================================

