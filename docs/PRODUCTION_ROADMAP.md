# 🚀 ROADMAP TO PRODUCTION - REPPING v1.0

**Data**: 2 Dicembre 2025  
**Target Release**: Q1 2026  
**Status**: BETA → PRODUCTION

---

## 📊 PROGRESS TRACKER

| Fase | Descrizione | Status | Priority |
|------|-------------|--------|----------|
| 1 | Semantica Avanzata | ✅ 100% | 🔴 CRITICA |
| 2 | Voce & Dialogo | 🟡 80% | 🔴 CRITICA |
| 3 | Ruoli & Credenziali | ✅ 100% | 🟡 ALTA |
| 4 | Dashboard Admin | 🟡 50% | 🟡 ALTA |
| 5 | Legal & Privacy | ✅ 100% | 🔴 CRITICA |
| 6 | Sito reping.it | ⬜ 0% | 🟢 MEDIA |
| 7 | Onboarding | ⬜ 0% | 🟡 ALTA |
| 8 | Mobile UX | ⬜ 0% | 🟡 ALTA |
| 9 | Offline Mode | ⬜ 0% | 🟢 MEDIA |
| 10 | Documentazione | ⬜ 0% | 🟢 MEDIA |

---

## 1️⃣ SEMANTICA AVANZATA
**Priority: 🔴 CRITICA** ✅ COMPLETATA

### Obiettivo
L'assistente deve capire il linguaggio naturale come un umano, non solo pattern matching.

### Tasks
- [x] **1.1** Migliorare context retention (ricordare ultimi 5-10 scambi)
- [x] **1.2** Gestire domande composite ("clienti di Verona che hanno comprato vino")
- [ ] ~~**1.3** Sinonimi e varianti linguistiche regionali~~ (deprioritizzato)
- [x] **1.4** Intent chaining (un intent che ne triggera un altro)
- [x] **1.5** Fallback intelligente ("Non ho capito, intendi X o Y?")
- [x] **1.6** Suggerimenti proattivi ("Hai 3 clienti da richiamare oggi")

### 🆕 Implementazioni Extra
- [x] Query geografiche (fatturato/km, clienti vicini, km percorsi)
- [x] Routing stradale reale via OSRM
- [x] ~40 nuovi intent riconosciuti

### Metriche
- Intent recognition accuracy: >95%
- Context retention: 5+ turni
- User satisfaction: >4/5

---

## 2️⃣ VOCE & DIALOGO
**Priority: 🔴 CRITICA** 🟡 80%

### Obiettivo
Uso hands-free completo: l'agente parla, l'app risponde, senza toccare lo schermo.

### Tasks
- [ ] **2.1** Wake word detection ("Hey Repping") - *opzionale*
- [x] **2.2** Continuous listening mode (auto-send dopo 1.5s pausa)
- [x] **2.3** Voice feedback per ogni azione (TTS automatico + beep mic ready)
- [x] **2.4** Gestione interruzioni ("Stop", "Aspetta", "Ripeti", "Basta", "Aiuto")
- [x] **2.5** Multi-turn dialoghi vocali (context retention dalla Fase 1)
- [ ] **2.6** Test con rumore ambientale (auto, bar, strada)
- [ ] **2.7** Accenti regionali italiani

### 🆕 Implementazioni Extra
- [x] **Driving Mode UI** - Schermo `/driving` ottimizzato per guida
  - Bottone gigante 280px, waveform audio, zero tastiera
  - Comandi vocali: "Torna a casa" per uscire
- [x] Accesso rapido da Dashboard e Impostazioni
- [x] Beep audio (880Hz) quando mic pronto

### Metriche
- Speech recognition accuracy: >90% in ambiente rumoroso
- Latenza risposta TTS: <2s
- Hands-free task completion: >80%

---

## 3️⃣ RUOLI & CREDENZIALI
**Priority: 🟡 ALTA** ✅ COMPLETATA

### Obiettivo
Sistema di permessi per diversi tipi di utenti.

### Ruoli Implementati
| Ruolo | Descrizione | Permessi |
|-------|-------------|----------|
| `admin` | Amministratore (max 2) | Vede tutto (no decrypt), gestisce ruoli |
| `agente` | Agente base | Solo i propri dati, limiti servizio base |
| `agente_premium` | Agente premium | Solo i propri dati, limiti elevati |

### Limiti di Servizio
| Funzionalità | Agente | Premium |
|-------------|--------|---------|
| Query chat/giorno | 30 | 300 |
| Storico visibile | 90 giorni | Illimitato |
| Export PDF/mese | 3 | Illimitato |
| Analytics avanzati | ❌ | ✅ |
| Report dettagliati | ❌ | ✅ |

### Tasks Completati
- [x] **3.1** Tabella `service_limits` e `usage_tracking`
- [x] **3.2** RLS policies per ruolo (admin vede tutto, agenti solo propri dati)
- [x] **3.3** UI per assegnazione ruoli (`/admin/users`)
- [x] **3.4** Trigger max 2 admin
- [x] **3.5** Funzioni helper: `can_use_feature()`, `increment_usage()`

### Sicurezza
- ✅ Admin può vedere statistiche aggregate ma NON può decifrare dati clienti
- ✅ Cifratura client-side mantiene privacy anche con accesso admin
- ✅ Rate limiting con messaggio upsell Premium

---

## 4️⃣ DASHBOARD ADMIN
**Priority: 🟡 ALTA** 🟡 50% (base completata, da migliorare)

### Obiettivo
Pannello di controllo per admin/manager.

### Tasks Completati (Base)
- [x] **4.1** Overview KPI team (vendite, visite, clienti)
- [x] **4.2** Classifica agenti (top 5 per visite)
- [x] **4.3** Gestione utenti con cambio ruolo (`/admin/users`)
- [x] **4.4** Statistiche uso (`/admin/usage`)

### ⚠️ DA RIPENSARE (Post-Beta)
La dashboard va arricchita con informazioni realmente utili all'admin:
- [ ] **Tipo di query**: categorizzare le domande (clienti, prodotti, visite, analytics)
- [ ] **Tentativi ripetuti**: rilevare utenti che fanno la stessa domanda più volte (problema UX?)
- [ ] **Tipo di PDF**: quali report vengono esportati (clienti, visite, fatturato)
- [ ] **Query fallite**: domande senza risposta o con errore
- [ ] **Pattern d'uso**: orari di picco, giorno settimana più attivo
- [ ] **Funnel conversione**: quanti passano da agente a premium
- [ ] **4.5** Mappa attività in tempo reale
- [ ] **4.6** Export dati CSV/Excel
- [ ] **4.7** Configurazione aziendale
- [ ] **4.8** Billing & subscription (se SaaS)

---

## 5️⃣ LEGAL & PRIVACY
**Priority: 🔴 CRITICA (bloccante per release)** ✅ COMPLETATA

### Obiettivo
Conformità GDPR (Reg. UE 2016/679) e normative italiane. 
**ATTENZIONE**: Questa fase è delicata e richiede precisione legale.

---

### 📋 5.A - DOCUMENTI LEGALI

| Doc | Descrizione | Obbligatorio | Note |
|-----|-------------|--------------|------|
| **Privacy Policy** | Come trattiamo i dati personali | ✅ Sì | Art. 13-14 GDPR |
| **Cookie Policy** | Quali cookie usiamo | ✅ Sì | Direttiva ePrivacy |
| **Termini di Servizio** | Regole d'uso dell'app | ✅ Sì | Contratto utente |
| **DPA** | Data Processing Agreement | Solo B2B | Se vendiamo ad aziende |

#### 5.A.1 Privacy Policy - Contenuti minimi
- [ ] **Titolare del trattamento**: Nome, indirizzo, email, PEC
- [ ] **DPO**: Nominato se >250 utenti o dati sensibili
- [ ] **Finalità**: Perché raccogliamo i dati
- [ ] **Base giuridica**: Consenso, contratto, legittimo interesse
- [ ] **Categorie dati**: Anagrafici, contatti, geolocalizzazione, uso app
- [ ] **Destinatari**: Chi riceve i dati (Supabase, OpenAI, Vercel)
- [ ] **Trasferimenti extra-UE**: OpenAI (USA) → serve clausola SCC
- [ ] **Periodo conservazione**: Quanto teniamo i dati
- [ ] **Diritti utente**: Accesso, rettifica, cancellazione, portabilità
- [ ] **Reclamo al Garante**: Come contattare il Garante Privacy

#### 5.A.2 Cookie Policy - Contenuti minimi
- [ ] **Cookie tecnici**: Sessione, preferenze (no consenso)
- [ ] **Cookie analytics**: Google Analytics, Vercel Analytics (consenso)
- [ ] **Cookie terze parti**: Nessuno previsto
- [ ] **Come disabilitarli**: Istruzioni per browser

#### 5.A.3 Termini di Servizio - Contenuti minimi
- [ ] **Descrizione servizio**: Cos'è REPPING
- [ ] **Requisiti**: Età minima, account aziendale
- [ ] **Obblighi utente**: Uso lecito, no reverse engineering
- [ ] **Proprietà intellettuale**: Marchi, codice, contenuti
- [ ] **Limitazione responsabilità**: Disclaimer AI
- [ ] **Piani e pagamenti**: Free/Premium, fatturazione
- [ ] **Risoluzione**: Come cancellare account
- [ ] **Legge applicabile**: Italia, Foro competente
- [ ] **Modifiche**: Come notifichiamo cambiamenti

---

### 🛡️ 5.B - IMPLEMENTAZIONE TECNICA

#### 5.B.1 Banner Cookie (Prima visita)
```
┌─────────────────────────────────────────────────────────┐
│ 🍪 Questo sito utilizza cookie tecnici e analytics.    │
│                                                         │
│ [Accetta tutti]  [Solo necessari]  [Personalizza]      │
│                                                         │
│ Leggi la Cookie Policy                                 │
└─────────────────────────────────────────────────────────┘
```
- [ ] Componente `CookieBanner.tsx`
- [ ] Salvataggio preferenze in `localStorage`
- [ ] Blocco script analytics fino a consenso
- [ ] Non mostrare se già accettato

#### 5.B.2 Consensi in Registrazione
```
┌─────────────────────────────────────────────────────────┐
│ ☐ Ho letto e accetto i Termini di Servizio *           │
│ ☐ Ho letto la Privacy Policy *                         │
│ ☐ Acconsento all'invio di comunicazioni marketing      │
│                                                         │
│ * Obbligatori per registrarsi                          │
└─────────────────────────────────────────────────────────┘
```
- [ ] Checkbox in `/login` (signup)
- [ ] Tabella `consents` per log
- [ ] Timestamp + IP + versione documento
- [ ] Blocco registrazione senza consensi obbligatori

#### 5.B.3 Pagina "I Miei Dati" (GDPR Art. 15-20)
- [ ] **Visualizza dati**: Mostra tutti i dati personali
- [ ] **Export dati**: Download JSON/CSV (portabilità)
- [ ] **Modifica dati**: Rettifica anagrafici
- [ ] **Cancella account**: Diritto all'oblio
- [ ] **Revoca consensi**: Marketing, analytics
- [ ] **Storico consensi**: Quando hai accettato cosa

#### 5.B.4 Log Consensi (Audit)
```sql
CREATE TABLE consents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  consent_type TEXT,  -- 'tos', 'privacy', 'marketing', 'cookie_analytics'
  granted BOOLEAN,
  document_version TEXT,  -- es. 'privacy_v1.2'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ
);
```

---

### ⚠️ 5.C - CRITICITÀ SPECIFICHE REPPING

| Aspetto | Rischio | Mitigazione |
|---------|---------|-------------|
| **Dati cifrati client-side** | Utente perde passphrase → perde dati | Disclaimer chiaro + backup opzionale |
| **OpenAI (USA)** | Trasferimento extra-UE | SCC + DPA con OpenAI |
| **Geolocalizzazione** | Dato sensibile | Consenso esplicito |
| **Dati clienti HoReCa** | Sono dati di terzi | L'utente è responsabile |
| **AI generativa** | Risposte errate | Disclaimer "AI può sbagliare" |

---

### 📝 5.D - TASK BREAKDOWN

| # | Task | Priorità | Status |
|---|------|----------|--------|
| 5.1 | Scrivere Privacy Policy | 🔴 | ✅ |
| 5.2 | Scrivere Cookie Policy | 🔴 | ✅ |
| 5.3 | Scrivere Termini di Servizio | 🔴 | ✅ |
| 5.4 | Componente CookieBanner | 🔴 | ✅ |
| 5.5 | Checkbox consensi in signup | 🔴 | ✅ |
| 5.6 | Tabella `consents` + migrazione | 🔴 | ✅ |
| 5.7 | Pagina `/legal/privacy` | 🟡 | ✅ |
| 5.8 | Pagina `/legal/terms` | 🟡 | ✅ |
| 5.9 | Pagina `/legal/cookies` | 🟡 | ✅ |
| 5.10 | Pagina `/settings/my-data` | 🟡 | ✅ |
| 5.11 | Export dati personali | 🟡 | ✅ |
| 5.12 | Cancellazione account | 🟡 | ✅ |
| 5.13 | Revisione legale (opzionale) | 🟢 | ⏳ Esterno |

**Completato**: 2 Dicembre 2025

---

### ✅ CHECKLIST PRE-RELEASE

- [x] Privacy Policy online e linkata nel footer
- [x] Cookie Policy online e linkata nel banner
- [x] Termini di Servizio online e linkati nel footer
- [x] Banner cookie funzionante
- [x] Consensi obbligatori in registrazione
- [x] Pagina "I miei dati" accessibile
- [x] Export dati funzionante
- [x] Cancellazione account funzionante
- [x] Log consensi attivo
- [ ] DPA con OpenAI verificato (⚠️ da verificare manualmente)
- [ ] Email PEC per comunicazioni legali (⚠️ da configurare)

---

## 6️⃣ SITO reping.it
**Priority: 🟢 MEDIA**

### Obiettivo
Landing page commerciale per acquisizione clienti.

### Sezioni
- [ ] **6.1** Hero con value proposition
- [ ] **6.2** Features showcase
- [ ] **6.3** Pricing (Free, Pro, Enterprise)
- [ ] **6.4** Testimonials / Case studies
- [ ] **6.5** FAQ
- [ ] **6.6** Blog / Risorse
- [ ] **6.7** CTA → Sign up / Demo
- [ ] **6.8** Footer (legal, contatti, social)

### Tech Stack Suggerito
- Next.js (stesso stack app)
- Vercel hosting
- Strapi/Contentful per CMS

---

## 7️⃣ ONBOARDING
**Priority: 🟡 ALTA**

### Obiettivo
Guidare il nuovo utente nei primi 5 minuti.

### Flow
```
1. Registrazione → Email verification
2. Welcome screen → "Ciao [nome]!"
3. Setup passphrase → Spiegazione privacy
4. Import clienti → CSV o manuale
5. Prima visita guidata → Tour UI
6. "Prova a chiedere: quanti clienti ho?"
```

### Tasks
- [ ] **7.1** Wizard multi-step
- [ ] **7.2** Tooltip contestuali
- [ ] **7.3** Video tutorial embedded
- [ ] **7.4** Checklist "Getting Started"
- [ ] **7.5** Email drip campaign (Day 1, 3, 7)

---

## 8️⃣ MOBILE UX
**Priority: 🟡 ALTA**

### Obiettivo
Esperienza mobile-first (80% uso previsto da smartphone).

### Tasks
- [ ] **8.1** Test su iOS Safari
- [ ] **8.2** Test su Android Chrome
- [ ] **8.3** PWA manifest (install as app)
- [ ] **8.4** Touch gestures (swipe drawer)
- [ ] **8.5** Bottom navigation bar
- [ ] **8.6** Keyboard handling (input non coperto)
- [ ] **8.7** Landscape mode

---

## 9️⃣ OFFLINE MODE
**Priority: 🟢 MEDIA**

### Obiettivo
Funzionamento base senza connessione.

### Scope Offline
- [ ] **9.1** Cache clienti locali (IndexedDB)
- [ ] **9.2** Queue visite offline → sync quando online
- [ ] **9.3** Indicatore stato connessione
- [ ] **9.4** Conflict resolution (last-write-wins)

---

## 🔟 DOCUMENTAZIONE
**Priority: 🟢 MEDIA**

### Tasks
- [ ] **10.1** README.md completo
- [ ] **10.2** Guida utente (PDF/web)
- [ ] **10.3** FAQ
- [ ] **10.4** Changelog versioni
- [ ] **10.5** API docs (se esposta)

---

## 📅 TIMELINE SUGGERITA

```
Dicembre 2025
├── Week 1-2: Semantica (1.1-1.3)
└── Week 3-4: Voce (2.1-2.4)

Gennaio 2026
├── Week 1: Legal (5.1-5.4) ⚠️ BLOCCANTE
├── Week 2: Ruoli (3.1-3.3)
├── Week 3: Onboarding (7.1-7.3)
└── Week 4: Mobile UX (8.1-8.5)

Febbraio 2026
├── Week 1: Dashboard Admin (4.1-4.4)
├── Week 2: Sito reping.it (6.1-6.4)
├── Week 3: Testing & Bug fixes
└── Week 4: SOFT LAUNCH 🚀

Marzo 2026
├── Week 1-2: Feedback & iterations
└── Week 3-4: PUBLIC LAUNCH 🎉
```

---

## ✅ DEFINITION OF DONE

Per considerare REPPING "production-ready":

- [ ] Tutti i task 🔴 CRITICA completati
- [ ] Tutti i task 🟡 ALTA completati
- [ ] Privacy Policy online e accettata
- [ ] 10+ beta tester reali (agenti veri)
- [ ] <1% crash rate
- [ ] <3s page load
- [ ] Mobile score Lighthouse >80

---

**Ultimo aggiornamento**: 2 Dicembre 2025

*Questo documento è la nostra North Star. Aggiorniamolo ad ogni progresso!*

