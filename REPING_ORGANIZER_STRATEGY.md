# REPING ORGANIZER - Strategia e Scelte di Sviluppo

> **Data di creazione**: 26 Dicembre 2025  
> **Versione**: 1.0

---

## 🎯 VISIONE GENERALE

### Il Problema
Reping nella sua versione completa (ora chiamata **REPING COPILOT**) include funzionalità CRM che gestiscono dati sensibili di clienti, creando potenziali rischi legali e privacy per agenti di commercio, specialmente in rapporti di mandato o partita IVA.

### La Soluzione
Creare **REPING ORGANIZER**: una versione "low-risk" focalizzata su logistica, organizzazione personale e dati pubblici, eliminando completamente la gestione di dati sensibili dei clienti.

<font color="red">PROPOSTA PAOLO

Chiamare REPING COPILOT la versione "light", e REPING COPILOT PRO quella successiva completa</font>



---

## 📊 DUE VERSIONI A CONFRONTO

| Aspetto | REPING ORGANIZER | REPING COPILOT |
|---------|------------------|----------------|
| **Target** | Tutti gli agenti | Agenti con contratti specifici |
| **Rischio legale** | ⚠️ BASSO | 🔴 MEDIO-ALTO |
| **Dati gestiti** | Solo pubblici + note personali | CRM completo + dati sensibili |
| **Crittografia E2E** | ❌ Non necessaria | ✅ Obbligatoria |
| **AI/Copilot** | ⚠️ Limitato (pubblico) <font color="red">- anche completo, perchè no - </font>(| ✅ Completo |
| **Database clienti** | Crowdsourced pubblico | <font color="red">- misto oppure </font> Privato utente |

---

## ✅ SCELTE GIÀ IMPLEMENTATE

### 1. **Database HoReCa Pubblico**
- ✅ **Sorgenti integrate**:
  - OpenStreetMap (Overpass API): 3.120 luoghi
  - CSV originali utente: ~400 luoghi
  - Wikidata: 4 luoghi
  - **TOTALE: 1.549 luoghi unici** (dopo deduplicazione)

- ✅ **Dati disponibili per ogni punto**:
  - Nome, tipo di attività
  - Indirizzo completo (via, comune, provincia, CAP)
  - Coordinate GPS (lat, lon)
  - Telefono (quando disponibile)
  - Sito web (quando disponibile)
  - Email (quando disponibile)
  - Orari di apertura (quando disponibile)
  - Fonte del dato

- ✅ **Tecnologia mappa**:
  - OpenStreetMap (gratuita, open source)
  - Leaflet.js + React Leaflet
  - Clustering automatico per performance
  - Zoom automatico sulla provincia di Verona

### 2. **Note Personali**
- ✅ **Implementazione attuale**:
  - Salvate in `localStorage` (browser)
  - NON associate ai luoghi pubblici
  - Modificabili nei popup della mappa
  - Avviso per utente: "Non inserire dati sensibili"

- ⚠️ **DECISIONE DA PRENDERE**:

	<font color="red">- decidere se usare google maps o altre service a pagamento </font>  
- Mantenere localStorage (solo locale, zero privacy risk)? <font color="red"> sì, la privacy dei dati non è la proprietà, va assicurata sempre - </font>
  - Creare tabella separata nel database (serve crittografia)? <font color="red">sì, ci serve l'arricchimento dei POI, ma niente note in cloud, niente associazione POI-utente e niente crittografia </font>
  - Aggiungere funzione "esporta/importa" note in JSON?<font color="red"> sì </font>

### 3. **Reverse Geocoding**
- ✅ Script creato per arricchire coordinate con indirizzi
- ✅ Usa Nominatim di OpenStreetMap (gratuito)
- ✅ Rate limiting rispettato (1 req/sec)

---

## ⚠️ SCELTE DA FARE

### A. **ONBOARDING OBBLIGATO**
**Proposta**: L'utente sceglie i "suoi" luoghi da una lista/mappa pre-esistente (no inserimento manuale).

**PRO**:
- ✅ Zero dati sensibili inseriti dall'utente
- ✅ Database collaborativo (crowdsourcing)
- ✅ Qualità dati garantita da OSM

**CONTRO**:
- ❌ Meno flessibilità per l'utente
- ❌ Serve interfaccia di selezione dedicata
- ❌ Come gestire luoghi non in database?

**DECISIONI DA PRENDERE**:
1. Permettere "richiesta di aggiunta" per luoghi mancanti?<font color="red"> sì, e anche di modifica </font>
2. Chi valida/approva nuovi luoghi? <font color="red"> gli utenti </font>

3. Sistema di "flag" per dati errati?<font color="red"> sì, così periodicamente li cancelliamo </font>


---

### B. **FUNZIONI INTELLIGENTI (AI)**

#### Cosa INCLUDERE (basso rischio):
- ✅ Ottimizzazione percorsi tra luoghi pubblici
- ✅ Suggerimenti basati su distanza/tempo
- ✅ Analisi zone geografiche (densità HoReCa)
- ✅ Previsioni traffico/meteo (dati pubblici) <font color="red"> per adesso lasciamo perdere  </font>

<font color="red"> Avevamo deciso che i percorsi venivano alla fine inseriti in tom tom o simili che li gestiva esternamente, giusto?</font>

#### Cosa ESCLUDERE (alto rischio):
- ❌ Analisi vendite personali
- ❌ Storico visite clienti
- ❌ Churn risk / revenue analysis
- ❌ Proactive suggestions commerciali (Napoleon) <font color="red"> Napoleon rimane ma usa quello che c'è nelle note; se ci sono dati che non dovrebbero esserci è un problema dell'agente, l'AI suggerisce con il materiale che ha ...  </font>

- ❌ Chat con dati CRM

**ZONA GRIGIA (da decidere)**:
- ⚠️ Ricerca NLU: "Trovami bar vicino a Verona centro" → OK? <font color="red"> certo</font>
- ⚠️ OpenAI function calling limitato a DB pubblico → OK? <font color="red">non può venire a leggere le note sul dispositivo?</font>
- ⚠️ Statistiche aggregate senza dati personali → OK?<font color="red"> dipende,  caso per caso</font>

**DECISIONE DA PRENDERE**:
- Fino a che punto spingere l'AI senza entrare in zona rischio? <font color="red">noi l'Ai la usiamo per fare tutto quello che riesce, e quello che riesce a fare dipende dai dati che mette l'utente: dati sicuri-suggerimenti sicuri!</font>

---

### C. **CRITTOGRAFIA**

**Situazione attuale in REPING COPILOT**:
- ✅ E2E encryption per: clients, contacts, visits, orders, messages
- ✅ Master Key derivato da password utente
- ✅ Scope-specific keys per ogni tabella
- ✅ AES-256-GCM + PBKDF2

**Proposta per REPING ORGANIZER**:
- ❌ **Rimuovere completamente** la crittografia E2E <font color="red">d'accordo!</font>
- Motivazione: Nessun dato sensibile da proteggere

**DECISIONE DA PRENDERE**:
1. Confermare rimozione totale?
2. Mantenere crittografia solo per note personali?
3. Passare a crittografia server-side (più semplice)?

---

### D. **SERVIZI ESTERNI (traffico, meteo)**

**Richiesta utente**: "Non voglio pagare per questi servizi"

**Opzioni GRATUITE**:
1. **Traffico**:
   - TomTom Traffic API (Free tier: 2.500 req/giorno) <font color="red"> ok</font>

   - HERE Traffic API (Freemium)<font color="red"> verifichiamo</font>
   - ❌ Google Maps Traffic (richiede billing)

2. **Meteo**: 
   - OpenWeatherMap (Free: 1.000 req/giorno)
   - WeatherAPI (Free: 1M req/mese)
   - OpenMeteo (completamente gratuito, no API key)

**DECISIONI DA PRENDERE**:
1. Integrare questi servizi oppure no? <font color="red"> per adesso lasciamolo perdere</font>
2. Se sì, quale provider scegliere?
3. Come gestire i limiti di rate (cache? fallback?)?
4. Utili davvero per un "organizer" o overkill?

---

### E. **ARCHITETTURA DATABASE**

**Tabelle attuali (COPILOT)**:
```
users
├── clients (ENCRYPTED)
├── contacts (ENCRYPTED)
├── visits (ENCRYPTED)
├── orders (ENCRYPTED)
├── messages (ENCRYPTED)
├── conversations (ENCRYPTED)
└── user_settings
```

**Proposta per ORGANIZER**:
```
users
├── user_selected_places (ID riferimento a places)
├── user_routes (sequenze di places)
├── user_notes (opzionale, libere)
└── user_settings

places (PUBBLICO, condiviso)
├── id, nome, tipo, indirizzo, coordinate
├── telefono, website, email, opening_hours
└── source, verified, flags
```

**DECISIONI DA PRENDERE**:
1. Confermare questa architettura?
2. Come gestire "verifiche" di dati pubblici?
3. Sistema di contributi/correzioni da utenti?

<font color="red"> su tutto questo decidi tu, coerentemente con le scelte fatte adesso</font>

---

### F. **FEATURES LOGISTICHE**

**Da implementare**:
1. ✅ Mappa con clustering (fatto)
2. ⬜ Selezione "miei luoghi"
3. ⬜ Creazione itinerari/percorsi
4. ⬜ Calcolo tempo/distanza tra punti <font color="red"> no, ci pensa il servizio esterno</font>
5. ⬜ Integrazione navigazione (Waze, Google Maps)
6. ⬜ Esportazione percorsi (GPX, JSON)
7. ⬜ Calendario visite (senza dettagli sensibili)
8. ⬜ Notifiche promemoria

**DECISIONI DA PRENDERE**:
- Priorità di sviluppo? <font color="red"> 1-2-3-5--7-8-6</font>
- Quali features sono MVP? <font color="red"> tutte</font>
- Quali possono aspettare v2?

---

## 🚧 CRITICITÀ IDENTIFICATE

### 1. **Modello di Business**
- ⚠️ Come monetizzare ORGANIZER se è "low-risk" e gratuito? 
- Freemium con limiti su numero luoghi/percorsi? <font color="red">esatto, o numeri POI o altro, vediamo</font>
- Pubblicità (attenzione GDPR)?
- Upsell a COPILOT?

### 2. **Manutenzione Database Pubblico**
- Chi aggiorna i dati OSM nel nostro DB? <font color="red">la nostra app</font>
- Frequenza di refresh?<font color="red"> mensile</font>
- Costi storage per dati geografici? <font color="red">  quanto sono?</font>

### 3. **Scalabilità**
- Quanti utenti può gestire con dati pubblici condivisi? <font color="red"> dimmelo tu</font>
- Performance ricerche su DB con milioni di luoghi? <font color="red"> milioni?</font>
- CDN per mappe statiche? <font color="red">  eeh?</font>

### 4. **UX/UI**
- Doppia app confonde gli utenti? 
- Come comunicare la differenza ORGANIZER vs COPILOT? <font color="red"> per adesso citiamo la versione pro ma comunichiamo solo la versioen base</font>
- Percorso di onboarding chiaro? <font color="red"> noo, la facciamo a labirinto, ovvio!!!</font>

---

## 📋 PROSSIMI PASSI SUGGERITI

### FASE 1: Validazione Strategica (ORA)
- [ ] Decidere se procedere con split ORGANIZER/COPILOT <font color="red"> sì, deciso</font>
- [ ] Definire scope esatto AI in ORGANIZER <font color="red">si chiamerà solo REPING COPILOT, scope già deciso, il massimo</font>
- [ ] Confermare rimozione crittografia E2E <font color="red"> straconfermata</font>
- [ ] Scegliere approccio note personali <font color="red"> editabile nell'etichetta del POI ma storicizzata; si salva solo sul device; l'utente ci scrive quello che vuole</font>

### FASE 2: Espansione Database (1-2 settimane) <font color="red"> no, la fase 2 consiste nel completare l'app solo per la provincia di Verona, poi si vede ...</font>
- [ ] Integrare più province (tutto Veneto? Italia?)
- [ ] Automatizzare import da OSM
- [ ] Sistema di deduplicazione robusto
- [ ] API pubblica per accesso dati


###  <font color="red"> Per tutte le fasi successive decideremo strada facendo</font>



### FASE 3: MVP ORGANIZER (2-3 settimane)
- [ ] Interfaccia selezione "miei luoghi"
- [ ] Creazione itinerari base
- [ ] Calcolo percorsi ottimali
- [ ] Deep linking navigatori

### FASE 4: AI Light (2 settimane)
- [ ] NLU limitato a ricerche pubbliche
- [ ] Suggerimenti logistici (no commerciali)
- [ ] Chat senza accesso dati personali

### FASE 5: Beta & Test (1 settimana)
- [ ] Test con agenti reali
- [ ] Validazione legale/privacy
- [ ] Feedback UX

---

## 📞 DOMANDE APERTE PER DECISIONE

1. **Doppia app o feature toggle?**
   - Due codebase separate? <font color="red"> sì</font>
   - Una app con "modalità" selezionabile?

2. **Nome commerciale**
   - "REPING ORGANIZER" è efficace? <font color="red"> no, si chiamerà REPING COPILOT</font>
   - Alternative: REPING Lite, REPING Route, REPING Go?

3. **Target geografico iniziale**
   - Solo provincia di Verona? <font color="red"> per adesso sì</font>
   - Tutto Veneto?
   - Italia intera (troppo ambizioso)?

4. **Modello di lancio** <font color="red">  vedremo</font>
   - Beta chiusa con agenti selezionati?
   - Public beta aperta?
   - Lancio completo con marketing?

5. **Migrazione utenti esistenti** <font color="red"> non abbiamo utenti esistenti</font>
   - Gli utenti attuali possono "downgrade" a ORGANIZER?
   - Come gestire dati già inseriti nel CRM?

---

## 💡 RACCOMANDAZIONI FINALI

### APPROCCIO CONSIGLIATO:
1. **Sviluppare ORGANIZER come PWA standalone**
   - Codebase separato, più leggero
   - No crittografia = performance migliori
   - Deploy più semplice

2. **Database pubblico come servizio separato**
   - API RESTful per accesso luoghi
   - Usabile anche da COPILOT
   - Possibile revenue stream (API a pagamento per terze parti)

3. **AI in ORGANIZER: sì, ma limitata** <font color="red"> no, già detto perchè illimitata</font>
   - Solo ricerche e ottimizzazioni logistiche
   - Zero accesso a dati commerciali/vendite
   - Trasparenza totale su cosa fa l'AI

4. **Crowdsourcing come differenziatore** <font color="red"> su questo dobbiamo ragionare, per adesso non implementiamolo</font>
   - Community-driven database
   - Gamification per contributi
   - Badge/riconoscimenti per top contributors

---

## 📈 METRICHE DI SUCCESSO

**MVP (3 mesi)**:
- [ ] 100 utenti attivi
- [ ] 5.000+ luoghi nel database
- [ ] 1.000+ percorsi creati
- [ ] Net Promoter Score > 40

**Maturità (6 mesi)**:
- [ ] 500 utenti attivi
- [ ] 20.000+ luoghi
- [ ] 20% conversion rate a COPILOT
- [ ] Break-even costi server

---

**Documento preparato per decisione strategica**  
**Prossimo step**: Meeting di allineamento su scelte chiave (A-F)

