-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: Visits + Notes per utente esistente
-- ═══════════════════════════════════════════════════════════════════════════
-- Hai: 94 accounts, 329 products, 0 visits, 0 notes
-- Serve: 400+ visits, 50+ notes
-- ═══════════════════════════════════════════════════════════════════════════

-- STEP 1: Verifica/popola campi type e city su accounts
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE accounts 
SET type = (ARRAY['Bar', 'Ristorante', 'Hotel', 'Pizzeria', 'Enoteca', 'Pub', 'Caffè', 'Trattoria'])[1 + floor(random()*8)::int]
WHERE type IS NULL OR type = '';

UPDATE accounts 
SET city = (ARRAY['Milano', 'Roma', 'Verona', 'Bologna', 'Torino', 'Firenze', 'Napoli', 'Padova', 'Brescia', 'Bergamo'])[1 + floor(random()*10)::int]
WHERE city IS NULL OR city = '';

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Genera VISITS (400+ distribuite su 12 mesi)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_account RECORD;
  v_visit_date DATE;
  v_importo NUMERIC;
  v_prodotti TEXT;
  v_tipo TEXT;
  v_products TEXT[] := ARRAY['Chianti', 'Prosecco', 'Peroni', 'Moretti', 'Aperol', 'Campari', 'Grappa', 'Limoncello', 'Birra IPA', 'Vino Rosso', 'Vino Bianco', 'Spritz', 'Negroni', 'Gin Tonic'];
  v_j INT;
  v_visits_per_client INT;
  v_total_visits INT := 0;
BEGIN
  -- Per ogni cliente
  FOR v_account IN 
    SELECT id, user_id, created_at FROM accounts ORDER BY random()
  LOOP
    -- Numero visite per cliente: 3-7 (media ~5)
    v_visits_per_client := 3 + floor(random() * 5)::INT;
    
    FOR v_j IN 1..v_visits_per_client LOOP
      -- Data visita: distribuita negli ultimi 12 mesi
      v_visit_date := CURRENT_DATE - (floor(random() * 365)::INT);
      
      -- Alcune visite concentrate negli ultimi 3 mesi (più recenti)
      IF v_j <= 2 THEN
        v_visit_date := CURRENT_DATE - (floor(random() * 90)::INT);
      END IF;
      
      -- ~70% visite con vendita
      IF random() < 0.7 THEN
        v_importo := 50 + floor(random() * 950)::NUMERIC; -- €50-€1000
        v_prodotti := v_products[1 + floor(random() * 14)::INT];
        -- 40% delle vendite hanno più prodotti
        IF random() > 0.6 THEN
          v_prodotti := v_prodotti || ', ' || v_products[1 + floor(random() * 14)::INT];
        END IF;
      ELSE
        v_importo := 0;
        v_prodotti := NULL;
      END IF;
      
      -- Tipo visita: 80% visita, 15% telefonata, 5% richiamo
      v_tipo := CASE 
        WHEN random() < 0.80 THEN 'visita'
        WHEN random() < 0.95 THEN 'telefonata'
        ELSE 'richiamo'
      END;
      
      INSERT INTO visits (
        user_id,
        account_id,
        data_visita,
        importo_vendita,
        prodotti_discussi,
        tipo,
        created_at
      ) VALUES (
        v_account.user_id,
        v_account.id,
        v_visit_date,
        v_importo,
        v_prodotti,
        v_tipo,
        v_visit_date::TIMESTAMP + (random() * INTERVAL '8 hours') + INTERVAL '9 hours'
      );
      
      v_total_visits := v_total_visits + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Inserite % visite di test', v_total_visits;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Genera NOTES (60 note distribuite sui clienti)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_account RECORD;
  v_note_bodies TEXT[] := ARRAY[
    'Cliente interessato a nuovi vini biologici. Richiamare settimana prossima.',
    'Ordina regolarmente ogni 2 settimane. Preferisce Prosecco e Chianti.',
    'Problemi con ultima consegna, da sistemare urgentemente.',
    'Vuole provare la nuova IPA artigianale, portare campioni.',
    'Richiesta preventivo per evento privato 50 persone.',
    'Pagamenti sempre puntuali. Cliente molto affidabile.',
    'Interessato alla promozione birre estive.',
    'Chiede sconto 10% per ordini superiori a €500.',
    'Da visitare prima delle feste natalizie.',
    'Competitor ha proposto prezzi più bassi. Valutare contro-offerta.',
    'Locale in ristrutturazione. Riapertura prevista marzo.',
    'Nuova gestione dal mese scorso. Presentarsi nuovamente.',
    'Ottimo rapporto. Può essere referenza per altri locali zona.',
    'Richiede consegne solo martedì e giovedì mattina.',
    'Interesse per corso degustazione vini per staff.',
    'Preferisce comunicazione via WhatsApp.',
    'Budget mensile circa €800-1000.',
    'Sta valutando cambio fornitore spirits.',
    'Compleanno titolare a gennaio, ricordare omaggio.',
    'Terrazza estiva apre a maggio, aumenterà ordini.'
  ];
  v_i INT := 0;
BEGIN
  -- Inserisci note su ~60% dei clienti
  FOR v_account IN 
    SELECT id FROM accounts ORDER BY random() LIMIT 60
  LOOP
    v_i := v_i + 1;
    
    INSERT INTO notes (
      account_id,
      body,
      created_at
    ) VALUES (
      v_account.id,
      v_note_bodies[1 + (v_i % 20)],
      NOW() - (random() * 180 * INTERVAL '1 day')
    );
    
    -- Alcuni clienti hanno 2 note
    IF random() > 0.7 THEN
      INSERT INTO notes (
        account_id,
        body,
        created_at
      ) VALUES (
        v_account.id,
        v_note_bodies[1 + ((v_i + 7) % 20)],
        NOW() - (random() * 90 * INTERVAL '1 day')
      );
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Inserite note di test';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Verifica risultati
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '📊 DATI DOPO SEED' as info;

SELECT 'ACCOUNTS' as tabella, COUNT(*) as totale FROM accounts
UNION ALL
SELECT 'VISITS', COUNT(*) FROM visits
UNION ALL
SELECT 'PRODUCTS', COUNT(*) FROM products
UNION ALL
SELECT 'NOTES', COUNT(*) FROM notes;

-- Distribuzione visite per mese (ultimi 6)
SELECT '📅 VISITE PER MESE' as info;

SELECT 
  TO_CHAR(data_visita, 'YYYY-MM') as mese,
  COUNT(*) as visite,
  COUNT(*) FILTER (WHERE importo_vendita > 0) as con_vendita,
  ROUND(AVG(importo_vendita) FILTER (WHERE importo_vendita > 0)::NUMERIC, 0) as media_euro
FROM visits 
GROUP BY TO_CHAR(data_visita, 'YYYY-MM')
ORDER BY mese DESC
LIMIT 6;

-- Distribuzione clienti per tipo
SELECT '🏪 CLIENTI PER TIPO' as info;
SELECT type, COUNT(*) as totale FROM accounts WHERE type IS NOT NULL GROUP BY type ORDER BY totale DESC;

-- Distribuzione clienti per città
SELECT '📍 CLIENTI PER CITTÀ' as info;
SELECT city, COUNT(*) as totale FROM accounts WHERE city IS NOT NULL GROUP BY city ORDER BY totale DESC LIMIT 10;

