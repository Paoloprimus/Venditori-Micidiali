-- Migration: test_notes_admin_access
-- Permette agli admin di vedere tutte le note dei tester

-- Policy per admin: lettura di tutte le note
CREATE POLICY "Admin can view all test notes"
  ON test_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Commento
COMMENT ON POLICY "Admin can view all test notes" ON test_notes IS 'Gli admin possono vedere tutte le note di test per la dashboard feedback';
