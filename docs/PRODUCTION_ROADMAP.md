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
| 4 | Dashboard Admin | ⬜ 0% | 🟡 ALTA |
| 5 | Legal & Privacy | ⬜ 0% | 🔴 CRITICA |
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
**Priority: 🟡 ALTA**

### Obiettivo
Pannello di controllo per admin/manager.

### Funzionalità
- [ ] **4.1** Overview KPI team (vendite, visite, clienti)
- [ ] **4.2** Classifica agenti
- [ ] **4.3** Mappa attività in tempo reale
- [ ] **4.4** Gestione utenti (CRUD)
- [ ] **4.5** Configurazione aziendale (logo, colori, termini)
- [ ] **4.6** Export dati CSV/Excel
- [ ] **4.7** Billing & subscription (se SaaS)

---

## 5️⃣ LEGAL & PRIVACY
**Priority: 🔴 CRITICA (bloccante per release)**

### Obiettivo
Conformità GDPR e normative italiane.

### Documenti Richiesti
- [ ] **5.1** Privacy Policy (trattamento dati)
- [ ] **5.2** Cookie Policy
- [ ] **5.3** Termini di Servizio
- [ ] **5.4** Consenso esplicito al primo accesso
- [ ] **5.5** Diritto all'oblio (cancellazione dati)
- [ ] **5.6** Data Processing Agreement (se B2B)
- [ ] **5.7** Nomina DPO (se >250 utenti)

### Implementazione
- [ ] Banner cookie
- [ ] Checkbox consensi in registrazione
- [ ] Pagina "I miei dati" con export/delete
- [ ] Log dei consensi

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

