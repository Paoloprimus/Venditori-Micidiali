// ============================================================
// DOCUMENTI LEGALI - REPPING
// Versione: 1.0 | Data: 2 Dicembre 2025
// ============================================================

export const LEGAL_VERSIONS = {
  privacy: 'privacy_v1.0',
  tos: 'tos_v1.0',
  cookies: 'cookies_v1.0',
} as const;

export const LEGAL_LAST_UPDATED = '2 Dicembre 2025';

// ============================================================
// PRIVACY POLICY
// ============================================================
export const PRIVACY_POLICY = {
  version: LEGAL_VERSIONS.privacy,
  lastUpdated: LEGAL_LAST_UPDATED,
  
  // Dati azienda (da personalizzare in produzione)
  controller: {
    name: '[NOME AZIENDA]',
    address: '[INDIRIZZO SEDE LEGALE]',
    email: 'info@reping.it',
    pec: '[PEC AZIENDALE]',
  },
  
  content: `
# Informativa sulla Privacy

**Ultimo aggiornamento:** 2 Dicembre 2025  
**Versione:** 1.0

## 1. Titolare del Trattamento

Il Titolare del trattamento dei dati personali è:
- **Ragione sociale:** [NOME AZIENDA]
- **Sede legale:** [INDIRIZZO]
- **Email:** info@reping.it
- **PEC:** [PEC]

## 2. Quali Dati Raccogliamo

### 2.1 Dati forniti dall'utente
- **Dati di registrazione:** nome, cognome, indirizzo email, password
- **Dati dei clienti:** informazioni sui tuoi clienti HoReCa (bar, ristoranti, hotel) che inserisci nell'app
- **Dati delle visite:** appuntamenti, note, ordini registrati
- **Dati di geolocalizzazione:** posizione (solo se autorizzi esplicitamente)

### 2.2 Dati raccolti automaticamente
- **Dati tecnici:** indirizzo IP, tipo di browser, sistema operativo
- **Dati di utilizzo:** pagine visitate, funzionalità usate, errori
- **Cookie:** vedi la nostra Cookie Policy

## 3. Perché Trattiamo i Tuoi Dati (Finalità)

| Finalità | Base Giuridica | Conservazione |
|----------|----------------|---------------|
| Fornitura del servizio REPPING | Esecuzione contratto (Art. 6.1.b GDPR) | Durata account + 1 anno |
| Assistente AI per venditori | Esecuzione contratto | Durata sessione |
| Miglioramento del servizio | Legittimo interesse (Art. 6.1.f GDPR) | 24 mesi |
| Comunicazioni di servizio | Esecuzione contratto | Durata account |
| Marketing diretto (se acconsentito) | Consenso (Art. 6.1.a GDPR) | Fino a revoca |
| Obblighi di legge | Obbligo legale (Art. 6.1.c GDPR) | Termini di legge |

## 4. Crittografia dei Dati (Importante!)

⚠️ **REPPING utilizza crittografia end-to-end client-side.**

Questo significa che:
- I tuoi dati sensibili (clienti, note, visite) sono **cifrati sul tuo dispositivo** prima di essere inviati ai nostri server
- La chiave di cifratura è derivata dalla tua **password personale**
- **Nemmeno noi possiamo leggere i tuoi dati** in chiaro

**ATTENZIONE:** Se perdi la password e non hai modo di recuperarla, **i tuoi dati cifrati saranno irrecuperabili**. Non esiste una "backdoor" per motivi di sicurezza.

## 5. Trasferimento Dati Extra-UE

I tuoi dati possono essere trasferiti a fornitori situati fuori dall'Unione Europea:

| Fornitore | Paese | Servizio | Garanzie |
|-----------|-------|----------|----------|
| **OpenAI** | USA | Elaborazione linguaggio naturale AI | Standard Contractual Clauses (SCC) + DPA |
| **Supabase** | USA/UE | Database e autenticazione | SCC, infrastruttura AWS EU |
| **Vercel** | USA | Hosting applicazione | SCC, edge network EU |

Per OpenAI: le tue domande all'assistente AI vengono elaborate per fornirti risposte, ma **non vengono usate per addestrare i modelli** (API usage, non training data).

## 6. Con Chi Condividiamo i Dati

I tuoi dati personali possono essere condivisi con:
- **Fornitori tecnici:** elencati sopra, solo per erogare il servizio
- **Autorità pubbliche:** solo se richiesto per legge
- **Nessun altro:** non vendiamo né cediamo i tuoi dati a terzi per scopi commerciali

## 7. I Tuoi Diritti (GDPR Art. 15-22)

Hai diritto di:
- **Accesso:** sapere quali dati abbiamo su di te
- **Rettifica:** correggere dati inesatti
- **Cancellazione:** richiedere l'eliminazione dei tuoi dati ("diritto all'oblio")
- **Limitazione:** sospendere temporaneamente il trattamento
- **Portabilità:** ricevere i tuoi dati in formato leggibile (JSON/CSV)
- **Opposizione:** opporti a trattamenti basati su legittimo interesse
- **Revoca consenso:** ritirare i consensi dati in qualsiasi momento

**Come esercitarli:** Dalla pagina "I Miei Dati" nell'app, oppure scrivendo a info@reping.it

## 8. Conservazione dei Dati

| Tipo di dato | Periodo di conservazione |
|--------------|--------------------------|
| Account e profilo | Fino a cancellazione account + 1 anno |
| Dati clienti/visite | Fino a cancellazione account |
| Log di sistema | 12 mesi |
| Dati di fatturazione | 10 anni (obbligo fiscale) |
| Consensi | Illimitato (audit) |

## 9. Sicurezza

Adottiamo misure tecniche e organizzative per proteggere i tuoi dati:
- Crittografia end-to-end client-side (AES-256-GCM)
- Connessioni HTTPS/TLS 1.3
- Autenticazione sicura con hash password (Argon2)
- Accesso limitato ai dati solo al personale autorizzato
- Backup cifrati

## 10. Cookie

Utilizziamo cookie tecnici e, previo consenso, cookie analytics. Per dettagli, consulta la nostra [Cookie Policy](/legal/cookies).

## 11. Modifiche alla Privacy Policy

In caso di modifiche sostanziali:
- Ti notificheremo via email almeno 15 giorni prima
- Dovrai ri-accettare la nuova versione per continuare a usare il servizio

## 12. Reclami

Hai diritto di proporre reclamo al Garante per la Protezione dei Dati Personali:
- **Sito:** https://www.garanteprivacy.it
- **Email:** protocollo@pec.gpdp.it

## 13. Contatti

Per qualsiasi domanda sulla privacy:
- **Email:** info@reping.it
- **Indirizzo:** [INDIRIZZO SEDE LEGALE]
`,
};

// ============================================================
// TERMINI DI SERVIZIO
// ============================================================
export const TERMS_OF_SERVICE = {
  version: LEGAL_VERSIONS.tos,
  lastUpdated: LEGAL_LAST_UPDATED,
  
  content: `
# Termini di Servizio

**Ultimo aggiornamento:** 2 Dicembre 2025  
**Versione:** 1.0

## 1. Descrizione del Servizio

**REPPING** è un'applicazione web che fornisce:
- Un assistente AI per agenti di commercio nel settore HoReCa
- Gestione clienti, visite e ordini
- Pianificazione percorsi e routing
- Reportistica e analytics

## 2. Accettazione dei Termini

Utilizzando REPPING, accetti questi Termini di Servizio. Se non accetti, non utilizzare il servizio.

## 3. Requisiti per l'Uso

Per usare REPPING devi:
- Avere almeno 18 anni
- Avere la capacità legale di stipulare contratti
- Fornire informazioni accurate durante la registrazione
- Essere un professionista (B2B) - il servizio non è destinato a consumatori finali

## 4. Account e Sicurezza

### 4.1 Responsabilità dell'Account
- Sei responsabile della riservatezza della tua password
- Sei responsabile di tutte le attività effettuate con il tuo account
- Devi notificarci immediatamente qualsiasi accesso non autorizzato

### 4.2 Crittografia e Password

⚠️ **IMPORTANTE:** La tua password è usata per derivare la chiave di cifratura dei tuoi dati.

- Se perdi la password e non hai modo di recuperarla, **i tuoi dati cifrati saranno IRRECUPERABILI**
- Non esiste una procedura di "reset password" che preservi i dati cifrati
- Ti consigliamo di conservare la password in un gestore password sicuro

## 5. Uso Consentito

Puoi usare REPPING per:
- Gestire i tuoi clienti commerciali
- Registrare visite e ordini
- Ottenere assistenza dall'AI per le tue attività di vendita

## 6. Uso Vietato

È vietato:
- Usare il servizio per scopi illegali
- Tentare di accedere a dati di altri utenti
- Fare reverse engineering del software
- Sovraccaricare intenzionalmente i server (DoS)
- Usare bot o scraper automatici
- Inserire dati falsi o ingannevoli
- Violare diritti di terzi (privacy, proprietà intellettuale)

## 7. Intelligenza Artificiale - Disclaimer

⚠️ **AVVERTENZA IMPORTANTE SULL'AI:**

- L'assistente AI di REPPING è uno strumento di supporto, **non un sostituto del tuo giudizio professionale**
- L'AI può commettere errori, fornire informazioni incomplete o imprecise
- **Verifica sempre le informazioni importanti** prima di prendere decisioni commerciali
- Non ci assumiamo responsabilità per decisioni basate esclusivamente sulle risposte dell'AI
- L'AI non fornisce consulenza legale, fiscale o finanziaria

## 8. Dati dei Tuoi Clienti

### 8.1 Responsabilità
- Sei il **titolare del trattamento** per i dati dei tuoi clienti che inserisci in REPPING
- Devi avere una base giuridica valida per trattare quei dati (es. legittimo interesse commerciale, consenso)
- Devi informare i tuoi clienti che usi uno strumento come REPPING

### 8.2 REPPING come Responsabile
- REPPING agisce come **responsabile del trattamento** per i dati che inserisci
- Trattiamo i dati solo secondo le tue istruzioni e per fornirti il servizio
- Applichiamo misure di sicurezza adeguate (crittografia end-to-end)

## 9. Piani e Pagamenti

### 9.1 Piani Disponibili
| Piano | Caratteristiche | Prezzo |
|-------|-----------------|--------|
| **Agente** | Funzionalità base, limiti standard | Gratuito (Beta) |
| **Premium** | Funzionalità avanzate, limiti estesi | Da definire |

### 9.2 Fatturazione
- I piani a pagamento sono fatturati mensilmente/annualmente
- Accetti di fornire dati di fatturazione accurati
- I prezzi possono cambiare con preavviso di 30 giorni

### 9.3 Rimborsi
- Periodo di prova: rimborso completo entro 14 giorni
- Dopo il periodo di prova: rimborso pro-rata per il periodo non utilizzato

## 10. Limitazione di Responsabilità

### 10.1 Esclusione di Garanzie
REPPING è fornito "così com'è" (AS IS). Non garantiamo che:
- Il servizio sia sempre disponibile o privo di errori
- Le risposte dell'AI siano sempre accurate
- Il servizio soddisfi tutte le tue esigenze specifiche

### 10.2 Limitazione dei Danni
Nella misura massima consentita dalla legge:
- Non siamo responsabili per danni indiretti, consequenziali o punitivi
- La nostra responsabilità massima è limitata all'importo pagato negli ultimi 12 mesi
- Non siamo responsabili per perdita di dati causata dalla perdita della password (vedi sez. 4.2)

## 11. Proprietà Intellettuale

### 11.1 REPPING
- Il software, il marchio e i contenuti di REPPING sono di nostra proprietà
- Ti concediamo una licenza limitata, non esclusiva, per usare il servizio

### 11.2 I Tuoi Contenuti
- Mantieni la proprietà dei dati che inserisci
- Ci concedi una licenza limitata per elaborarli al fine di fornirti il servizio

## 12. Risoluzione

### 12.1 Da Parte Tua
- Puoi cancellare il tuo account in qualsiasi momento dalla pagina "I Miei Dati"
- I dati verranno eliminati entro 30 giorni (salvo obblighi di legge)

### 12.2 Da Parte Nostra
Possiamo sospendere o terminare il tuo account se:
- Violi questi Termini
- Usi il servizio in modo fraudolento
- Non paghi le fatture dovute

## 13. Modifiche ai Termini

- Possiamo modificare questi Termini con preavviso di 15 giorni
- Ti notificheremo via email
- Continuando a usare il servizio, accetti le modifiche
- Se non accetti, puoi cancellare l'account

## 14. Disposizioni Generali

### 14.1 Legge Applicabile
Questi Termini sono regolati dalla legge italiana.

### 14.2 Foro Competente
Per qualsiasi controversia è competente il Foro di [CITTÀ], salvo diverso foro obbligatorio per legge.

### 14.3 Intero Accordo
Questi Termini, insieme alla Privacy Policy e Cookie Policy, costituiscono l'intero accordo tra te e REPPING.

### 14.4 Separabilità
Se una clausola è invalida, le altre rimangono in vigore.

## 15. Contatti

Per domande sui Termini di Servizio:
- **Email:** info@reping.it
- **Indirizzo:** [INDIRIZZO SEDE LEGALE]
`,
};

// ============================================================
// COOKIE POLICY
// ============================================================
export const COOKIE_POLICY = {
  version: LEGAL_VERSIONS.cookies,
  lastUpdated: LEGAL_LAST_UPDATED,
  
  content: `
# Cookie Policy

**Ultimo aggiornamento:** 2 Dicembre 2025  
**Versione:** 1.0

## 1. Cosa Sono i Cookie

I cookie sono piccoli file di testo che i siti web memorizzano sul tuo dispositivo. Servono a ricordare le tue preferenze e migliorare la tua esperienza.

## 2. Cookie che Utilizziamo

### 2.1 Cookie Tecnici (Necessari)

Questi cookie sono essenziali per il funzionamento del sito. **Non richiedono consenso.**

| Nome | Scopo | Durata |
|------|-------|--------|
| \`sb-access-token\` | Autenticazione Supabase | Sessione |
| \`sb-refresh-token\` | Refresh autenticazione | 7 giorni |
| \`cookie_consent\` | Memorizza le tue preferenze cookie | 1 anno |

### 2.2 Cookie di Preferenze

| Nome | Scopo | Durata |
|------|-------|--------|
| \`repping:theme\` | Tema chiaro/scuro | 1 anno |
| \`repping:lang\` | Lingua preferita | 1 anno |

### 2.3 Cookie Analytics (Previo Consenso)

Se acconsenti, utilizziamo:

| Nome | Fornitore | Scopo | Durata |
|------|-----------|-------|--------|
| \`_vercel_insights_*\` | Vercel | Analytics anonimizzati | 30 giorni |

**Nota:** Non utilizziamo Google Analytics o altri tracker di terze parti invasivi.

## 3. Cookie di Terze Parti

REPPING non utilizza cookie di terze parti per pubblicità o profilazione.

## 4. Come Gestire i Cookie

### 4.1 Dal Nostro Banner
Quando visiti REPPING per la prima volta, puoi:
- **Accetta tutti:** abilita cookie tecnici + analytics
- **Solo necessari:** abilita solo cookie tecnici essenziali

### 4.2 Dal Tuo Browser

Puoi gestire i cookie dalle impostazioni del browser:

- **Chrome:** Impostazioni → Privacy e sicurezza → Cookie
- **Firefox:** Impostazioni → Privacy e sicurezza → Cookie
- **Safari:** Preferenze → Privacy → Cookie
- **Edge:** Impostazioni → Cookie e autorizzazioni sito

### 4.3 Conseguenze della Disabilitazione

Se disabiliti i cookie tecnici:
- Non potrai accedere al tuo account
- L'app non funzionerà correttamente

Se disabiliti i cookie analytics:
- Non raccoglieremo dati anonimi sul tuo utilizzo
- Nessun impatto sulle funzionalità

## 5. Local Storage

Oltre ai cookie, utilizziamo il Local Storage del browser per:

| Chiave | Scopo | Dati |
|--------|-------|------|
| \`repping:pph\` | Passphrase cifrata (temporanea) | Chiave cifratura |
| \`repping:conversations\` | Cache conversazioni | ID conversazioni |

Questi dati rimangono sul tuo dispositivo e non vengono inviati ai nostri server.

## 6. Modifiche alla Cookie Policy

In caso di modifiche:
- Aggiorneremo questa pagina
- Cambieremo la data "Ultimo aggiornamento"
- Per modifiche significative, richiederemo nuovamente il consenso

## 7. Contatti

Per domande sui cookie:
- **Email:** info@reping.it

## 8. Approfondimenti

Per saperne di più sui cookie:
- [Garante Privacy - Cookie](https://www.garanteprivacy.it/cookie)
- [Your Online Choices](https://www.youronlinechoices.eu/)
`,
};

// Helper per formattare markdown -> HTML semplice (per rendering)
export function formatLegalContent(markdown: string): string {
  // Questa è una formattazione base - in produzione usare react-markdown
  return markdown
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-8 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 rounded text-sm">$1</code>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^\| (.*) \|$/gim, (_, content) => {
      const cells = content.split(' | ');
      return '<tr>' + cells.map((c: string) => `<td class="border border-slate-200 px-2 py-1">${c}</td>`).join('') + '</tr>';
    })
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>');
}

