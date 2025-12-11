# 🚀 REPPING - Handoff Sviluppatore

> **Data:** 11 Dicembre 2025  
> **Stato:** Beta pre-release  
> **Stack:** Next.js 14 + Supabase + OpenAI

---

## 📋 COSA È REPPING

App per **venditori/agenti di commercio** che gestisce:
- Clienti (bar, ristoranti, locali) con dati criptati E2E
- Visite e vendite
- Assistente AI conversazionale (chat + voce)
- Suggerimenti proattivi ("Napoleone")
- Pianificazione giri

---

## 🏗️ ARCHITETTURA

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  Next.js 14 (App Router) + React + Tailwind            │
├─────────────────────────────────────────────────────────┤
│                      NLU LOCALE                         │
│  lib/nlu/unified.ts → 100+ intent riconosciuti         │
│  app/chat/planner.ts → esecuzione query locali         │
├─────────────────────────────────────────────────────────┤
│                    CRITTOGRAFIA E2E                     │
│  lib/crypto/CryptoService.ts → AES-256-GCM             │
│  lib/crypto/CryptoProvider.tsx → React context         │
├─────────────────────────────────────────────────────────┤
│                      SUPABASE                           │
│  Auth + PostgreSQL + RLS (Row Level Security)          │
│  Tabelle: accounts, visits, products, notes, messages  │
├─────────────────────────────────────────────────────────┤
│                      OPENAI                             │
│  GPT-4 (fallback per query non locali)                 │
│  TTS (text-to-speech) per modalità Dialogo             │
│  Whisper (speech-to-text) fallback                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 STRUTTURA FILE PRINCIPALI

### Frontend
```
app/
├── page.tsx                    # Home (redirect a /home)
├── home/
│   └── page.tsx               # Dashboard principale
├── chat/
│   └── planner.ts             # 🔥 CUORE NLU - esegue intent locali
├── napoleon/
│   └── page.tsx               # Lista suggerimenti proattivi
├── settings/
│   └── preferences/page.tsx   # Preferenze utente
├── api/
│   ├── chat/route.ts          # Chat con OpenAI
│   ├── voice/
│   │   ├── tts/route.ts       # Text-to-Speech OpenAI
│   │   └── transcribe/route.ts # Whisper STT
│   └── clients/import/route.ts # Import clienti CSV
```

### Componenti chiave
```
components/
├── HomeClient.tsx             # 🔥 Orchestratore principale home
├── home/
│   ├── Dashboard.tsx          # Cards dashboard
│   ├── Thread.tsx             # Chat thread
│   ├── Composer.tsx           # Input chat + bottone Dialogo
│   └── DialogOverlay.tsx      # Overlay modalità voce
├── napoleon/
│   └── NapoleonCard.tsx       # Card suggerimenti proattivi
└── drawers/
    └── DrawerImpostazioni.tsx # Drawer settings
```

### Logica core
```
lib/
├── nlu/
│   └── unified.ts             # 🔥 PATTERNS NLU - 100+ intent
├── crypto/
│   ├── CryptoService.ts       # Logica cifratura AES-256
│   └── CryptoProvider.tsx     # Context React per crypto
├── napoleon/
│   ├── analyzer.ts            # Genera suggerimenti
│   ├── triggers.ts            # Regole per suggerimenti
│   └── types.ts               # Tipi TypeScript
├── chat/
│   └── utils.ts               # stripMarkdownForTTS, numberToItalianWords
└── supabase/
    ├── client.ts              # Client browser
    └── server.ts              # Client server-side
```

### Database
```
app/data/
└── adapters.supabase.ts       # 🔥 TUTTE le query DB (4000+ righe)

supabase/
├── schema.sql                 # Schema completo
├── migrations/                # Migrazioni incrementali
└── seed-*.sql                 # Dati di test
```

### Hooks voce
```
hooks/
├── useVoice.ts                # Speech Recognition (browser + Whisper)
├── useTTS.ts                  # Text-to-Speech (OpenAI)
└── useConversations.ts        # Gestione chat/messaggi
```

---

## 🎯 STATO ATTUALE

### ✅ FUNZIONA
- **Login/Auth** con Supabase
- **Dashboard** con greeting, cards, Napoleone
- **Chat testuale** con NLU locale (100+ intent)
- **Crittografia E2E** per nomi clienti
- **Napoleone** suggerimenti proattivi (3 urgenti in card)
- **Import clienti** da CSV (formato: name, contact_name, city, address, tipo_locale, phone, email, vat_number, notes)
- **Visite/Vendite** registrazione e query

### ⚠️ PARZIALMENTE FUNZIONA
- **Modalità Dialogo (voce)**
  - TTS OpenAI funziona
  - SR (Speech Recognition) browser funziona MA:
    - A volte cattura il proprio TTS
    - Comando "basta" funziona ma a volte dice frasi strane alla chiusura
    - Numeri ancora letti in inglese occasionalmente

### ❌ DA FARE
- Test completo cross-browser (Safari, Firefox)
- Gestione errori voce più robusta
- Feedback giornaliero (popup implementato ma non testato)
- Push su store (PWA ready)

---

## 🔐 CRITTOGRAFIA

I dati sensibili (nomi clienti, email, telefono) sono **criptati client-side**:

```typescript
// Campi criptati in accounts:
name_enc, name_iv       // Nome cliente
email_enc, email_iv     // Email
phone_enc, phone_iv     // Telefono
// ecc.

// Campi in chiaro:
city, street, type, postal_code
```

**IMPORTANTE:** 
- La chiave deriva dalla passphrase utente
- `cryptoReady` deve essere `true` per decriptare
- Alcune query (es. `client_count`) NON richiedono crypto

---

## 🗣️ NLU - COME FUNZIONA

1. **Input utente** → `lib/nlu/unified.ts` (pattern matching)
2. **Intent riconosciuto** → `app/chat/planner.ts` (switch case)
3. **Query DB** → `app/data/adapters.supabase.ts`
4. **Risposta** → mostrata in chat (e letta se in Dialogo)

### Aggiungere un nuovo intent:
1. Aggiungi tipo in `IntentType` (lib/nlu/unified.ts, riga ~20)
2. Aggiungi patterns in `INTENT_PATTERNS` (riga ~730)
3. Aggiungi case in `runChatTurn_v2` (app/chat/planner.ts)
4. Implementa funzione in adapters.supabase.ts se serve query nuova

---

## 🎙️ VOCE - COME FUNZIONA

```
Dialogo attivo
     │
     ▼
TTS parla "Ciao [nome], ti ascolto"
     │
     ▼
Attende fine TTS (polling isTtsSpeaking)
     │
     ▼
Attiva Speech Recognition
     │
     ▼
Utente parla → trascrizione
     │
     ▼
Invia a NLU/planner
     │
     ▼
Risposta → TTS legge
     │
     ▼
Loop (o "basta" per uscire)
```

**File chiave:**
- `hooks/useVoice.ts` - SR logic
- `hooks/useTTS.ts` - TTS logic  
- `components/home/DialogOverlay.tsx` - UI overlay

---

## 🧪 TEST

```bash
# Test NLU
npm run test:nlu

# Dev server
npm run dev

# Build
npm run build
```

Test file: `test/run-nlu-tests.ts`, `test/nlu-queries.ts`

---

## 📊 DATABASE (Supabase)

### Tabelle principali:
| Tabella | Descrizione |
|---------|-------------|
| `accounts` | Clienti (criptati) |
| `visits` | Visite/chiamate |
| `products` | Prodotti catalogo |
| `notes` | Note su clienti |
| `messages` | Storico chat |
| `conversations` | Thread conversazioni |
| `napoleon_suggestions` | Suggerimenti proattivi |
| `profiles` | Profili utente + preferences |

### Query utili:
```sql
-- Conteggio clienti per utente
SELECT COUNT(*) FROM accounts WHERE user_id = 'uuid';

-- Visite ultimo mese
SELECT * FROM visits 
WHERE data_visita > NOW() - INTERVAL '30 days';

-- Suggerimenti attivi
SELECT * FROM napoleon_suggestions 
WHERE status = 'nuovo' 
ORDER BY priority DESC;
```

---

## 🚨 PROBLEMI NOTI

1. **Loop crypto** - Se vedi log infiniti `unlockWithPassphrase`, c'è un loop in CryptoProvider. Verifica useEffect dependencies.

2. **cryptoReady false** - Il polling si ferma dopo 3 sec. Se unlock è lento, la card Napoleone resta su "Analizzo...".

3. **Voce cattura se stessa** - Il mic parte prima che TTS finisca. Soluzione: aspettare `isTtsSpeaking() === false`.

4. **OpenAI inventa dati** - Se NLU non riconosce, va a OpenAI che risponde con dati sbagliati. Soluzione: estendere NLU.

---

## 🔧 ENVIRONMENT

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
OPENAI_API_KEY=sk-xxx
```

---

## 📦 PRODOTTI - STATO BETA

> **Decisione 11 Dic 2025:** Per la Beta, la gestione prodotti strutturata è **nascosta**.

### Cosa è NASCOSTO (riattivare per MULTIAGENT):
- Tab "PRODOTTI" nel drawer Gestione (`components/drawers/DrawerDati.tsx`)
- Step "Carica listino" nella checklist onboarding (`components/home/GettingStartedChecklist.tsx`)
- Intent NLU: `product_price`, `product_stock`, `product_missing`, `product_search` (`lib/nlu/unified.ts`)

### Cosa RESTA attivo:
- Campo testuale `prodotti_discussi` nelle visite
- Intent `product_discussed` ("Cosa ho discusso con Rossi?") - legge dal testo
- Intent `product_sold_to` ("Chi compra birra?") - cerca nel testo visite
- L'AI estrae pattern orientativi: "Questo cliente compra spesso vino"

### Perché:
- Agenti plurimandatari hanno N cataloghi diversi (impossibile gestirli tutti)
- Per la Beta basta annotare a testo cosa si vende
- La tabella `products` resta per MULTIAGENT futuro (catalogo condiviso aziendale)

### Per riattivare (MULTIAGENT):
Cerca `🔒 BETA` nei file commentati e decommenta.

---

## 👤 RUOLI E ACCESSI

### Ruoli disponibili (profiles.role):
| Ruolo | Descrizione | Come si ottiene |
|-------|-------------|-----------------|
| `tester` | Beta tester | Registrazione con token beta |
| `agente` | Utente standard | Default |
| `agente_premium` | Piano Business | Upgrade da admin |
| `admin` | Amministratore | Manuale in DB |

### Flusso registrazione Beta:
```
1. Utente inserisce token BETA-XXXXXXXX
2. API valida token (check_beta_token)
3. Registrazione Supabase Auth
4. Token marcato come usato (use_beta_token)
5. Ruolo impostato a 'tester'
6. Consensi GDPR salvati
7. Crittografia sbloccata con password
8. Redirect a home
```

### Generare token Beta:
```sql
-- Da Supabase SQL Editor (come admin)
SELECT generate_beta_token('Nota opzionale');
```

### Limiti per ruolo - BETA:
**Per la Beta tutti i tester hanno accesso BUSINESS completo (nessun limite).**

I limiti saranno applicati post-Beta:
- PREMIUM: 500 clienti, 60 query/giorno, 9 PDF/mese, no Modalità Guida
- BUSINESS: 1000 clienti, illimitato, Modalità Guida
- MULTIAGENT: Business + Dashboard Admin

### RLS (Row Level Security):
| Tabella | Chi può leggere | Chi può scrivere |
|---------|-----------------|------------------|
| `profiles` | Solo il proprio | Solo il proprio |
| `accounts` | Solo i propri | Solo i propri |
| `visits` | Solo le proprie | Solo le proprie |
| `products` | Tutti | Solo admin |
| `beta_tokens` | Tutti (validazione) | Solo admin |

---

## 📝 PROSSIMI PASSI SUGGERITI

1. **Voce** - Risolvere lettura numeri in italiano, stabilizzare SR/TTS timing
2. **NLU** - Aggiungere intent mancanti (es. "cliente più vecchio")
3. **Fallback sicuro** - Se NLU non riconosce query che richiede dati, rispondere "Non ho capito" invece di mandare a OpenAI
4. **Test** - Coverage su intent critici
5. **Beta release** - Test con utenti reali

---

## 👤 CONTATTI

- **Repo:** github.com/Paoloprimus/Venditori-Micidiali
- **Branch principale:** main

---

*Ultimo aggiornamento: 11 Dicembre 2025 (sera) - Aggiunto: Prodotti Beta, Ruoli e Accessi*

