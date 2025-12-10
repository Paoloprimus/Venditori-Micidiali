-- ═══════════════════════════════════════════════════════════════════════════
-- REPPING SEED DATA
-- Dati di test per verificare tutti gli intent NLU (107 test)
-- ═══════════════════════════════════════════════════════════════════════════
-- IMPORTANTE: Eseguire dopo aver creato un utente di test
-- Sostituire 'YOUR_USER_ID' con l'UUID del tuo utente
-- ═══════════════════════════════════════════════════════════════════════════

-- Prima di eseguire, imposta la variabile:
-- \set user_id 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. PRODUCTS (50 prodotti)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO products (codice, descrizione_articolo, title, base_price, unita_misura, giacenza, is_active) VALUES
-- Vini
('VINO001', 'Chianti Classico DOCG 2021', 'Chianti Classico', 12.50, 'BT', 150, true),
('VINO002', 'Brunello di Montalcino 2019', 'Brunello Montalcino', 45.00, 'BT', 48, true),
('VINO003', 'Prosecco DOC Extra Dry', 'Prosecco DOC', 8.90, 'BT', 200, true),
('VINO004', 'Amarone della Valpolicella', 'Amarone', 38.00, 'BT', 35, true),
('VINO005', 'Barolo DOCG 2018', 'Barolo', 52.00, 'BT', 25, true),
('VINO006', 'Pinot Grigio Alto Adige', 'Pinot Grigio', 9.50, 'BT', 180, true),
('VINO007', 'Vermentino di Sardegna', 'Vermentino', 11.00, 'BT', 90, true),
('VINO008', 'Nero d''Avola Sicilia', 'Nero d''Avola', 7.80, 'BT', 220, true),
('VINO009', 'Franciacorta Brut DOCG', 'Franciacorta', 22.00, 'BT', 60, true),
('VINO010', 'Lambrusco Emilia IGT', 'Lambrusco', 5.50, 'BT', 300, true),
-- Birre
('BIRRA001', 'Peroni Gran Riserva 33cl', 'Peroni Gran Riserva', 2.20, 'BT', 500, true),
('BIRRA002', 'Moretti La Rossa 33cl', 'Moretti Rossa', 1.80, 'BT', 400, true),
('BIRRA003', 'IPA Artigianale 50cl', 'IPA Artigianale', 4.50, 'BT', 120, true),
('BIRRA004', 'Weizen Tedesca 50cl', 'Weizen', 3.80, 'BT', 80, true),
('BIRRA005', 'Lager Premium 33cl', 'Lager Premium', 1.50, 'BT', 600, true),
('BIRRA006', 'Stout Irlandese 33cl', 'Stout', 3.20, 'BT', 95, true),
('BIRRA007', 'Pilsner Ceca 50cl', 'Pilsner', 2.90, 'BT', 150, true),
('BIRRA008', 'Birra Biologica 33cl', 'Bio Beer', 3.50, 'BT', 70, true),
-- Spirits
('SPIRIT001', 'Grappa di Moscato', 'Grappa Moscato', 18.00, 'BT', 45, true),
('SPIRIT002', 'Limoncello Amalfi', 'Limoncello', 14.00, 'BT', 80, true),
('SPIRIT003', 'Amaro del Capo', 'Amaro del Capo', 12.50, 'BT', 100, true),
('SPIRIT004', 'Vodka Premium', 'Vodka Premium', 22.00, 'BT', 55, true),
('SPIRIT005', 'Gin London Dry', 'Gin London', 28.00, 'BT', 40, true),
('SPIRIT006', 'Rum Agricolo', 'Rum Agricolo', 32.00, 'BT', 30, true),
('SPIRIT007', 'Whisky Single Malt', 'Whisky Malt', 45.00, 'BT', 25, true),
('SPIRIT008', 'Aperol', 'Aperol', 11.00, 'BT', 150, true),
('SPIRIT009', 'Campari', 'Campari', 13.00, 'BT', 120, true),
('SPIRIT010', 'Fernet Branca', 'Fernet', 16.00, 'BT', 85, true),
-- Analcolici
('ANAL001', 'Acqua Minerale 1L', 'Acqua Minerale', 0.80, 'BT', 1000, true),
('ANAL002', 'Coca Cola 33cl', 'Coca Cola', 1.50, 'CL', 800, true),
('ANAL003', 'Aranciata San Pellegrino', 'Aranciata', 1.80, 'CL', 400, true),
('ANAL004', 'Tonica Schweppes', 'Tonica', 1.60, 'CL', 350, true),
('ANAL005', 'Succo ACE 200ml', 'Succo ACE', 1.20, 'PZ', 500, true),
-- Food
('FOOD001', 'Olive Ascolane 1kg', 'Olive Ascolane', 12.00, 'KG', 50, true),
('FOOD002', 'Patatine Premium 1kg', 'Patatine', 8.50, 'KG', 100, true),
('FOOD003', 'Noccioline Salate 500g', 'Noccioline', 6.00, 'PZ', 150, true),
('FOOD004', 'Taralli Pugliesi 1kg', 'Taralli', 7.50, 'KG', 80, true),
('FOOD005', 'Bruschette Pomodoro', 'Bruschette', 5.50, 'PZ', 200, true),
-- Accessori
('ACC001', 'Bicchiere Vino 6pz', 'Set Bicchieri Vino', 18.00, 'SET', 30, true),
('ACC002', 'Cavatappi Sommelier', 'Cavatappi', 25.00, 'PZ', 20, true),
('ACC003', 'Secchiello Ghiaccio', 'Secchiello', 35.00, 'PZ', 15, true),
('ACC004', 'Sottobicchieri 100pz', 'Sottobicchieri', 8.00, 'PK', 100, true),
('ACC005', 'Tovaglioli Bar 1000pz', 'Tovaglioli', 12.00, 'PK', 80, true),
-- Prodotti esauriti (per test product_missing)
('ESAU001', 'Champagne Dom Perignon', 'Dom Perignon', 180.00, 'BT', 0, true),
('ESAU002', 'Whisky Macallan 25y', 'Macallan 25', 350.00, 'BT', 0, true),
('ESAU003', 'Cognac XO', 'Cognac XO', 95.00, 'BT', 0, true),
-- Prodotti disattivati (soft delete)
('DIS001', 'Vino Vecchio Stock', 'Vino Obsoleto', 5.00, 'BT', 10, false),
('DIS002', 'Birra Scaduta', 'Birra Old', 1.00, 'BT', 50, false)
ON CONFLICT (codice) DO UPDATE SET
  descrizione_articolo = EXCLUDED.descrizione_articolo,
  base_price = EXCLUDED.base_price,
  giacenza = EXCLUDED.giacenza;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ACCOUNTS (Clienti) - 60 clienti ben distribuiti
-- ═══════════════════════════════════════════════════════════════════════════
-- NOTA: Questi INSERT usano la variabile :user_id
-- Eseguire con: psql -v user_id="'your-uuid-here'" -f seed-data.sql

-- Prima elimina i clienti di test esistenti (opzionale)
-- DELETE FROM accounts WHERE name LIKE 'TEST_%';

-- Funzione helper per generare dati (da eseguire in Supabase)
DO $$
DECLARE
  v_user_id UUID := 'd12bb99c-f2b7-4473-97bd-40d8714cf610'; -- SOSTITUIRE CON IL TUO USER_ID
  v_account_id UUID;
  v_names TEXT[] := ARRAY[
    'Bar Roma Centro', 'Ristorante Da Mario', 'Hotel Bellavista', 'Pizzeria Napoli',
    'Enoteca Il Grappolo', 'Pub The Irish', 'Caffè Milano', 'Trattoria Toscana',
    'Bar Sport', 'Ristorante La Pergola', 'Hotel Terme', 'Pizzeria Margherita',
    'Wine Bar Dioniso', 'Birreria Monaco', 'Caffetteria Centrale', 'Osteria del Borgo',
    'Bar Stazione', 'Ristorante Pesce Fresco', 'B&B Vista Mare', 'Pizzeria Vesuvio',
    'Enoteca Divino', 'Pub Black Bull', 'Gran Caffè', 'Locanda del Viaggiatore',
    'Bar Piazza', 'Ristorante Stella', 'Albergo Aurora', 'Pizza Express',
    'Vineria Chianti', 'Pub Red Lion', 'Caffè Florian', 'Trattoria Nonna',
    'Bar Jolly', 'Ristorante Mare Blu', 'Hotel Paradiso', 'Pizzeria Don Ciccio',
    'Enoteca Bacchus', 'Beer House', 'Pasticceria Dolce', 'Agriturismo Colle',
    'Bar Olimpico', 'Ristorante Il Cigno', 'Residence Sole', 'Pizzeria Luna',
    'Wine Corner', 'Brewery Craft', 'Caffè Europa', 'Taverna Antica',
    'Bar Moderno', 'Ristorante Gourmet', 'Hotel Executive', 'Pizza & Co',
    'Cantina Sociale', 'Irish Pub Dublin', 'Caffè Teatro', 'Hosteria Vecchia',
    'Bar Centrale', 'Ristorante Panorama', 'Motel Highway', 'Pizzeria Bella Italia'
  ];
  v_cities TEXT[] := ARRAY['Milano', 'Roma', 'Verona', 'Bologna', 'Torino', 'Firenze', 'Napoli', 'Padova', 'Brescia', 'Bergamo'];
  v_types TEXT[] := ARRAY['Bar', 'Ristorante', 'Hotel', 'Pizzeria', 'Enoteca', 'Pub', 'Caffè', 'Trattoria'];
  v_i INT;
  v_date TIMESTAMP;
BEGIN
  FOR v_i IN 1..60 LOOP
    -- Data creazione: distribuita negli ultimi 12 mesi
    v_date := NOW() - (random() * 365 * INTERVAL '1 day');
    
    -- 30% negli ultimi 3 mesi (nuovi clienti)
    IF v_i <= 18 THEN
      v_date := NOW() - (random() * 90 * INTERVAL '1 day');
    END IF;
    
    INSERT INTO accounts (
      user_id, 
      name, 
      city, 
      type,
      note,
      created_at
    ) VALUES (
      v_user_id,
      v_names[v_i],
      v_cities[1 + (v_i % 10)],
      v_types[1 + (v_i % 8)],
      CASE WHEN random() > 0.5 THEN 'Cliente interessato a novità. Preferisce vini rossi.' ELSE NULL END,
      v_date
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Inseriti 60 account di test';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. VISITS (Visite) - 400+ visite distribuite su 12 mesi
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_id UUID := 'd12bb99c-f2b7-4473-97bd-40d8714cf610'; -- SOSTITUIRE CON IL TUO USER_ID
  v_account RECORD;
  v_visit_date DATE;
  v_importo NUMERIC;
  v_prodotti TEXT;
  v_tipo TEXT;
  v_products TEXT[] := ARRAY['Chianti', 'Prosecco', 'Peroni', 'Moretti', 'Aperol', 'Campari', 'Acqua', 'Coca Cola', 'Grappa', 'Limoncello'];
  v_i INT;
  v_j INT;
  v_visits_per_client INT;
BEGIN
  -- Per ogni cliente
  FOR v_account IN 
    SELECT id, name, created_at FROM accounts WHERE user_id = v_user_id
  LOOP
    -- Numero visite per cliente: 3-8
    v_visits_per_client := 3 + floor(random() * 6)::INT;
    
    FOR v_j IN 1..v_visits_per_client LOOP
      -- Data visita: tra created_at e oggi
      v_visit_date := v_account.created_at::DATE + (random() * (CURRENT_DATE - v_account.created_at::DATE))::INT;
      
      -- ~70% visite con vendita
      IF random() < 0.7 THEN
        v_importo := 50 + floor(random() * 450)::NUMERIC; -- €50-€500
        v_prodotti := v_products[1 + floor(random() * 10)::INT];
        -- A volte più prodotti
        IF random() > 0.6 THEN
          v_prodotti := v_prodotti || ', ' || v_products[1 + floor(random() * 10)::INT];
        END IF;
      ELSE
        v_importo := 0;
        v_prodotti := NULL;
      END IF;
      
      -- Tipo visita
      v_tipo := CASE floor(random() * 10)::INT
        WHEN 0 THEN 'telefonata'
        WHEN 1 THEN 'richiamo'
        ELSE 'visita'
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
        v_user_id,
        v_account.id,
        v_visit_date,
        v_importo,
        v_prodotti,
        v_tipo,
        v_visit_date::TIMESTAMP
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Inserite visite di test';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. NOTES (Note) - 50 note
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_id UUID := 'd12bb99c-f2b7-4473-97bd-40d8714cf610'; -- SOSTITUIRE CON IL TUO USER_ID
  v_account RECORD;
  v_note_bodies TEXT[] := ARRAY[
    'Interessato a nuovi vini biologici. Chiamare la prossima settimana.',
    'Ordine regolare ogni 2 settimane. Preferisce Prosecco e Chianti.',
    'Problemi con ultima consegna. Da sistemare.',
    'Vuole provare la nuova IPA artigianale.',
    'Richiesta preventivo per evento privato 50 persone.',
    'Pagamento sempre puntuale. Cliente affidabile.',
    'Interessato a promozione birre estive.',
    'Chiede sconto per ordini superiori a €500.',
    'Da visitare prima delle feste natalizie.',
    'Competitor ha proposto prezzi più bassi. Valutare offerta.',
    'Locale in ristrutturazione. Riapertura prevista a marzo.',
    'Nuova gestione. Presentarsi nuovamente.',
    'Ottimo rapporto. Possibile referenza per altri locali.',
    'Richiede consegne solo il martedì mattina.',
    'Interesse per corso degustazione vini.'
  ];
  v_i INT := 0;
BEGIN
  FOR v_account IN 
    SELECT id FROM accounts WHERE user_id = v_user_id ORDER BY random() LIMIT 35
  LOOP
    v_i := v_i + 1;
    INSERT INTO notes (
      account_id,
      body,
      created_at
    ) VALUES (
      v_account.id,
      v_note_bodies[1 + (v_i % 15)],
      NOW() - (random() * 180 * INTERVAL '1 day')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Inserite note di test';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. VERIFICA DATI
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'ACCOUNTS' as tabella, COUNT(*) as totale FROM accounts
UNION ALL
SELECT 'VISITS' as tabella, COUNT(*) as totale FROM visits
UNION ALL
SELECT 'PRODUCTS' as tabella, COUNT(*) as totale FROM products
UNION ALL
SELECT 'NOTES' as tabella, COUNT(*) as totale FROM notes;

-- Distribuzione visite per mese
SELECT 
  TO_CHAR(data_visita, 'YYYY-MM') as mese,
  COUNT(*) as visite,
  ROUND(AVG(importo_vendita)::NUMERIC, 2) as media_importo
FROM visits 
WHERE importo_vendita > 0
GROUP BY TO_CHAR(data_visita, 'YYYY-MM')
ORDER BY mese DESC
LIMIT 12;

-- Distribuzione clienti per tipo
SELECT type, COUNT(*) FROM accounts GROUP BY type ORDER BY COUNT(*) DESC;

-- Distribuzione clienti per città
SELECT city, COUNT(*) FROM accounts GROUP BY city ORDER BY COUNT(*) DESC;

