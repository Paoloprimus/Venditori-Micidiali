# 🧪 ROADMAP TESTING - REPING Beta 1.0

> **Obiettivo:** Testare tutte le funzionalità per arrivare alla versione Beta 1.0 pronta per agenti di commercio reali.

---

## 📋 Come usare questa roadmap

Per ogni sezione:
1. ✅ Segui i passi nell'ordine indicato
2. 📝 Usa il **Test Companion Panel** per annotare problemi
3. 🏷️ Categorie: 🐛 Bug | 🎨 UX | 💡 Idea | ⚡ Performance

### Template Nota Test

```
[TEST #XX] Descrizione breve
- Passi: cosa hai fatto
- Atteso: cosa doveva succedere  
- Attuale: cosa è successo
- Gravità: Bloccante/Alto/Medio/Basso
```

---

## FASE 1: AUTENTICAZIONE & SICUREZZA 🔐

### 1.1 Login

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 1 | Accesso nuovo utente | Email/password → redirect a home | ☐ |
| 2 | Accesso utente esistente | Login → passphrase → dati visibili | ☐ |
| 3 | Logout | Pulizia sessione, redirect a /login | ☐ |
| 4 | Sessione persistente | Chiudi browser → riapri → ancora loggato? | ☐ |
| 5 | Passphrase persistente | Naviga tra pagine → passphrase mantenuta? | ☐ |

### 1.2 Crittografia

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 6 | Prima passphrase | Nuovo utente → imposta passphrase → salva | ☐ |
| 7 | Sblocco dati | Passphrase corretta → dati decifrati | ☐ |
| 8 | Passphrase errata | Messaggio errore chiaro? | ☐ |
| 9 | Cambio dispositivo | Stessa passphrase funziona su altro browser? | ☐ |

**Note Fase 1:**
```




```

---

## FASE 2: GESTIONE CLIENTI 👥

### 2.1 Lista Clienti (`/clients`)

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 10 | Caricamento lista | Clienti visibili con nomi decifrati | ☐ |
| 11 | Ricerca | Cerca per nome → risultati corretti | ☐ |
| 12 | Filtri | Filtra per città/tipo → funziona? | ☐ |
| 13 | Scroll/Paginazione | 50+ clienti → performance OK? | ☐ |

### 2.2 Aggiunta Cliente Singolo (`/tools/quick-add-client`)

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 14 | Form completo | Tutti i campi salvati correttamente | ☐ |
| 15 | Campi obbligatori | Nome vuoto → errore | ☐ |
| 16 | Geocoding automatico | Indirizzo → lat/long calcolati | ☐ |
| 17 | Cliente in lista | Dopo salvataggio → appare in /clients | ☐ |

### 2.3 Import Bulk (`/tools/import-clients`)

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 18 | Upload CSV | File caricato, preview corretto | ☐ |
| 19 | Mapping colonne | Associazione corretta campi | ☐ |
| 20 | Import 10 clienti | Tutti importati e cifrati | ☐ |
| 21 | Import 50+ clienti | Performance, nessun timeout | ☐ |
| 22 | Errori CSV | File malformato → messaggio chiaro | ☐ |

### 2.4 Modifica/Eliminazione Cliente

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 23 | Modifica cliente | Campi aggiornati correttamente | ☐ |
| 24 | Elimina cliente | Rimosso dalla lista | ☐ |

**Note Fase 2:**
```




```

---

## FASE 3: GESTIONE PRODOTTI 📦

### 3.1 Lista Prodotti (`/products`)

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 25 | Caricamento lista | Prodotti visibili | ☐ |
| 26 | Ricerca prodotto | Cerca per nome/codice | ☐ |
| 27 | Dettagli prodotto | Prezzo, giacenza, sconti visibili | ☐ |

### 3.2 Aggiunta/Import Prodotti

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 28 | Aggiungi singolo | Form completo, salvataggio OK | ☐ |
| 29 | Import CSV | Prodotti importati correttamente | ☐ |
| 30 | Aggiorna giacenze | Modifica stock → salvato | ☐ |

**Note Fase 3:**
```




```

---

## FASE 4: PLANNING VISITE 🗺️

### 4.1 Calendario (`/planning`)

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 31 | Vista calendario | Mese corrente visibile | ☐ |
| 32 | Giorni con piani | Badge/indicatore visibile | ☐ |
| 33 | Crea nuovo piano | Click su giorno → editor | ☐ |
| 34 | Navigazione mesi | Avanti/indietro funziona | ☐ |

### 4.2 Editor Piano (`/planning/[data]`)

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 35 | Caricamento clienti | Nomi decifrati, posizioni corrette | ☐ |
| 36 | Suggerimenti AI | "Genera Suggerimenti" → clienti proposti | ☐ |
| 37 | Selezione manuale | Checkbox clienti → aggiunti al piano | ☐ |
| 38 | Riordina visite | Frecce su/giù funzionano | ☐ |
| 39 | Ottimizza percorso | Algoritmo ordina per distanza | ☐ |
| 40 | KM stimati | Calcolo aggiornato in tempo reale | ☐ |
| 41 | Salva bozza | Piano salvato come draft | ☐ |
| 42 | Avvia giornata | Status → active, timestamp salvato | ☐ |

### 4.3 Esecuzione Visite (`/planning/[data]/execute`)

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 43 | Lista visite | Clienti in ordine pianificato | ☐ |
| 44 | Avvia visita | Timer parte, UI aggiornata | ☐ |
| 45 | Chiudi visita | Form esito → salvataggio | ☐ |
| 46 | Esiti disponibili | Ordine, Richiamare, No interesse, etc. | ☐ |
| 47 | Importo vendita | Campo numerico, salvataggio | ☐ |
| 48 | Note visita | Testo salvato correttamente | ☐ |
| 49 | Durata calcolata | Minuti calcolati automaticamente | ☐ |
| 50 | Salta visita | Cliente saltato, passa al prossimo | ☐ |
| 51 | Navigazione GPS | "Naviga" apre Google Maps | ☐ |
| 52 | Fine giornata | Tutte visite completate → status completed | ☐ |

**Note Fase 4:**
```




```

---

## FASE 5: REPORT & DOCUMENTI 📄

### 5.1 Report Visite (PDF)

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 53 | Genera report | PDF scaricato | ☐ |
| 54 | Dati corretti | Visite, fatturato, km presenti | ☐ |
| 55 | Tempi calcolati | Tempo totale, visite, spostamenti | ☐ |
| 56 | Nomi clienti | Decifrati correttamente nel PDF | ☐ |

### 5.2 Storico Visite (`/visits`)

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 57 | Lista visite | Cronologia visibile | ☐ |
| 58 | Filtri data | Range date funziona | ☐ |
| 59 | Dettaglio visita | Click → mostra dettagli | ☐ |

### 5.3 Promemoria (Drawer Docs)

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 60 | Nuovo promemoria | Form, salvataggio | ☐ |
| 61 | Lista promemoria | Visibile nel drawer | ☐ |
| 62 | Modifica/Elimina | Funziona correttamente | ☐ |
| 63 | Widget home | Promemoria visibili in homepage | ☐ |

**Note Fase 5:**
```




```

---

## FASE 6: CHAT AI 🤖

### 6.1 Conversazioni

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 64 | Nuova conversazione | Crea sessione, titolo | ☐ |
| 65 | Lista sessioni | Drawer sx → sessioni visibili | ☐ |
| 66 | Cambia sessione | Click → carica messaggi | ☐ |
| 67 | Elimina sessione | Rimossa dalla lista | ☐ |

### 6.2 Query AI

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 68 | Query semplice | "Ciao" → risposta | ☐ |
| 69 | Query clienti | "Quanti clienti ho?" → numero corretto | ☐ |
| 70 | Query prodotti | "Prezzo del [prodotto]?" → risposta | ☐ |
| 71 | Query visite | "Ultime visite?" → lista | ☐ |
| 72 | Comandi vocali | Icona mic → registra → trascrive | ☐ |

### 6.3 Intenti Voce

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 73 | "Aggiungi visita" | Intent riconosciuto, form aperto | ☐ |
| 74 | "Pianifica domani" | Intent riconosciuto | ☐ |
| 75 | Conferma/Annulla | "Sì"/"No" gestiti | ☐ |

**Note Fase 6:**
```




```

---

## FASE 7: IMPOSTAZIONI ⚙️

### 7.1 Drawer Impostazioni

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 76 | Indirizzo casa | Salvataggio, geocoding | ☐ |
| 77 | Coordinate salvate | Usate per ottimizzazione percorso | ☐ |

**Note Fase 7:**
```




```

---

## FASE 8: PERFORMANCE & EDGE CASES ⚡

| # | Test | Cosa verificare | ✅ |
|---|------|-----------------|---|
| 78 | 100+ clienti | Lista carica in <3s | ☐ |
| 79 | Offline mode | Messaggio chiaro se no connessione | ☐ |
| 80 | Mobile responsive | UI usabile su smartphone | ☐ |
| 81 | Tablet | Layout adattato | ☐ |
| 82 | Refresh pagina | Dati persistenti, no errori | ☐ |
| 83 | Back button | Navigazione coerente | ☐ |
| 84 | Sessione scaduta | Redirect a login | ☐ |

**Note Fase 8:**
```




```

---

## 📊 RIEPILOGO PROBLEMI TROVATI

### 🐛 Bug Critici (Bloccanti)
```




```

### 🐛 Bug Alti
```




```

### 🎨 Problemi UX
```




```

### 💡 Idee/Miglioramenti
```




```

### ⚡ Performance
```




```

---

## 🎯 CHECKLIST FINALE BETA 1.0

Per rilasciare la Beta 1.0, **TUTTI** questi criteri devono essere ✅:

| Criterio | Stato |
|----------|-------|
| Login funzionante | ☐ |
| Crittografia stabile | ☐ |
| CRUD Clienti completo | ☐ |
| Import bulk funzionante | ☐ |
| Planning completo (Crea → Esegui → Report) | ☐ |
| Visite salvate correttamente | ☐ |
| Report PDF generato | ☐ |
| Mobile usabile | ☐ |
| Nessun crash/errore bloccante | ☐ |

---

## 📅 LOG SESSIONI TEST

### Sessione 1
- **Data:** _______________
- **Durata:** _______________
- **Fasi testate:** _______________
- **Bug trovati:** _______________

### Sessione 2
- **Data:** _______________
- **Durata:** _______________
- **Fasi testate:** _______________
- **Bug trovati:** _______________

### Sessione 3
- **Data:** _______________
- **Durata:** _______________
- **Fasi testate:** _______________
- **Bug trovati:** _______________

---

## ✅ APPROVAZIONE BETA 1.0

- [ ] Tutti i test passati
- [ ] Bug critici risolti
- [ ] UX accettabile per utenti reali
- [ ] Performance adeguata
- [ ] Documentazione pronta

**Data approvazione:** _______________

**Firma:** _______________

---

*Documento generato il 30 novembre 2025 per REPING*

