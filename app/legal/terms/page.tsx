"use client";

import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="topbar">
        <Link href="/" className="iconbtn">← Home</Link>
        <span className="title">Termini di Servizio</span>
        <span className="spacer" />
        <span className="badge">v1.0 - Dic 2025</span>
      </div>

      {/* Contenuto */}
      <div className="container py-8">
        <article className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 text-sm text-slate-700 leading-relaxed">
          
          <header>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Termini e Condizioni di Servizio</h1>
            <p className="text-slate-500 text-xs">
              Contratto di licenza d'uso per l'applicazione REPING
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Ultimo aggiornamento: 11 Dicembre 2025
            </p>
          </header>

          {/* BANNER BETA */}
          <div className="bg-amber-100 border-2 border-amber-400 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🧪</span>
              <div>
                <h2 className="font-bold text-amber-900 text-lg mb-2">PROGRAMMA BETA - AVVISO IMPORTANTE</h2>
                <p className="text-amber-800 text-sm mb-3">
                  <strong>Stai partecipando alla fase di test (Beta) di REPING.</strong> Leggi attentamente:
                </p>
                <ul className="text-amber-800 text-sm space-y-2 list-disc list-inside">
                  <li><strong>Servizio GRATUITO:</strong> Non ti verrà addebitato alcun costo durante la Beta.</li>
                  <li><strong>Software in sviluppo:</strong> Potrebbero verificarsi malfunzionamenti, errori o interruzioni del servizio.</li>
                  <li><strong>Nessuna garanzia sui dati:</strong> I dati potrebbero essere persi, corrotti o resettati senza preavviso durante la fase di test.</li>
                  <li><strong>Partecipazione volontaria:</strong> Partecipi al test a tuo rischio. REPING non è responsabile per eventuali danni diretti o indiretti.</li>
                  <li><strong>Feedback apprezzato:</strong> I tuoi suggerimenti ci aiutano a migliorare il prodotto prima del lancio.</li>
                </ul>
                <p className="text-amber-800 text-sm mt-3 font-medium">
                  ✅ <strong>I tuoi diritti GDPR sono pienamente garantiti</strong> anche durante la Beta (accesso, rettifica, cancellazione, portabilità).
                </p>
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* 1. Oggetto */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Oggetto del Servizio</h2>
            <p>
              REPING è un'applicazione web che fornisce agli agenti di commercio del settore 
              HoReCa (Hotel, Restaurant, Catering) strumenti per:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Gestione del portafoglio clienti</li>
              <li>Pianificazione visite e giri</li>
              <li>Assistente AI per domande e analisi</li>
              <li>Generazione report e documenti</li>
            </ul>
          </section>

          {/* 1-bis. Condizioni Beta */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">1-bis. Condizioni Speciali - Programma Beta</h2>
            <div className="bg-slate-50 border border-slate-200 rounded p-4">
              <p className="mb-3">
                Durante il <strong>Programma Beta</strong> (fino a diversa comunicazione), si applicano le seguenti condizioni speciali:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>Gratuità totale:</strong> L'accesso al servizio è completamente gratuito. Non ti verrà chiesto 
                  alcun pagamento e non verranno raccolti dati di pagamento.
                </li>
                <li>
                  <strong>Accesso su invito:</strong> La partecipazione alla Beta è riservata a utenti che hanno ricevuto 
                  un token di invito valido.
                </li>
                <li>
                  <strong>Software non definitivo:</strong> Le funzionalità potrebbero cambiare, essere rimosse o modificate 
                  senza preavviso. L'interfaccia e le prestazioni non sono definitive.
                </li>
                <li>
                  <strong>Possibile perdita dati:</strong> In casi eccezionali (bug critici, reset database, migrazione), 
                  i dati inseriti durante la Beta potrebbero essere persi. <strong>Ti consigliamo di mantenere backup esterni 
                  dei dati importanti.</strong>
                </li>
                <li>
                  <strong>Esclusione responsabilità:</strong> REPING non è responsabile per danni derivanti da 
                  malfunzionamenti, errori dell'AI, perdita dati o interruzioni del servizio durante la fase Beta.
                </li>
                <li>
                  <strong>Diritto di terminare:</strong> Ci riserviamo di terminare il programma Beta o il tuo accesso 
                  in qualsiasi momento, con comunicazione via email.
                </li>
              </ul>
              <p className="mt-4 text-sm text-slate-600">
                Al termine della Beta, ti verrà comunicato come migrare al servizio definitivo e quali condizioni 
                economiche saranno applicate.
              </p>
            </div>
          </section>

          {/* 2. Accettazione */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Accettazione dei Termini</h2>
            <p>
              Registrandoti e utilizzando REPING, accetti integralmente questi Termini di Servizio 
              e la nostra <Link href="/legal/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>. 
              Se non accetti, non puoi utilizzare il servizio.
            </p>
            <p className="mt-2">
              Il servizio è riservato a utenti maggiorenni (18+ anni) che agiscono per scopi 
              professionali o imprenditoriali.
            </p>
          </section>

          {/* 3. Account */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">3. Account e Sicurezza</h2>
            <p>
              Per utilizzare REPING devi creare un account fornendo dati veritieri e aggiornati.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>Sei responsabile della riservatezza delle tue credenziali</li>
              <li>Devi notificarci immediatamente accessi non autorizzati</li>
              <li>Un account è strettamente personale e non cedibile</li>
              <li>Ci riserviamo di sospendere account sospetti</li>
            </ul>

            <div className="bg-amber-50 border border-amber-200 rounded p-4 mt-4">
              <p className="font-medium text-amber-800 mb-2">⚠️ Password e Crittografia</p>
              <p className="text-amber-700">
                La tua password viene utilizzata per cifrare i dati sensibili. 
                <strong> Non esiste un sistema di recupero password che permetta di recuperare 
                i dati cifrati.</strong> Se perdi la password e non riesci ad accedere, 
                i dati cifrati saranno persi definitivamente.
              </p>
              <p className="text-amber-700 mt-2">
                Ti consigliamo di conservare la password in modo sicuro (es. password manager).
              </p>
            </div>
          </section>

          {/* 4. Obblighi utente */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">4. Obblighi dell'Utente</h2>
            <p>L'utente si impegna a:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>Utilizzare il servizio in modo lecito e conforme alle normative vigenti</li>
              <li>Non caricare contenuti illegali, diffamatori o lesivi di diritti altrui</li>
              <li>Non tentare di accedere a dati di altri utenti</li>
              <li>Non effettuare reverse engineering, decompilazione o modifica del software</li>
              <li>Non utilizzare sistemi automatizzati (bot, scraper) senza autorizzazione</li>
              <li>Non sovraccaricare intenzionalmente i server</li>
            </ul>

            <h3 className="font-medium text-slate-800 mt-4 mb-2">Dati di terzi:</h3>
            <p>
              Caricando dati relativi ai tuoi clienti (aziende HoReCa, contatti), dichiari di:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Avere titolo legittimo per trattare tali dati</li>
              <li>Rispettare gli obblighi GDPR come titolare/responsabile</li>
              <li>Manlevare REPING da qualsiasi contestazione relativa</li>
            </ul>
          </section>

          {/* 5. Piani e pagamenti */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">5. Piani e Pagamenti</h2>
            
            <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
              <p className="font-medium text-green-800 mb-2">🎁 Durante la Beta: GRATUITO</p>
              <p className="text-green-700 text-sm">
                La partecipazione al programma Beta è <strong>completamente gratuita</strong>. 
                Non ti verrà chiesto di inserire carte di credito o metodi di pagamento. 
                Hai accesso a tutte le funzionalità senza limiti durante il periodo di test.
              </p>
            </div>

            <p className="mb-3">Dopo la Beta, REPING offrirà diversi piani di abbonamento:</p>
            
            <div className="grid gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                <h4 className="font-medium text-slate-900">Piano Premium</h4>
                <ul className="text-xs text-slate-600 mt-2 space-y-1">
                  <li>• Fino a 500 clienti</li>
                  <li>• 60 query chat/giorno</li>
                  <li>• Export PDF limitati</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h4 className="font-medium text-blue-900">Piano Business</h4>
                <ul className="text-xs text-blue-700 mt-2 space-y-1">
                  <li>• Fino a 1000 clienti</li>
                  <li>• Query illimitate</li>
                  <li>• Export illimitati</li>
                  <li>• Modalità Guida</li>
                </ul>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              I prezzi definitivi saranno comunicati prima del termine della Beta. 
              I tester riceveranno condizioni speciali di lancio.
            </p>
          </section>

          {/* 6. Proprietà intellettuale */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">6. Proprietà Intellettuale</h2>
            <p>
              Il marchio REPING, il logo, il codice sorgente, il design e tutti i contenuti 
              originali sono di proprietà esclusiva del titolare.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>Ti concediamo una licenza limitata, non esclusiva e revocabile per usare il servizio</li>
              <li>Non puoi copiare, modificare, distribuire o creare opere derivate</li>
              <li>I dati che carichi restano di tua proprietà</li>
            </ul>
          </section>

          {/* 7. AI Disclaimer */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">7. Limitazioni dell'Intelligenza Artificiale</h2>
            <div className="bg-purple-50 border border-purple-200 rounded p-4">
              <p className="font-medium text-purple-800 mb-2">🤖 Disclaimer AI - IMPORTANTE</p>
              <p className="text-purple-700">
                L'assistente AI di REPING utilizza modelli di linguaggio (LLM) che:
              </p>
              <ul className="list-disc list-inside mt-2 text-purple-700 space-y-1">
                <li>Possono generare risposte errate, incomplete o fuorvianti</li>
                <li>Non hanno conoscenza in tempo reale oltre i dati forniti</li>
                <li>Non sostituiscono il giudizio professionale dell'utente</li>
                <li>Possono interpretare male le richieste</li>
              </ul>
              <p className="text-purple-700 mt-3 font-medium">
                L'utente è l'unico responsabile delle decisioni prese sulla base delle 
                risposte dell'AI. REPING non risponde di danni derivanti dall'affidamento 
                su informazioni generate automaticamente.
              </p>
            </div>
          </section>

          {/* 8. Limitazione responsabilità */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">8. Limitazione di Responsabilità</h2>
            <p>
              Nei limiti consentiti dalla legge applicabile:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>
                Il servizio è fornito "così com'è" (AS IS), senza garanzie di alcun tipo
              </li>
              <li>
                Non garantiamo disponibilità continua, assenza di errori o sicurezza assoluta
              </li>
              <li>
                REPING non è responsabile per danni indiretti, perdita di profitti o dati
              </li>
              <li>
                La responsabilità massima è limitata all'importo pagato negli ultimi 12 mesi
              </li>
              <li>
                Non rispondiamo di problemi causati da terze parti (provider, API esterne)
              </li>
            </ul>
          </section>

          {/* 9. Sospensione e risoluzione */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">9. Sospensione e Risoluzione</h2>
            <p>
              Possiamo sospendere o terminare il tuo account se:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Violi questi Termini di Servizio</li>
              <li>Utilizzi il servizio per scopi illeciti</li>
              <li>Non paghi le quote dovute (per piani a pagamento)</li>
              <li>Per motivi di sicurezza o manutenzione</li>
            </ul>
            <p className="mt-3">
              Puoi cancellare il tuo account in qualsiasi momento dalla sezione{" "}
              <Link href="/settings/my-data" className="text-blue-600 hover:underline">I Miei Dati</Link>.
            </p>
          </section>

          {/* 10. Modifiche */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">10. Modifiche ai Termini</h2>
            <p>
              Ci riserviamo di modificare questi Termini. Le modifiche sostanziali saranno 
              comunicate con almeno 30 giorni di preavviso via email. L'uso continuato del 
              servizio dopo tale periodo costituisce accettazione dei nuovi termini.
            </p>
          </section>

          {/* 11. Legge applicabile */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">11. Legge Applicabile e Foro Competente</h2>
            <p>
              Questi Termini sono regolati dalla legge italiana. Per qualsiasi controversia 
              sarà competente in via esclusiva il Foro di Milano, salvo il foro inderogabile 
              del consumatore ove applicabile.
            </p>
          </section>

          {/* 12. Contatti */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">12. Contatti</h2>
            <p>Per domande su questi Termini:</p>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 mt-2">
              <p>Email: <a href="mailto:info@reping.it" className="text-blue-600">info@reping.it</a></p>
              <p>PEC: <a href="mailto:repping@pec.it" className="text-blue-600">repping@pec.it</a></p>
            </div>
          </section>

          {/* Footer links */}
          <footer className="pt-6 border-t border-slate-200 flex flex-wrap gap-4 text-sm">
            <Link href="/legal/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            <Link href="/legal/cookies" className="text-blue-600 hover:underline">Cookie Policy</Link>
            <Link href="/settings/my-data" className="text-blue-600 hover:underline">I Miei Dati</Link>
          </footer>

        </article>
      </div>
    </div>
  );
}

