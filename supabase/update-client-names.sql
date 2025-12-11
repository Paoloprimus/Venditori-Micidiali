-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT: Aggiorna nomi clienti con nomi italiani realistici
-- ═══════════════════════════════════════════════════════════════════════════
-- Mantiene tutti i dati (visite, vendite, note) - cambia solo il nome
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_account RECORD;
  v_counter INT := 0;
  v_new_name TEXT;
  
  -- Nomi realistici di locali italiani
  v_prefixes TEXT[] := ARRAY[
    'Bar', 'Caffè', 'Osteria', 'Trattoria', 'Ristorante', 'Pizzeria', 
    'Enoteca', 'Pub', 'Birreria', 'Taverna', 'Locanda', 'Bottega'
  ];
  
  v_names TEXT[] := ARRAY[
    -- Nomi classici
    'Centrale', 'Italia', 'Roma', 'Milano', 'Napoli', 'Sport',
    'del Corso', 'della Piazza', 'del Porto', 'della Stazione',
    -- Nomi con "da" 
    'da Mario', 'da Gino', 'da Franco', 'da Piero', 'da Luigi',
    'da Enzo', 'da Nino', 'da Toni', 'da Beppe', 'da Sergio',
    -- Nomi con articolo
    'Il Gallo', 'La Pergola', 'Il Sole', 'La Luna', 'Il Ritrovo',
    'La Fontana', 'Il Vecchio Mulino', 'La Cantina', 'Il Forno', 'La Botte',
    -- Nomi geografici
    'Veneto', 'Toscano', 'Siciliano', 'Alpino', 'Adriatico',
    -- Nomi evocativi
    'Bella Vista', 'Buon Gusto', 'Sapori Antichi', 'Tre Archi', 'Due Torri',
    'Quattro Stagioni', 'Angolo Verde', 'Stella d''Oro', 'Corona', 'Aurora'
  ];
  
  v_prefix TEXT;
  v_name TEXT;
  
BEGIN
  FOR v_account IN 
    SELECT id, name FROM accounts ORDER BY created_at
  LOOP
    v_counter := v_counter + 1;
    
    -- Scegli prefisso e nome randomicamente
    v_prefix := v_prefixes[1 + floor(random() * array_length(v_prefixes, 1))::int];
    v_name := v_names[1 + floor(random() * array_length(v_names, 1))::int];
    
    -- Combina: "Bar Centrale", "Trattoria da Mario", ecc.
    v_new_name := v_prefix || ' ' || v_name;
    
    -- Aggiorna il nome
    UPDATE accounts 
    SET name = v_new_name, updated_at = NOW()
    WHERE id = v_account.id;
    
    RAISE NOTICE 'Cliente %: % → %', v_counter, v_account.name, v_new_name;
  END LOOP;
  
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE 'Aggiornati % clienti con nomi italiani realistici', v_counter;
  RAISE NOTICE '══════════════════════════════════════════════════';
END $$;

-- Verifica risultato
SELECT name, city, type FROM accounts ORDER BY name LIMIT 20;

