-- ============================================================================
-- MIGRAZIONE: Sistema Broadcast Messaggi per Tester Beta
-- Data: 14 Dicembre 2025
-- ============================================================================
-- Permette agli admin di inviare messaggi broadcast a tutti i tester
-- I messaggi vengono mostrati come toast al prossimo accesso
-- ============================================================================

-- 1. CREA TABELLA broadcast_messages
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  target_roles TEXT[] DEFAULT ARRAY['tester', 'premium', 'business'], -- Chi deve vedere il messaggio
  expires_at TIMESTAMPTZ, -- NULL = non scade mai
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREA TABELLA broadcast_messages_read (traccia chi ha già letto)
CREATE TABLE IF NOT EXISTS public.broadcast_messages_read (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id) -- Un utente può leggere un messaggio solo una volta
);

-- 3. INDICI per performance
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created_at 
  ON public.broadcast_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_expires_at 
  ON public.broadcast_messages(expires_at);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_read_user 
  ON public.broadcast_messages_read(user_id);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_read_message 
  ON public.broadcast_messages_read(message_id);

-- 4. RLS POLICIES

-- Admin può vedere, creare, modificare, cancellare tutti i messaggi
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to broadcast_messages"
  ON public.broadcast_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Gli utenti possono vedere solo i messaggi destinati al loro ruolo e non scaduti
CREATE POLICY "Users can read non-expired messages for their role"
  ON public.broadcast_messages
  FOR SELECT
  USING (
    -- Messaggio destinato al ruolo dell'utente
    (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = ANY(target_roles)
    AND
    -- Messaggio non scaduto
    (expires_at IS NULL OR expires_at > NOW())
  );

-- RLS per broadcast_messages_read
ALTER TABLE public.broadcast_messages_read ENABLE ROW LEVEL SECURITY;

-- Gli utenti possono vedere solo i propri record di lettura
CREATE POLICY "Users can read their own read records"
  ON public.broadcast_messages_read
  FOR SELECT
  USING (user_id = auth.uid());

-- Gli utenti possono inserire solo i propri record di lettura
CREATE POLICY "Users can insert their own read records"
  ON public.broadcast_messages_read
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admin può vedere tutti i record di lettura
CREATE POLICY "Admin can read all read records"
  ON public.broadcast_messages_read
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. TRIGGER per updated_at
CREATE OR REPLACE FUNCTION public.update_broadcast_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_broadcast_messages_updated_at
  BEFORE UPDATE ON public.broadcast_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_broadcast_messages_updated_at();

-- 6. COMMENTI
COMMENT ON TABLE public.broadcast_messages IS 
  'Messaggi broadcast inviati dagli admin ai tester/utenti durante beta testing';

COMMENT ON TABLE public.broadcast_messages_read IS 
  'Traccia quali utenti hanno già letto quali messaggi';

COMMENT ON COLUMN public.broadcast_messages.target_roles IS 
  'Array di ruoli che devono vedere il messaggio (es: [''tester'', ''premium''])';

COMMENT ON COLUMN public.broadcast_messages.expires_at IS 
  'Data/ora di scadenza messaggio. NULL = mai scade';

-- ============================================================================
-- FINE MIGRAZIONE
-- ============================================================================

