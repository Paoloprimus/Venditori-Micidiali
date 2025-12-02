# 🧪 TESTING ROADMAP - Venditori Micidiali v1.0

**Data**: 2 Dicembre 2025  
**Autore**: Engineering Team  
**Versione**: 1.0 BETA

---

## 📋 INDICE

1. [Executive Summary](#1-executive-summary)
2. [Architettura Sistema](#2-architettura-sistema)
3. [Piano di Testing](#3-piano-di-testing)
4. [Fase 1: Unitarietà](#4-fase-1-unitarietà)
5. [Fase 2: Integrazione](#5-fase-2-integrazione)
6. [Fase 3: Logica](#6-fase-3-logica)
7. [Fase 4: Sicurezza](#7-fase-4-sicurezza)
8. [Metriche e KPI](#8-metriche-e-kpi)
9. [Checklist Finale](#9-checklist-finale)

---

## 1. EXECUTIVE SUMMARY

### Obiettivo
Verificare la qualità, sicurezza e robustezza dell'applicazione "Venditori Micidiali" - un assistente AI per agenti di commercio con:
- Gestione clienti cifrata end-to-end
- Assistente vocale NLU-based
- Planning visite con ottimizzazione
- Generazione report PDF

### Scope
| Area | Componenti | Priorità |
|------|------------|----------|
| Frontend | 25+ pagine React/Next.js | Alta |
| Backend | 35+ API routes | Critica |
| Crypto | CryptoService, AES-256-GCM | Critica |
| NLU | Intent classifier, Function Calling | Alta |
| Database | Supabase + RLS | Critica |

### Timeline Stimata
- **Fase 1 (Unitarietà)**: 1-2 giorni
- **Fase 2 (Integrazione)**: 2-3 giorni
- **Fase 3 (Logica)**: 1-2 giorni
- **Fase 4 (Sicurezza)**: 2-3 giorni
- **Totale**: 6-10 giorni

---

## 2. ARCHITETTURA SISTEMA

### 2.1 Stack Tecnologico
```
┌─────────────────────────────────────────────┐
│                 FRONTEND                     │
│  Next.js 14 + React 18 + TailwindCSS        │
├─────────────────────────────────────────────┤
│                 MIDDLEWARE                   │
│  API Routes + Server Components             │
├─────────────────────────────────────────────┤
│                 SERVICES                     │
│  OpenAI GPT-4 │ Supabase │ CryptoService    │
├─────────────────────────────────────────────┤
│                 DATABASE                     │
│  PostgreSQL (Supabase) + Row Level Security │
└─────────────────────────────────────────────┘
```

### 2.2 Moduli Principali
| Modulo | Path | Responsabilità |
|--------|------|----------------|
| `lib/crypto/` | CryptoService.ts | Cifratura E2E |
| `lib/nlu/` | unified.ts | Natural Language |
| `lib/pdf/` | generator.ts | Report PDF |
| `lib/supabase/` | client.ts, admin.ts | Database |
| `app/api/` | 35+ route.ts | REST API |
| `hooks/` | useConversations.ts | State management |

### 2.3 Flusso Dati Critici
```
[User Input] → [NLU Parser] → [Function Calling] → [Supabase]
                    ↓                                  ↓
              [Intent Match]                    [Crypto Layer]
                    ↓                                  ↓
              [LLM Response] ← ← ← ← ← ← ← ← [Decrypt/Format]
```

---

## 3. PIANO DI TESTING

### 3.1 Metodologia
- **Unit Testing**: Jest + Testing Library
- **Integration Testing**: API testing manuale + automatico
- **E2E Testing**: Scenari utente completi
- **Security Audit**: OWASP checklist

### 3.2 Priorità Test
```
CRITICO  ████████████████████  Crypto, Auth, RLS
ALTO     ████████████████      API, NLU, Data flow
MEDIO    ████████████          UI, UX, Performance
BASSO    ████████              Edge cases, i18n
```

---

## 4. FASE 1: UNITARIETÀ

### 4.1 Obiettivo
Verificare che ogni modulo sia autonomo, ben definito e con dipendenze esplicite.

### 4.2 Checklist Moduli

#### 🔐 lib/crypto/
| Test | Descrizione | Status |
|------|-------------|--------|
| UNIT-C01 | CryptoService.encrypt() produce output deterministico | ⬜ |
| UNIT-C02 | CryptoService.decrypt() inverte encrypt() | ⬜ |
| UNIT-C03 | AAD mismatch causa errore | ⬜ |
| UNIT-C04 | Passphrase errata causa errore | ⬜ |
| UNIT-C05 | decryptFields() gestisce campi mancanti | ⬜ |

#### 🧠 lib/nlu/
| Test | Descrizione | Status |
|------|-------------|--------|
| UNIT-N01 | parseIntent() riconosce 20+ intent | ⬜ |
| UNIT-N02 | Entity extraction (città, tipo_locale) | ⬜ |
| UNIT-N03 | Gestione input vuoto/malformato | ⬜ |
| UNIT-N04 | Case-insensitive matching | ⬜ |

#### 📄 lib/pdf/
| Test | Descrizione | Status |
|------|-------------|--------|
| UNIT-P01 | generateReportListaClienti() produce Blob | ⬜ |
| UNIT-P02 | PDF contiene header corretto | ⬜ |
| UNIT-P03 | Tabella clienti renderizzata | ⬜ |
| UNIT-P04 | Caratteri speciali gestiti | ⬜ |

#### 🗄️ lib/supabase/
| Test | Descrizione | Status |
|------|-------------|--------|
| UNIT-S01 | createClient() ritorna istanza valida | ⬜ |
| UNIT-S02 | createSupabaseServer() usa cookie auth | ⬜ |
| UNIT-S03 | getSupabaseAdmin() bypassa RLS | ⬜ |

### 4.3 Metriche Unitarietà
- **Coupling**: Ogni modulo max 3 dipendenze dirette
- **Cohesion**: Single Responsibility per file
- **Size**: Max 500 LOC per file

---

## 5. FASE 2: INTEGRAZIONE

### 5.1 Obiettivo
Verificare che i moduli comunichino correttamente tra loro.

### 5.2 Scenari di Integrazione

#### 🔄 Flusso Autenticazione
| Test | Descrizione | Status |
|------|-------------|--------|
| INT-A01 | Login → Session → API protected | ⬜ |
| INT-A02 | Logout invalida sessione | ⬜ |
| INT-A03 | Token scaduto → redirect login | ⬜ |

#### 🔄 Flusso Crypto + Database
| Test | Descrizione | Status |
|------|-------------|--------|
| INT-CD01 | Salva cliente → dati cifrati in DB | ⬜ |
| INT-CD02 | Leggi cliente → decifratura corretta | ⬜ |
| INT-CD03 | Update cliente → re-cifratura | ⬜ |
| INT-CD04 | Passphrase cambio → rewrap MK | ⬜ |

#### 🔄 Flusso Chat + NLU + API
| Test | Descrizione | Status |
|------|-------------|--------|
| INT-CN01 | "Quanti clienti ho?" → search_clients → risposta | ⬜ |
| INT-CN02 | "Lista clienti Verona" → filtro città | ⬜ |
| INT-CN03 | "Genera PDF" → download attivato | ⬜ |
| INT-CN04 | Context mantenuto tra messaggi | ⬜ |

#### 🔄 Flusso Planning + Visite
| Test | Descrizione | Status |
|------|-------------|--------|
| INT-PV01 | Crea planning → visite salvate | ⬜ |
| INT-PV02 | Esegui planning → esiti registrati | ⬜ |
| INT-PV03 | Storico visite → dati aggregati | ⬜ |

### 5.3 API Integration Matrix
```
                    accounts  visits  messages  products
/api/clients/count     ✓        -        -         -
/api/clients/search    ✓        -        -         -
/api/visits/preview    ✓        ✓        -         -
/api/messages/send     ✓        ✓        ✓         ✓
```

---

## 6. FASE 3: LOGICA

### 6.1 Obiettivo
Verificare la correttezza della business logic.

### 6.2 Test Logica Business

#### 📊 NLU Intent Matching
| Input | Expected Intent | Status |
|-------|-----------------|--------|
| "quanti clienti ho" | client_count | ⬜ |
| "lista bar verona" | client_list | ⬜ |
| "vendite di ieri" | sales_summary | ⬜ |
| "apri clienti" | navigate | ⬜ |
| "ciao" | greet | ⬜ |

#### 📊 Filtri Database
| Filtro | Query | Risultato Atteso | Status |
|--------|-------|------------------|--------|
| city=Verona | ilike 'Verona%' | Solo "Verona", non "...di Verona" | ⬜ |
| tipo=Bar | ilike '%Bar%' | Bar, Wine Bar | ⬜ |
| notes=figli | ilike '%figli%' | Clienti con "figli" in note | ⬜ |

#### 📊 Calcoli Aggregati
| Test | Formula | Status |
|------|---------|--------|
| LOG-A01 | Totale vendite = SUM(importo_vendita) | ⬜ |
| LOG-A02 | Media vendite = AVG(importo_vendita) | ⬜ |
| LOG-A03 | Conteggio visite per cliente | ⬜ |

#### 📊 Date e Periodi
| Test | Descrizione | Status |
|------|-------------|--------|
| LOG-D01 | "oggi" → data corrente | ⬜ |
| LOG-D02 | "ieri" → data -1 | ⬜ |
| LOG-D03 | "questa settimana" → last 7 days | ⬜ |
| LOG-D04 | "questo mese" → current month | ⬜ |

---

## 7. FASE 4: SICUREZZA

### 7.1 Obiettivo
Verificare la protezione dei dati e la robustezza contro attacchi.

### 7.2 OWASP Top 10 Checklist

| # | Vulnerabilità | Mitigazione | Status |
|---|---------------|-------------|--------|
| A01 | Broken Access Control | RLS Supabase | ⬜ |
| A02 | Cryptographic Failures | AES-256-GCM | ⬜ |
| A03 | Injection | Parameterized queries | ⬜ |
| A04 | Insecure Design | Defense in depth | ⬜ |
| A05 | Security Misconfiguration | Env vars review | ⬜ |
| A06 | Vulnerable Components | npm audit | ⬜ |
| A07 | Auth Failures | Supabase Auth | ⬜ |
| A08 | Data Integrity | Input validation | ⬜ |
| A09 | Logging Failures | Console + Vercel | ⬜ |
| A10 | SSRF | API route validation | ⬜ |

### 7.3 Test Sicurezza Specifici

#### 🔒 Cifratura
| Test | Descrizione | Status |
|------|-------------|--------|
| SEC-E01 | Dati sensibili MAI in chiaro in DB | ⬜ |
| SEC-E02 | IV unico per ogni cifratura | ⬜ |
| SEC-E03 | AAD previene tampering | ⬜ |
| SEC-E04 | Master Key non in localStorage | ⬜ |
| SEC-E05 | Passphrase non loggata | ⬜ |

#### 🔒 Autenticazione
| Test | Descrizione | Status |
|------|-------------|--------|
| SEC-A01 | API protette richiedono auth | ⬜ |
| SEC-A02 | Session timeout funzionante | ⬜ |
| SEC-A03 | CSRF token validato | ⬜ |

#### 🔒 Autorizzazione (RLS)
| Test | Descrizione | Status |
|------|-------------|--------|
| SEC-R01 | User A non vede dati User B | ⬜ |
| SEC-R02 | owner_id enforced su accounts | ⬜ |
| SEC-R03 | user_id enforced su messages | ⬜ |

#### 🔒 Input Validation
| Test | Descrizione | Status |
|------|-------------|--------|
| SEC-I01 | SQL injection bloccata | ⬜ |
| SEC-I02 | XSS in chat sanitizzato | ⬜ |
| SEC-I03 | Path traversal bloccato | ⬜ |

---

## 8. METRICHE E KPI

### 8.1 Coverage Target
| Area | Target | Attuale |
|------|--------|---------|
| Crypto | 100% | TBD |
| API Routes | 80% | TBD |
| NLU | 90% | TBD |
| UI Components | 60% | TBD |

### 8.2 Bug Severity
| Severity | Descrizione | SLA |
|----------|-------------|-----|
| Critical | Data loss, security breach | 4h |
| High | Feature broken | 24h |
| Medium | Degraded UX | 72h |
| Low | Cosmetic | Backlog |

### 8.3 Performance Baselines
| Metrica | Target | Max |
|---------|--------|-----|
| API response time | <500ms | 2s |
| PDF generation | <3s | 10s |
| NLU parsing | <100ms | 500ms |
| Page load (FCP) | <1.5s | 3s |

---

## 9. CHECKLIST FINALE

### Pre-Release Checklist
- [ ] Tutti i test CRITICO passati
- [ ] npm audit clean (0 high/critical)
- [ ] Console errors = 0
- [ ] RLS policies verificate
- [ ] Encryption audit OK
- [ ] Performance baseline met
- [ ] Documentation updated

### Sign-off
| Ruolo | Nome | Data | Firma |
|-------|------|------|-------|
| Developer | | | |
| QA | | | |
| Security | | | |
| Product | | | |

---

## APPENDICE A: Comandi Utili

```bash
# Run unit tests
npm test

# Security audit
npm audit

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build check
npm run build
```

## APPENDICE B: Ambiente di Test

```
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=<test_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<test_key>
OPENAI_API_KEY=<test_key>
```

---

**Fine Documento**

*Generato il 2 Dicembre 2025 - Venditori Micidiali Engineering*

