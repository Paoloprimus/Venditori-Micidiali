# 📢 Sistema Broadcast Messaggi Beta

Sistema per comunicare aggiornamenti, fix e nuove feature ai tester durante la fase beta.

## 🎯 Come Funziona

### Per Admin (Tu)

1. **Vai su `/admin/broadcast`**
2. Click "Nuovo Messaggio"
3. Compila:
   - **Titolo**: es. "Nuova feature: Creazione clienti vocale!"
   - **Messaggio**: Descrizione chiara e concisa
   - **Tipo**: Info (blu), Success (verde), Warning (giallo), Error (rosso)
   - **Destinatari**: Tester, Premium, Business (puoi selezionare multipli)
   - **Scadenza**: 1 giorno, 1 settimana, 1 mese, o mai
4. Click "Invia Messaggio"

### Per Tester

- Al **prossimo accesso**, vedranno un **toast** in alto al centro
- Il toast rimane aperto per **10 secondi** (con progress bar)
- Possono chiuderlo manualmente cliccando X
- Se ci sono **più messaggi**, li vedranno uno dopo l'altro
- I messaggi già visti **non riappaiono**

## 📊 Statistiche

Nella pagina `/admin/broadcast` puoi vedere:
- Quanti utenti hanno **letto** il messaggio (X/Y letto)
- **Data invio** e **scadenza**
- Messaggi **attivi** vs **scaduti**

## 🗄️ Database

### Tabelle Create

1. **broadcast_messages** - Messaggi inviati
2. **broadcast_messages_read** - Traccia chi ha letto cosa

### Migration

Esegui: `supabase/migrations/2025-12-14_broadcast_messages.sql`

## 🔒 Sicurezza

- **Solo admin** possono creare/modificare/cancellare messaggi
- Gli utenti vedono **solo i messaggi** destinati al loro ruolo
- **RLS policies** attive

## 💡 Esempi d'Uso

### Nuova Feature
```
Titolo: 🎙️ Nuova feature: Creazione clienti vocale!
Messaggio: Ora puoi aggiungere clienti a voce in soli 30 secondi. Prova dal menu "Nuovo Cliente" → Creazione Vocale!
Tipo: Success
Destinatari: Tester
Scadenza: 1 settimana
```

### Fix Bug
```
Titolo: 🐛 Fix: Problema import CSV risolto
Messaggio: Abbiamo risolto il bug che impediva l'import di file CSV con caratteri speciali. Riprova ora!
Tipo: Info
Destinatari: Tester
Scadenza: 3 giorni
```

### Warning Manutenzione
```
Titolo: ⚠️ Manutenzione programmata
Messaggio: Domenica 15/12 dalle 22:00 alle 23:00 l'app potrebbe essere momentaneamente offline per aggiornamenti.
Tipo: Warning
Destinatari: Tester, Premium, Business
Scadenza: 1 giorno
```

## 🚀 Quick Start

1. Esegui migration SQL
2. Vai su `/admin/broadcast`
3. Invia il tuo primo messaggio di benvenuto ai tester!

---

**Note:** I messaggi vengono mostrati **solo una volta** per utente. Non puoi "re-inviare" lo stesso messaggio (devi crearne uno nuovo se necessario).

