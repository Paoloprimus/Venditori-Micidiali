# 📋 HANDOFF: Conversione REPING da Cloud USA a Mobile Locale + Server EU

**Data:** 6 Dicembre 2025  
**Versione:** 1.0  
**Destinatario:** Prossima sessione Cursor / Team sviluppo

---

## 1. NATURA E SCOPI DELL'APP REPING

### 1.1 Vision
**REPING** è un **AI CoPilot verticale** per agenti di commercio nel settore **HoReCa (Hotel, Ristoranti, Caffè)** in Italia.

### 1.2 Scopo Principale
Assistere gli agenti commerciali nella gestione quotidiana di:
- **Clienti** (anagrafica, note, contatti)
- **Visite** (calendario, esiti, fatturati)
- **Prodotti** (cataloghi, vendite)
- **Analytics** (top clienti, prodotti, zone, trend)
- **Planning** (visite programmate, callbacks)

### 1.3 Modello di Business
- **Target B2C:** 100-1000 agenti individuali
- **Target B2B:** 1-100 aziende (team di agenti)
- **Pricing:** Abbonamento mensile con trial gratuito, prezzi scalabili
- **Vantaggio competitivo:** Verticalizzazione AI su dominio HoReCa Italia (terminologia, prodotti, processi specifici)

### 1.4 Requisiti Critici
- ✅ **Privacy:** Dati clienti E2E encrypted (già implementato)
- ✅ **GDPR:** Compliance obbligatoria (EU hosting)
- ✅ **Voce:** Core feature (STT/TTS per modalità guida)
- ✅ **Offline-first:** Lavoro in campo senza connessione
- ✅ **Sincronizzazione:** Multi-device (smartphone + tablet)

---

## 2. STATO ATTUALE DELLO SVILUPPO

### 2.1 Completamento
**~85% completato** - App funzionante in produzione su `reping.app`

### 2.2 Feature Implementate ✅
- ✅ Autenticazione (Supabase Auth)
- ✅ Gestione clienti con E2E encryption (AES-256-GCM)
- ✅ Gestione visite (calendario, esiti, importi)
- ✅ Gestione prodotti
- ✅ Analytics base (top clienti, prodotti, zone, giorni)
- ✅ Planning (visite programmate, callbacks)
- ✅ Chat AI con NLU avanzato (60+ intent)
- ✅ Voice mode (STT Whisper + TTS OpenAI)
- ✅ Driving mode (`/driving` - modalità guida)
- ✅ Report PDF
- ✅ Dashboard

### 2.3 Da Completare ⚠️
1. **Voce:**
   - ✅ STT funziona (Whisper API)
   - ✅ TTS funziona (OpenAI TTS)
   - ⚠️ Driving mode: loop completo da testare su device reali
   - ⚠️ Browser compatibility: iOS Safari limitato

2. **Semantica/NLU:**
   - ✅ Core NLU completo (`lib/nlu/unified.ts` - 2200+ righe)
   - ✅ 60+ intent riconosciuti
   - ✅ Analytics tools implementati (OpenAI Function Calling)
   - ⚠️ Testing approfondito su query complesse
   - ⚠️ Fine-tuning su dataset reale

### 2.4 File Chiave Attuali
```
app/
├── driving/page.tsx              # Modalità guida (fix recenti)
├── chat/page.tsx                 # Chat principale
├── chat/planner.ts               # Orchestratore NLU → data
├── data/adapters.supabase.ts     # Data layer Supabase
├── api/messages/send/route.ts    # API chat (OpenAI)
├── api/voice/transcribe/route.ts # STT Whisper
└── api/voice/tts/route.ts        # TTS OpenAI

lib/
├── nlu/unified.ts                # Core NLU (2200+ righe)
├── ai/tools.ts                   # OpenAI Function Calling
├── ai/executor.ts                # Tool execution
└── crypto/                        # E2E Encryption

hooks/
├── useVoice.ts                   # Speech Recognition
└── useTTS.ts                     # Text-to-Speech
```

---

## 3. ARCHITETTURA E STACK TECNOLOGICO ATTUALE

### 3.1 Stack Frontend
- **Framework:** Next.js 14 (App Router)
- **Linguaggio:** TypeScript
- **UI:** React 18, CSS-in-JS
- **Deploy:** Vercel (USA)

### 3.2 Stack Backend
- **Database:** Supabase (PostgreSQL, USA)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage (opzionale)

### 3.3 Stack AI/ML
- **Chat AI:** OpenAI GPT-4o-mini / Claude 4.5 Opus (via API)
- **STT:** OpenAI Whisper API
- **TTS:** OpenAI TTS (voce "nova")
- **NLU:** Custom (`lib/nlu/unified.ts`) - pattern matching + context

### 3.4 Stack Encryption
- **Algoritmo:** AES-256-GCM
- **Scope:** Client-side (browser)
- **Campi cifrati:** `name_enc`, `contact_name_enc`, `email_enc`, `phone_enc`, `address_enc`, `vat_number_enc`
- **Blind Index:** Ricerca su dati cifrati

### 3.5 Architettura Dati
```
accounts (clienti)
├── name_enc, name_iv, name_bi (cifrato)
├── contact_name_enc, contact_name_iv
├── city, tipo_locale (non cifrato)
└── notes (non cifrato)

visits (visite)
├── account_id (FK)
├── data_visita, tipo, esito
├── importo_vendita
├── prodotti_discussi
└── notes

products (prodotti)
├── codice, descrizione_articolo
├── base_price, giacenza
└── custom fields
```

### 3.6 Costi Operativi Attuali (Stima 100 utenti)
- Supabase: ~$25-50/mese
- OpenAI API: ~$500-2000/mese (STT/TTS + Chat)
- Vercel: ~$20/mese
- **Totale: ~$545-2070/mese**

---

## 4. SCOPI E PUNTO D'ARRIVO DELLA CONVERSIONE

### 4.1 Situazione Attuale
**Da:** Cloud USA (Supabase + OpenAI API) + NLU/Cifratura locale (browser)

### 4.2 Punto d'Arrivo
**A:** App mobile locale (AI quantizzata) + Server EU (solo sync/backup/aggiornamenti)

### 4.3 Obiettivi della Conversione

#### 4.3.1 Tecnici
- ✅ **100% offline-first:** App funziona senza connessione
- ✅ **AI locale:** Llama 3.1 8B quantizzata (llama.cpp)
- ✅ **STT locale:** Whisper.cpp
- ✅ **TTS locale:** Piper TTS
- ✅ **Database locale:** SQLite
- ✅ **E2E Encryption:** Mantenuta (già implementata)

#### 4.3.2 Business
- ✅ **Costi operativi:** -95% (da ~$1,500/mese a ~€80/mese)
- ✅ **GDPR compliance:** Server EU (Aruba/Hetzner)
- ✅ **Privacy:** Dati mai in cloud (solo sync opzionale)
- ✅ **Scalabilità:** Costi lineari prevedibili

#### 4.3.3 Architettura Target
```
┌─────────────────────────────────────────┐
│  Mobile App (Tauri/React Native)       │
│  ├─ SQLite (dati locali)               │
│  ├─ Llama 3.1 8B Q4_K_M (llama.cpp)    │
│  ├─ Whisper.cpp (STT locale)            │
│  ├─ Piper TTS (TTS locale)             │
│  ├─ E2E Encryption (riuso codice)       │
│  └─ UI React (riuso ~70% codice)        │
└─────────────────────────────────────────┘
           ↕ Sync HTTPS/WebSocket
┌─────────────────────────────────────────┐
│  Sync Server EU (Minimal)               │
│  ├─ PostgreSQL (solo sync metadata)    │
│  ├─ WebSocket (real-time sync)          │
│  ├─ Auth (Supabase Auth o JWT custom)   │
│  └─ Backup automatico (opzionale)        │
└─────────────────────────────────────────┘
```

### 4.4 Cosa Rimane nel Server EU
- **Sincronizzazione:** Multi-device (smartphone ↔ tablet)
- **Backup:** Opzionale (dati cifrati)
- **Aggiornamenti:** AI models, app updates
- **Auth:** Autenticazione utente
- **Analytics:** Usage analytics (anonimi)

### 4.5 Cosa Va Locale
- **Database:** SQLite (tutti i dati)
- **AI Chat:** Llama 3.1 8B quantizzata
- **STT/TTS:** Whisper.cpp + Piper
- **NLU:** Custom (già locale, da adattare)
- **Encryption:** E2E (già locale)

---

## 5. FEATURE MVP vs APP COMPLETA

### 5.1 MVP Minimo (Settimane 1-4)
**Obiettivo:** App mobile funzionante standalone (offline-first)

#### Feature Core ✅
- ✅ Autenticazione (login/logout)
- ✅ Gestione clienti (CRUD + ricerca)
- ✅ Gestione visite (CRUD + calendario)
- ✅ Chat AI base (Llama 3.1 locale)
- ✅ Voice mode base (STT/TTS locale)
- ✅ E2E Encryption (riuso codice esistente)

#### Feature Rimosse per MVP ❌
- ❌ Analytics avanzati (top clienti, zone, trend)
- ❌ Report PDF
- ❌ Planning complesso (solo lista base)
- ❌ Dashboard avanzata
- ❌ Sincronizzazione multi-device (Fase 2)

#### Feature Semplificate 🔄
- 🔄 NLU: Intent base (20-30 vs 60+)
- 🔄 Voice: Driving mode semplificato
- 🔄 Prodotti: Lista base (no cataloghi complessi)

### 5.2 App Completa (Settimane 5-8)
**Obiettivo:** Feature complete + sync + ottimizzazioni

#### Feature Aggiunte ✅
- ✅ Analytics completi (top clienti, prodotti, zone, giorni)
- ✅ Planning avanzato (callbacks, programmazioni)
- ✅ Report PDF
- ✅ Dashboard completa
- ✅ Sincronizzazione multi-device
- ✅ NLU completo (60+ intent)
- ✅ Voice mode completo (driving mode)

#### Ottimizzazioni ✅
- ✅ Fine-tuning AI su dataset HoReCa
- ✅ Performance optimization
- ✅ UI/UX polish
- ✅ Test su device reali

### 5.3 Provider EU Consigliati

#### Opzione 1: Aruba 🇮🇹 (Raccomandato)
- **Vantaggi:** Italiano, GDPR compliant, supporto IT
- **Costi:** ~€50-80/mese (VPS 4GB RAM, 80GB SSD)
- **Location:** Data center Italia
- **Link:** https://www.aruba.it/

#### Opzione 2: Hetzner 🇩🇪
- **Vantaggi:** Prezzi competitivi, EU (Germania)
- **Costi:** ~€30-50/mese (CPX21: 3GB RAM, 80GB SSD)
- **Location:** Data center Germania/Francia
- **Link:** https://www.hetzner.com/

#### Opzione 3: DigitalOcean 🇳🇱
- **Vantaggi:** Developer-friendly, buona documentazione
- **Costi:** ~€40-60/mese (Basic Droplet 4GB RAM)
- **Location:** Data center Amsterdam
- **Link:** https://www.digitalocean.com/

**Raccomandazione:** **Aruba** per supporto locale e compliance italiana.

---

## 6. ROADMAP E TIMELINE DI SVILUPPO

### 6.1 Timeline Totale
**8 settimane** (2 mesi) per MVP completo + sync  
**12 settimane** (3 mesi) per app completa + ottimizzazioni

### 6.2 Fase 1: MVP Mobile (Settimane 1-4)

#### Settimana 1-2: Setup Mobile + Database
**Obiettivo:** App mobile base con database locale

**Task:**
- [ ] Setup Tauri 2.0 (Rust + React)
- [ ] Migrazione UI React da Next.js → Tauri
- [ ] Setup SQLite locale
- [ ] Migrazione schema database (accounts, visits, products)
- [ ] E2E Encryption: adattamento codice esistente
- [ ] Test CRUD base (clienti, visite)

**Deliverable:** App mobile con UI funzionante, database locale, encryption

#### Settimana 3: Integrazione AI Locale
**Obiettivo:** AI chat funzionante offline

**Task:**
- [ ] Setup llama.cpp (Llama 3.1 8B Q4_K_M)
- [ ] Integrazione React Native / Tauri
- [ ] Adattamento NLU (`lib/nlu/unified.ts`) per AI locale
- [ ] Setup Whisper.cpp (STT)
- [ ] Setup Piper TTS
- [ ] Test qualità AI vs OpenAI

**Deliverable:** Chat AI + Voice locale funzionanti

#### Settimana 4: Voice Core + Testing
**Obiettivo:** Voice mode completo

**Task:**
- [ ] Integrazione STT/TTS in app
- [ ] Driving mode mobile
- [ ] Test su device reali (Android/iOS)
- [ ] Ottimizzazione performance
- [ ] Fix bug critici

**Deliverable:** MVP mobile standalone funzionante

### 6.3 Fase 2: Sync Server EU (Settimane 5-6)

#### Settimana 5: Sync Server
**Obiettivo:** Server EU minimale per sync

**Task:**
- [ ] Setup server (Aruba/Hetzner)
- [ ] PostgreSQL database (solo sync metadata)
- [ ] WebSocket server (real-time sync)
- [ ] CRDT implementation (conflict resolution)
- [ ] Auth (Supabase Auth o JWT custom)
- [ ] API sync endpoints

**Deliverable:** Server EU funzionante

#### Settimana 6: Integrazione Sync
**Obiettivo:** Sincronizzazione multi-device

**Task:**
- [ ] Client sync in app mobile
- [ ] Background sync
- [ ] Conflict resolution UI
- [ ] Test multi-device (smartphone ↔ tablet)
- [ ] Performance optimization

**Deliverable:** Sync funzionante

### 6.4 Fase 3: Ottimizzazione e Deploy (Settimane 7-8)

#### Settimana 7: Ottimizzazioni
**Obiettivo:** Performance e qualità

**Task:**
- [ ] Fine-tuning Llama 3.1 su dataset HoReCa
- [ ] Ottimizzazione NLU per AI locale
- [ ] UI/UX polish
- [ ] Test su device entry-level
- [ ] Bug fixes

**Deliverable:** App ottimizzata

#### Settimana 8: Deploy e Testing
**Obiettivo:** Produzione-ready

**Task:**
- [ ] App Store / Play Store setup
- [ ] Beta testing con utenti reali
- [ ] Fix critici
- [ ] Documentazione utente
- [ ] Monitoraggio errori

**Deliverable:** App in produzione

### 6.5 Fase 4: Feature Complete (Settimane 9-12) - Opzionale

#### Settimane 9-10: Analytics + Planning
- [ ] Analytics completi (top clienti, prodotti, zone)
- [ ] Planning avanzato
- [ ] Report PDF

#### Settimane 11-12: Polish + Scale
- [ ] Dashboard completa
- [ ] NLU completo (60+ intent)
- [ ] Performance finali
- [ ] Marketing materials

---

## 7. PREVISIONE AGENTE CURSOR E COSTI

### 7.1 Agente Cursor Consigliato

#### Per Sviluppo Mobile (Fase 1-2)
**Agente:** **Auto (Claude Sonnet)**  
**Motivo:** 
- Task ripetitivi (migrazione codice, setup)
- Costo-efficacia per refactoring
- Buona qualità per TypeScript/Rust

#### Per Ottimizzazioni AI (Fase 3)
**Agente:** **Claude Opus 4.5**  
**Motivo:**
- Fine-tuning AI richiede ragionamento complesso
- Ottimizzazione performance critica
- Debug problemi AI/ML

#### Strategia Ibrida
- **70% Auto (Sonnet):** Task routine, migrazione, setup
- **30% Opus 4.5:** Problemi complessi, ottimizzazioni AI, architettura

### 7.2 Stima Costi Cursor (8 settimane)

#### Scenario Conservativo (Auto + Opus 30%)
- **Auto (Sonnet):** ~$0.01-0.02 per request
- **Opus 4.5:** ~$0.05-0.10 per request
- **Utilizzo stimato:** 
  - 4-6 ore/giorno × 5 giorni/settimana × 8 settimane = 160-240 ore
  - ~500-800 requests totali
  - 70% Auto (350-560 req) × $0.015 = $5-8
  - 30% Opus (150-240 req) × $0.075 = $11-18
  - **Totale: ~$16-26**

#### Scenario Realistico (Opus 50%)
- **Utilizzo:** 6-8 ore/giorno (sessioni intensive)
- ~800-1200 requests totali
- 50% Auto (400-600 req) × $0.015 = $6-9
- 50% Opus (400-600 req) × $0.075 = $30-45
  - **Totale: ~$36-54**

#### Scenario Ottimistico (Ultra $200/mese)
- **Costo fisso:** $200/mese × 2 mesi = **$400**
- **Vantaggio:** Zero preoccupazioni, illimitato
- **Break-even:** Se >$200 di on-demand, conviene

### 7.3 Raccomandazione
**Per questa operazione:**
- **Settimane 1-4 (MVP):** Auto (Sonnet) - risparmio
- **Settimane 5-8 (Sync + Deploy):** Mix Auto/Opus
- **Totale stimato:** $30-60 (on-demand) o $400 (Ultra 2 mesi)

**Se budget stretto:** On-demand con Auto prioritario  
**Se vuoi tranquillità:** Ultra per 2 mesi

---

## 8. NOTE TECNICHE IMPORTANTI

### 8.1 Migrazione Codice
- **UI React:** ~70% riutilizzabile (componenti, hooks)
- **Business Logic:** ~80% riutilizzabile (NLU, encryption, data layer)
- **API Routes:** Da convertire in Tauri commands
- **Database:** Da Supabase → SQLite (schema simile)

### 8.2 AI Locale - Considerazioni
- **Llama 3.1 8B Q4_K_M:** ~5GB, qualità ~85% GPT-4
- **Fine-tuning:** Necessario per dominio HoReCa (dataset 500-1000 esempi)
- **Performance:** 1-3s per risposta (vs 2-5s OpenAI)
- **Hardware minimo:** 4GB RAM, 10GB storage

### 8.3 Voice Locale - Considerazioni
- **Whisper.cpp base:** ~150MB, qualità ~90% OpenAI
- **Piper TTS:** ~50MB, qualità ~80% OpenAI (accettabile)
- **Alternativa:** Mantenere OpenAI TTS come fallback (opzionale)

### 8.4 Sincronizzazione - Architettura
- **CRDT (Conflict-free Replicated Data Types):** Per conflict resolution
- **WebSocket:** Real-time sync
- **Batch sync:** Fallback se WebSocket non disponibile
- **Encryption:** Dati sempre cifrati in transito (HTTPS/TLS)

---

## 9. RISCHI E MITIGAZIONI

### 9.1 Rischi Tecnici
1. **Qualità AI inferiore**
   - Mitigazione: Fine-tuning su dataset HoReCa
   - Fallback: Opzione cloud per utenti premium

2. **Performance mobile**
   - Mitigazione: Quantizzazione Q4, ottimizzazioni
   - Test su device entry-level

3. **Sincronizzazione complessa**
   - Mitigazione: CRDT, test multi-device
   - Rollback automatico in caso di conflitti

### 9.2 Rischi Commerciali
1. **Timeline ottimistica**
   - Mitigazione: MVP ridotto, feature essenziali
   - Buffer: +2 settimane per imprevisti

2. **Adozione utenti**
   - Mitigazione: Trial gratuito, onboarding
   - Supporto attivo

---

## 10. PROSSIMI PASSI IMMEDIATI

1. **Conferma provider EU:** Aruba vs Hetzner vs DigitalOcean
2. **Setup ambiente sviluppo:** Tauri 2.0, llama.cpp, Whisper.cpp
3. **Migrazione UI:** Primi componenti React → Tauri
4. **Test AI locale:** Qualità Llama 3.1 vs OpenAI
5. **Roadmap dettagliata:** Task breakdown settimanale

---

## 11. RIFERIMENTI E LINK

- **Repo attuale:** `/Users/paolo.olivato/Desktop/Venditori-Micidiali`
- **Produzione:** https://reping.app
- **Documentazione NLU:** `docs/nlu/intent_policy_v1_draft.md`
- **Tauri:** https://tauri.app/
- **llama.cpp:** https://github.com/ggerganov/llama.cpp
- **Whisper.cpp:** https://github.com/ggerganov/whisper.cpp
- **Piper TTS:** https://github.com/rhasspy/piper

---

**Fine Handoff**

