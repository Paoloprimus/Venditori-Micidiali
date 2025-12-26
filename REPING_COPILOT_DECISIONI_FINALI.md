# REPING COPILOT - Decisioni Finali e Piano Esecutivo

> **Data**: 26 Dicembre 2025  
> **Versione**: 2.0 DEFINITIVA  
> **Status**: ✅ DECISIONI CONFERMATE

---

## 🎯 DECISIONE STRATEGICA PRINCIPALE

### ✅ NAMING DEFINITIVO:
- **REPING COPILOT** = Versione base (ex "ORGANIZER")
- **REPING COPILOT PRO** = Versione avanzata con CRM completo (sviluppo futuro)

**Motivazione**: Un solo brand "COPILOT" è più forte commercialmente, il "PRO" comunica upgrade naturale.

---

## 🚀 SCOPE DI REPING COPILOT (v1.0)

### ✅ COSA INCLUDE:

#### 1. **Database HoReCa Pubblico**
- ✅ 1.549 POI provincia di Verona (già implementato)
- ✅ Sorgenti: OSM, CSV utente, Wikidata
- ✅ Dati: nome, tipo, indirizzo, coordinate, telefono, web, email, orari

#### 2. **Mappa Interattiva**
- ✅ OpenStreetMap + Leaflet.js (già implementato)
- ✅ Clustering automatico
- ✅ Zoom provincia Verona

#### 3. **AI Completa (no limiti)**
- ✅ NLU per ricerche: "Trovami bar vicino a Verona centro"
- ✅ OpenAI function calling su DB pubblico + note locali
- ✅ Napoleon attivo (suggerimenti da note utente)
- ✅ Chat con accesso a dati pubblici + note device
- ⚠️ **Principio**: AI lavora con i dati disponibili (pubblici + note locali)

#### 4. **Note Personali**
- ✅ Salvate SOLO su device (localStorage)
- ✅ Editabili nel popup POI
- ✅ Storicizzate (cronologia modifiche)
- ✅ Export/Import JSON
- ❌ MAI sincronizzate su cloud
- ⚠️ Avviso utente: "Scrivi quello che vuoi, responsabilità tua"

#### 5. **Features Logistiche (priorità)**
1. ✅ Mappa clustering (fatto)
2. ⬜ Selezione "miei luoghi"
3. ⬜ Creazione itinerari
4. ❌ ~~Calcolo tempo/distanza~~ (lo fa servizio esterno)
5. ⬜ Deep linking Waze/Google Maps
6. ⬜ Calendario visite
7. ⬜ Notifiche promemoria
8. ⬜ Export percorsi GPX/JSON

**MVP = tutte 1-3-5-6-7-8**

---

## ❌ COSA NON INCLUDE (per ora):

### Rimosso dalla v1.0:
- ❌ Crittografia E2E (non necessaria senza dati sensibili in cloud)
- ❌ Servizi traffico/meteo (troppo overkill per MVP)
- ❌ Calcolo percorsi interno (delegato a Waze/Google Maps)
- ❌ Crowdsourcing utenti (troppo complesso per MVP)
- ❌ Espansione geografica oltre Verona (fase 2)

---

## 🗄️ ARCHITETTURA DATABASE DEFINITIVA

### Tabelle Confermate:

```sql
-- TABELLA PUBBLICA (condivisa tra utenti)
CREATE TABLE places (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT,
  indirizzo_stradale TEXT,
  comune TEXT,
  provincia TEXT,
  cap TEXT,
  lat DECIMAL(10,8),
  lon DECIMAL(11,8),
  telefono TEXT,
  website TEXT,
  email TEXT,
  opening_hours TEXT,
  source TEXT,
  verified BOOLEAN DEFAULT false,
  flag_count INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- SELEZIONI UTENTE (quali POI segue)
CREATE TABLE user_selected_places (
  user_id UUID REFERENCES users(id),
  place_id UUID REFERENCES places(id),
  added_at TIMESTAMP,
  PRIMARY KEY (user_id, place_id)
);

-- ITINERARI UTENTE
CREATE TABLE user_routes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  nome TEXT,
  places_sequence UUID[], -- Array di place_id in ordine
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- IMPOSTAZIONI UTENTE
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  preferences JSONB,
  updated_at TIMESTAMP
);

-- NESSUNA TABELLA NOTE (rimangono su device)
```

### ✅ Decisioni Confermate:
1. **Arricchimento POI nel DB pubblico**: SÌ (phone, web, email da community)
2. **Note utente nel DB**: NO (solo localStorage)
3. **Associazione POI-utente nel DB**: SÌ (solo ID di selezione, no note)
4. **Crittografia**: NO

---

## 🤖 AI & NAPOLEON

### ✅ Strategia AI:
**"L'AI fa il massimo con i dati disponibili"**

- Se utente scrive nelle note "venduto 100€ a Bar X" → Napoleon suggerisce strategie
- Se utente scrive solo "visitato" → Napoleon suggerisce solo logistica
- **Zero responsabilità app**: l'utente decide cosa mettere

### ✅ Napoleon Attivo:
- ✅ Legge note locali (localStorage via API bridge)
- ✅ Suggerisce percorsi ottimali
- ✅ Analizza pattern visite (se utente inserisce dati)
- ✅ Alert "luoghi non visitati da X giorni"

### ✅ Chat AI:
- ✅ Accesso DB pubblico (places)
- ✅ Accesso note locali (se utente lo permette)
- ✅ Function calling per ricerche POI
- ❌ NO accesso dati CRM (non esistono)

---

## 🔐 PRIVACY & LEGAL

### ✅ Modello Privacy DEFINITIVO:

| Dato | Dove | Privacy |
|------|------|---------|
| POI pubblici | Server Supabase | Pubblico |
| Selezione POI | Server Supabase | User-specific, no dati sensibili |
| Itinerari | Server Supabase | User-specific, no dati sensibili |
| Note personali | localStorage device | Zero-knowledge (non vediamo nulla) |
| Storico note | localStorage device | Zero-knowledge |

**Risultato**: 
- ✅ GDPR compliant (no dati sensibili in cloud)
- ✅ Zero rischio legale per agenti
- ✅ Zero crittografia E2E necessaria
- ✅ Trasparenza totale: "I tuoi dati NON lasciano il device"

---

## 🗺️ MAPS & NAVIGATION

### ✅ Decisione Provider Mappe:
**OpenStreetMap + Leaflet (GRATIS)** per visualizzazione

**Servizi esterni per navigazione**:
- ✅ Deep link a Waze: `waze://?ll=LAT,LON`
- ✅ Deep link a Google Maps: `google.navigation:q=LAT,LON`
- ✅ Deep link a Apple Maps: `maps://?ll=LAT,LON`

**NO Google Maps SDK** (costa troppo per visualizzazione)

### ⚠️ Da Valutare (non MVP):
- TomTom Traffic API (2.500 req/giorno free) → Fase 2
- Google Maps Directions API (calcolo percorsi) → Valutare costo

---

## 📱 ARCHITETTURA TECNICA

### ✅ Stack Confermato:
- **Frontend**: Next.js 14 (App Router) + React + TypeScript
- **Mappe**: Leaflet.js + react-leaflet + react-leaflet-cluster
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4 (già integrato)
- **Storage Locale**: localStorage (note, cache)
- **Deploy**: Vercel (già attivo)

### ✅ UN SOLO CODEBASE con Feature Flags:
```
reping-copilot/
├── features/
│   ├── places/        ← Tutti i tier
│   ├── routes/        ← Tutti i tier
│   ├── ai/            ← Tutti i tier (con limiti)
│   ├── crm/           ← Solo PRO/PRO+
│   ├── encryption/    ← Solo PRO/PRO+
│   └── analytics/     ← Solo PRO+
└── lib/
    └── tiers.ts       ← FREE | PRO | PRO+
```

**Benefici**:
- ✅ Zero duplicazione codice
- ✅ Upgrade seamless in-app
- ✅ Manutenzione unica
- ✅ Feature flags dinamici

---

## 🛠️ FEATURES DA IMPLEMENTARE (Roadmap)

### ✅ FASE 1: Core MVP (3 settimane) - 4 FEATURES CORE

#### Settimana 1: Gestione POI
- [ ] **Feature 1: Selezione "Miei Luoghi"**
  - [ ] Interfaccia lista POI con filtri (tipo, ricerca)
  - [ ] Bottone "Aggiungi ai miei luoghi" nel popup
  - [ ] Vista "I miei luoghi" con mappa filtrata
  - [ ] Save to `user_selected_places` table
  - [ ] Badge counter: "Hai X/50 luoghi (FREE)"

#### Settimana 2: Itinerari
- [ ] **Feature 2: Creazione Itinerari**
  - [ ] UI: Lista "Miei luoghi" draggable
  - [ ] Drag & drop per ordinare sequenza
  - [ ] Salva in `user_routes` table
  - [ ] Visualizza linee connesse su mappa
  - [ ] Badge: "Hai X/5 itinerari (FREE)"

#### Settimana 3: Navigation & Note
- [ ] **Feature 3: Deep Linking Navigation**
  - [ ] Bottone "Apri in Waze" (multi-waypoint)
  - [ ] Bottone "Apri in Google Maps" (multi-waypoint)
  - [ ] Bottone "Apri in Apple Maps"
  - [ ] Generazione URL con sequenza itinerario

- [ ] **Feature 4: Note Locali con AI Opt-in**
  - [ ] Campo textarea nel popup POI
  - [ ] Save to localStorage (chiave: `notes_${placeId}`)
  - [ ] Storico modifiche con timestamp
  - [ ] Export JSON: `{ placeId: { text, history: [...] } }`
  - [ ] Import JSON con merge/replace
  - [ ] **NUOVO**: Toggle "Consenti AI di leggere note"
    - Se OFF: note invisibili all'AI
    - Se ON: API bridge legge localStorage per Napoleon
  - [ ] Disclaimer privacy: "Le tue note sono SUL TUO DEVICE"

### ⏸️ FASE 2: Calendario & Notifiche (Post-MVP)

- [ ] Calendario visite
  - [ ] Associare data a POI
  - [ ] Vista calendario mensile
  - [ ] NO dettagli sensibili (solo "Visitato Bar X")
- [ ] Notifiche promemoria
  - [ ] Web Push API
  - [ ] Alert "Oggi devi visitare X"
  - [ ] Alert "Non visiti Y da 30 giorni"

### ✅ FASE 3: UX/UI Polish (1 settimana)

- [ ] Onboarding guidato
  - [ ] Welcome screen: "Seleziona i tuoi luoghi"
  - [ ] Tutorial interattivo mappa
  - [ ] Spiegazione note locali
- [ ] Design Tailwind
  - [ ] Popup POI rifiniti
  - [ ] Liste responsive
  - [ ] Dark mode
- [ ] Performance
  - [ ] Lazy loading POI
  - [ ] Virtual scrolling liste
  - [ ] Service Worker per offline

---

## 🎨 UX/UI DECISIONI

### ✅ Naming & Comunicazione:
- **App name**: REPING COPILOT
- **Tagline**: "Il copilota intelligente per agenti HoReCa"
- **Menzioni PRO**: "Passa a COPILOT PRO per CRM avanzato" (footer/settings)

### ✅ Onboarding:
1. "Benvenuto in REPING COPILOT"
2. "Seleziona i locali che segui dalla mappa"
3. "Crea il tuo primo itinerario"
4. "Aggiungi note personali (solo sul tuo device)"

### ✅ Avvisi Privacy:
- Nel popup note: 
  > ⚠️ Le tue note sono salvate SOLO su questo dispositivo. Non le vediamo, non le sincronizziamo. Sei libero di scrivere quello che vuoi, ma sei anche responsabile di ciò che scrivi.

---

## 📊 MODELLO BUSINESS

### ✅ Freemium Confermato (3 Tier):

| Feature | FREE | PRO (€9/mese) | PRO+ (€29/mese) |
|---------|------|---------------|-----------------|
| POI visibili | Provincia Verona | Veneto | Tutta Italia |
| "Miei luoghi" | Max 50 | Max 200 | Illimitati |
| Itinerari | Max 5 | Max 20 | Illimitati |
| **AI Chat** | **5 msg/giorno** | **20 msg/giorno** | **Illimitati** |
| **AI su note** | ❌ | ✅ (opt-in) | ✅ (opt-in) |
| Napoleon | ❌ | Base | Avanzato + Predittivo |
| Export dati | JSON | JSON + CSV | JSON + CSV + Excel |
| Supporto | Community | Email (48h) | Prioritario (6h) |
| **CRM** | ❌ | ❌ | ✅ Full |
| **E2E Encryption** | ❌ | ❌ | ✅ |

**Target revenue**: 
- 1000 utenti FREE (0€)
- 200 PRO × €9 = €1.800/mese
- 50 PRO+ × €29 = €1.450/mese
- **TOTALE: €3.250/mese**

**Costi stimati**:
- Supabase: €0 (free tier)
- Vercel: €20/mese
- OpenAI: €800/mese (con limiti AI)
- **MARGINE: €2.430/mese** 💰

---

## 🔧 MANUTENZIONE & OPS

### ✅ Aggiornamento DB Pubblico:
- **Frequenza**: Mensile (1° di ogni mese)
- **Script**: `scripts/refresh-osm-places.js` (cron job)
- **Processo**:
  1. Query Overpass API per provincia Verona
  2. Merge con DB esistente (deduplica)
  3. Mantieni POI con `user_selected_places` anche se spariti da OSM
  4. Log modifiche in `places_changelog`

### ✅ Costi Storage Stimati:

**Supabase Free Tier**:
- 500 MB database
- 1 GB bandwidth/mese
- 50k MAU

**Stima utilizzo**:
- 1.549 POI × 1 KB = ~1.5 MB
- 10k POI Italia = ~10 MB
- 100 utenti × 50 POI × 0.5 KB = 2.5 MB
- **TOTALE: ~15 MB** → Ampiamente nel free tier

**Scala 1000 utenti**:
- 100k POI Italia = 100 MB
- 1000 utenti × 100 luoghi = 50 MB
- **TOTALE: 150 MB** → Ancora free tier

**Conclusione**: Costi storage trascurabili fino a 10k utenti

---

## 🚨 RISCHI & MITIGAZIONI

### ⚠️ Rischio 1: Utenti mettono dati sensibili nelle note
**Mitigazione**: 
- Avviso esplicito nel UI
- Disclaimer nei T&C
- Zero-knowledge (non abbiamo accesso)
- **Posizione**: È responsabilità utente

### ⚠️ Rischio 2: Napoleon suggerisce cose inappropriate
**Mitigazione**:
- Prompt engineering: "Sei un assistente logistico, non commerciale"
- Content moderation OpenAI
- Feedback loop: "Segnala suggerimento inappropriato"

### ⚠️ Rischio 3: DB pubblico con dati errati
**Mitigazione**:
- Sistema flag utenti
- Cron job rimozione POI flaggati
- Fonte OSM verificata

### ⚠️ Rischio 4: Performance con molti POI
**Mitigazione**:
- Clustering già attivo
- Lazy loading
- PostgreSQL indexing (lat/lon)
- PostGIS per query geografiche

---

## 📈 METRICHE DI SUCCESSO

### ✅ MVP (3 mesi):
- [ ] 50 utenti attivi settimanali
- [ ] 2.000 POI nel database (Verona completa)
- [ ] 200 itinerari creati
- [ ] 10% conversion rate a PRO
- [ ] Net Promoter Score > 30

### ✅ Maturità (6 mesi):
- [ ] 200 utenti attivi settimanali
- [ ] 5.000 POI (espansione Veneto)
- [ ] 1.000 itinerari
- [ ] 20% conversion PRO
- [ ] NPS > 50

---

## ✅ DECISIONI DEFINITIVE - RECAP FINALE

### 🎯 STRATEGIA:
- ✅ Nome: REPING COPILOT (non "ORGANIZER")
- ✅ **UN SOLO CODEBASE** con feature flags (FREE/PRO/PRO+)
- ✅ Target iniziale: Provincia Verona
- ✅ Modello: Freemium 3 tier (FREE → PRO €9 → PRO+ €29)

### 🗄️ DATABASE:
- ✅ POI pubblici condivisi su Supabase
- ✅ Selezioni utente su Supabase
- ✅ Note SOLO localStorage (no cloud)
- ✅ NO crittografia E2E (in FREE/PRO)

### 🤖 AI:
- ✅ Limiti tier-based: **5 msg/giorno FREE | 20 msg/giorno PRO | ∞ PRO+**
- ✅ Napoleon attivo PRO+ (legge note con opt-in)
- ✅ Chat con accesso pubblico + locale (se opt-in)
- ✅ Principio: "Dati sicuri → Suggerimenti sicuri"

### 🗺️ MAPPE:
- ✅ OSM + Leaflet (gratis)
- ✅ Navigation: deep link Waze/Google Maps/Apple Maps
- ❌ NO Google Maps SDK
- ⏸️ Traffico/Meteo: Fase 2

### 📱 FEATURES MVP (4 CORE):
1. ✅ Mappa clustering (fatto)
2. ⬜ Selezione "miei luoghi" (con limiti tier)
3. ⬜ Creazione itinerari (con limiti tier)
4. ⬜ Note locali + AI opt-in + Export JSON

### ⏸️ POST-MVP (v1.1):
5. ⬜ Deep linking navigatori
6. ⬜ Calendario visite
7. ⬜ Notifiche promemoria
8. ⬜ Sistema flag POI errati

### 🚫 NON FARE (per ora):
- ❌ Due codebase separate
- ❌ Crowdsourcing community
- ❌ Calcolo percorsi interno
- ❌ Servizi traffico/meteo
- ❌ Espansione geografica oltre Verona

---

## 🚀 PROSSIMO STEP IMMEDIATO

### ✅ DA FARE ORA:
1. **Refactoring nomi**: 
   - Rinominare `app/mappa` → `app/places`
   - Aggiornare branding "COPILOT" (non "ORGANIZER")

2. **Creare tabelle DB**:
   - Migration `places`, `user_selected_places`, `user_routes`
   - Popolamento iniziale da `veronahoreca-final.csv`

3. **Implementare "Miei Luoghi"**:
   - UI selezione POI
   - Save to `user_selected_places`

4. **Test localStorage note**:
   - API bridge per leggere in AI
   - Export/Import JSON

**Tempo stimato**: 1 settimana per 1-4

---

**Documento approvato e pronto per esecuzione**  
**Start date**: 27 Dicembre 2025  
**Target MVP**: Fine Gennaio 2026

🚀 **LET'S BUILD!**

