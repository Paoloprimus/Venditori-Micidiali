-- rimuovi quelle aperte, se presenti
DROP POLICY IF EXISTS "accounts_select_authenticated" ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert_authenticated" ON public.accounts;

-- permetti SELECT solo al proprietario
CREATE POLICY IF NOT EXISTS "accounts_select_owner"
ON public.accounts
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- permetti INSERT solo se la riga è del proprietario (il trigger la imposta)
CREATE POLICY IF NOT EXISTS "accounts_insert_owner"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());
