// lib/semantic/schema-knowledge.ts
// Schema completo dei dati PLAIN accessibili al sistema semantico

export const SCHEMA_KNOWLEDGE = `
TABELLE E CAMPI DISPONIBILI PER QUERY:

═══════════════════════════════════════════════════════════════

📋 ACCOUNTS (Clienti)
Campo                 | Tipo      | Descrizione
--------------------- | --------- | ----------------------------------
id                    | UUID      | Identificativo univoco
user_id               | UUID      | Proprietario (agente)
city                  | string    | Città cliente (es. "Verona", "Milano")
tipo_locale           | string    | Tipologia locale (bar, ristorante, pizzeria, hotel)
ultimo_esito          | string    | Ultimo esito contatto (ordine_acquisito, da_richiamare, no_interesse, info_richiesta, altro)
ultimo_esito_at       | timestamp | Data ultimo esito
volume_attuale        | number    | Volume corrente affari
volume_attuale_at     | timestamp | Data aggiornamento volume
note                  | string    | Annotazioni commerciali (plain text)
prodotti              | string    | Prodotti associati
postal_code           | string    | CAP
created_at            | timestamp | Data creazione record
updated_at            | timestamp | Data ultimo aggiornamento

═══════════════════════════════════════════════════════════════

📞 VISITS (Visite e Chiamate)
Campo                 | Tipo      | Descrizione
--------------------- | --------- | ----------------------------------
id                    | UUID      | Identificativo univoco
user_id               | UUID      | Proprietario (agente)
account_id            | UUID      | Riferimento a cliente (accounts.id)
tipo                  | string    | Tipo contatto (visita, chiamata)
data_visita           | timestamp | Data/ora del contatto
durata                | number    | Durata in minuti
esito                 | string    | Esito contatto (ordine_acquisito, da_richiamare, no_interesse, info_richiesta, altro)
notes                 | string    | Note del contatto (plain text)
importo_vendita       | number    | Importo venduto (se applicabile)
created_at            | timestamp | Data creazione record
updated_at            | timestamp | Data ultimo aggiornamento

═══════════════════════════════════════════════════════════════

📌 PROMEMORIA (Task e Promemoria)
Campo                 | Tipo      | Descrizione
--------------------- | --------- | ----------------------------------
id                    | UUID      | Identificativo univoco
user_id               | UUID      | Proprietario (agente)
nota                  | string    | Testo promemoria (plain text)
urgente               | boolean   | Flag urgenza
created_at            | timestamp | Data creazione
updated_at            | timestamp | Data ultimo aggiornamento

═══════════════════════════════════════════════════════════════

📝 NOTES (Note Semantiche)
Campo                 | Tipo      | Descrizione
--------------------- | --------- | ----------------------------------
id                    | UUID      | Identificativo univoco
account_id            | UUID      | Riferimento cliente (opzionale)
contact_id            | UUID      | Riferimento contatto (opzionale)
body                  | string    | Testo nota (plain text)
created_at            | timestamp | Data creazione

═══════════════════════════════════════════════════════════════

📦 PRODUCTS (Catalogo Prodotti)
Campo                 | Tipo      | Descrizione
--------------------- | --------- | ----------------------------------
id                    | UUID      | Identificativo univoco
codice                | string    | Codice articolo (univoco)
sku                   | string    | SKU prodotto
title                 | string    | Nome prodotto
descrizione_articolo  | string    | Descrizione commerciale
base_price            | number    | Prezzo base
unita_misura          | string    | Unità di misura (PZ, SC, KG, ecc.)
giacenza              | number    | Quantità disponibile
sconto_merce          | string    | Descrizione promo merce
sconto_fattura        | number    | Percentuale sconto fattura (0-100)
is_active             | boolean   | Prodotto attivo (true/false)
created_at            | timestamp | Data creazione
updated_at            | timestamp | Data ultimo aggiornamento

═══════════════════════════════════════════════════════════════

🔗 RELAZIONI TRA TABELLE:
- visits.account_id → accounts.id (visite di un cliente)
- notes.account_id → accounts.id (note su un cliente)

═══════════════════════════════════════════════════════════════

⚙️ OPERAZIONI SUPPORTATE:

FILTRI:
- eq      : uguale a
- neq     : diverso da
- gt      : maggiore di
- gte     : maggiore o uguale a
- lt      : minore di
- lte     : minore o uguale a
- like    : contiene testo (case-insensitive)
- in      : presente in lista valori

AGGREGAZIONI:
- count   : conteggio record
- sum     : somma valori numerici
- avg     : media valori numerici
- min     : valore minimo
- max     : valore massimo

GROUP BY:
- Raggruppa risultati per uno o più campi
- Combinabile con aggregazioni

SORT:
- asc     : ordinamento crescente
- desc    : ordinamento decrescente

JOIN:
- inner   : join interno (solo record correlati)
- left    : left join (tutti i record tabella sinistra)

═══════════════════════════════════════════════════════════════

⚠️ VINCOLI IMPORTANTI:

1. PRIVACY
   - NON sono accessibili campi cifrati (name_enc, email_enc, phone_enc, address_enc, ecc.)
   - Riferirsi ai clienti per ID, città, tipo_locale
   - NON tentare di accedere a dati cifrati

2. SECURITY
   - Ogni query DEVE filtrare per user_id
   - Accesso solo ai propri dati

3. DATE RELATIVE
   - "now"           : timestamp corrente
   - "today"         : inizio giornata corrente
   - "30_days_ago"   : 30 giorni fa
   - "this_month"    : inizio mese corrente
   - "this_year"     : inizio anno corrente
   - Pattern: "{numero}_{days|months|years}_ago"

4. PERFORMANCE
   - Limitare risultati con LIMIT (max consigliato: 100)
   - Aggregazioni su grandi dataset possono richiedere tempo
   - Preferire filtri specifici a scansioni complete

═══════════════════════════════════════════════════════════════

📊 ESEMPI VALORI COMUNI:

tipo_locale:
- bar
- ristorante  
- pizzeria
- hotel
- altro

esito / ultimo_esito:
- ordine_acquisito
- da_richiamare
- no_interesse
- info_richiesta
- altro

tipo (visits):
- visita
- chiamata

═══════════════════════════════════════════════════════════════
`;
