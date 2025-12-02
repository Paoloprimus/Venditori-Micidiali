"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="topbar">
        <Link href="/" className="iconbtn">← Home</Link>
        <span className="title">Privacy Policy</span>
        <span className="spacer" />
        <span className="badge">v1.0 - Dic 2025</span>
      </div>

      {/* Contenuto */}
      <div className="container py-8">
        <article className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 text-sm text-slate-700 leading-relaxed">
          
          <header>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Informativa sulla Privacy</h1>
            <p className="text-slate-500 text-xs">
              Ai sensi del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Ultimo aggiornamento: 2 Dicembre 2025
            </p>
          </header>

          <hr className="border-slate-200" />

          {/* 1. Titolare */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Titolare del Trattamento</h2>
            <p>
              Il Titolare del trattamento dei dati personali è:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 mt-2">
              <p><strong>REPPING</strong></p>
              <p>Email: privacy@repping.it</p>
              <p>PEC: repping@pec.it</p>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Nota: I dati del titolare saranno completati con la ragione sociale definitiva al momento del lancio.
            </p>
          </section>

          {/* 2. Dati raccolti */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Categorie di Dati Raccolti</h2>
            <p>REPPING raccoglie le seguenti categorie di dati personali:</p>
            
            <h3 className="font-medium text-slate-800 mt-4 mb-2">Dati forniti dall'utente:</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Dati anagrafici: nome, cognome, email</li>
              <li>Credenziali di accesso: email e password (hash)</li>
              <li>Dati dei clienti HoReCa inseriti dall'utente (nome azienda, indirizzo, contatti)</li>
              <li>Note, visite, ordini e altre informazioni commerciali</li>
            </ul>

            <h3 className="font-medium text-slate-800 mt-4 mb-2">Dati raccolti automaticamente:</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Indirizzo IP</li>
              <li>Dati di navigazione e utilizzo dell'app</li>
              <li>Dati di geolocalizzazione (solo se autorizzati)</li>
              <li>Tipo di dispositivo e browser</li>
            </ul>
          </section>

          {/* 3. Finalità */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">3. Finalità del Trattamento</h2>
            <p>I dati sono trattati per le seguenti finalità:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li><strong>Erogazione del servizio:</strong> gestione account, funzionalità dell'app, assistente AI</li>
              <li><strong>Miglioramento del servizio:</strong> analisi aggregate e anonime dell'utilizzo</li>
              <li><strong>Comunicazioni di servizio:</strong> notifiche tecniche, aggiornamenti, sicurezza</li>
              <li><strong>Marketing:</strong> solo previo consenso esplicito</li>
              <li><strong>Obblighi legali:</strong> adempimenti fiscali e normativi</li>
            </ul>
          </section>

          {/* 4. Base giuridica */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">4. Base Giuridica</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>Contratto:</strong> per l'erogazione del servizio richiesto</li>
              <li><strong>Consenso:</strong> per marketing e cookie analytics</li>
              <li><strong>Interesse legittimo:</strong> per sicurezza e prevenzione frodi</li>
              <li><strong>Obbligo legale:</strong> per adempimenti normativi</li>
            </ul>
          </section>

          {/* 5. Crittografia */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">5. Crittografia dei Dati</h2>
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <p className="font-medium text-amber-800 mb-2">⚠️ Importante: Crittografia Client-Side</p>
              <p className="text-amber-700">
                REPPING utilizza un sistema di <strong>crittografia end-to-end</strong> per proteggere 
                i dati sensibili dei tuoi clienti. I dati vengono cifrati sul tuo dispositivo prima 
                di essere inviati ai nostri server.
              </p>
              <p className="text-amber-700 mt-2">
                <strong>La tua password funge da chiave di cifratura.</strong> Se perdi la password 
                e non riesci a recuperarla, i dati cifrati saranno <strong>irrecuperabili</strong>. 
                Né REPPING né terze parti possono decifrare i tuoi dati senza la password.
              </p>
            </div>
          </section>

          {/* 6. Destinatari */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">6. Destinatari dei Dati</h2>
            <p>I dati possono essere condivisi con:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>
                <strong>Supabase Inc.</strong> (USA) - Hosting database
                <span className="text-xs text-slate-500 block ml-5">Clausole contrattuali standard (SCC)</span>
              </li>
              <li>
                <strong>Vercel Inc.</strong> (USA) - Hosting applicazione
                <span className="text-xs text-slate-500 block ml-5">Clausole contrattuali standard (SCC)</span>
              </li>
              <li>
                <strong>OpenAI Inc.</strong> (USA) - Servizi di intelligenza artificiale
                <span className="text-xs text-slate-500 block ml-5">Vedi sezione 7 per dettagli</span>
              </li>
            </ul>
          </section>

          {/* 7. Trasferimento extra-UE */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">7. Trasferimento Dati Extra-UE</h2>
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="font-medium text-blue-800 mb-2">📍 Trasferimento verso gli Stati Uniti</p>
              <p className="text-blue-700">
                Alcuni nostri fornitori (Supabase, Vercel, OpenAI) hanno sede negli USA. 
                Il trasferimento dei dati avviene in conformità al GDPR attraverso:
              </p>
              <ul className="list-disc list-inside mt-2 text-blue-700 space-y-1">
                <li>Clausole Contrattuali Standard (SCC) approvate dalla Commissione UE</li>
                <li>Data Processing Agreement (DPA) con ogni fornitore</li>
                <li>Misure tecniche supplementari (crittografia)</li>
              </ul>
              <p className="text-blue-700 mt-2">
                <strong>OpenAI:</strong> Le richieste all'assistente AI vengono elaborate da OpenAI. 
                I dati inviati sono minimizzati e non includono informazioni identificative dirette 
                quando possibile. OpenAI non utilizza i dati API per addestrare i propri modelli.
              </p>
            </div>
          </section>

          {/* 8. Conservazione */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">8. Periodo di Conservazione</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>Dati dell'account:</strong> per tutta la durata del servizio + 30 giorni</li>
              <li><strong>Dati commerciali:</strong> 10 anni (obblighi fiscali)</li>
              <li><strong>Log di sistema:</strong> 12 mesi</li>
              <li><strong>Cookie analytics:</strong> 13 mesi massimo</li>
            </ul>
          </section>

          {/* 9. Diritti */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">9. I Tuoi Diritti</h2>
            <p>Ai sensi degli articoli 15-22 del GDPR, hai diritto di:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li><strong>Accesso:</strong> ottenere conferma e copia dei tuoi dati</li>
              <li><strong>Rettifica:</strong> correggere dati inesatti o incompleti</li>
              <li><strong>Cancellazione:</strong> richiedere la cancellazione dei dati ("diritto all'oblio")</li>
              <li><strong>Limitazione:</strong> limitare il trattamento in determinati casi</li>
              <li><strong>Portabilità:</strong> ricevere i dati in formato strutturato (JSON/CSV)</li>
              <li><strong>Opposizione:</strong> opporti al trattamento per motivi legittimi</li>
              <li><strong>Revoca consenso:</strong> revocare i consensi in qualsiasi momento</li>
            </ul>
            <p className="mt-3">
              Per esercitare i tuoi diritti, accedi alla sezione{" "}
              <Link href="/settings/my-data" className="text-blue-600 hover:underline">I Miei Dati</Link>
              {" "}oppure scrivi a <a href="mailto:privacy@repping.it" className="text-blue-600 hover:underline">privacy@repping.it</a>.
            </p>
          </section>

          {/* 10. Reclamo */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">10. Reclamo al Garante</h2>
            <p>
              Se ritieni che il trattamento dei tuoi dati violi il GDPR, puoi presentare reclamo al:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 mt-2">
              <p><strong>Garante per la protezione dei dati personali</strong></p>
              <p>Piazza Venezia 11 - 00187 Roma</p>
              <p>Email: <a href="mailto:garante@gpdp.it" className="text-blue-600">garante@gpdp.it</a></p>
              <p>PEC: <a href="mailto:protocollo@pec.gpdp.it" className="text-blue-600">protocollo@pec.gpdp.it</a></p>
              <p>Sito: <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener" className="text-blue-600">www.garanteprivacy.it</a></p>
            </div>
          </section>

          {/* 11. AI Disclaimer */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">11. Utilizzo dell'Intelligenza Artificiale</h2>
            <div className="bg-purple-50 border border-purple-200 rounded p-4">
              <p className="font-medium text-purple-800 mb-2">🤖 Disclaimer AI</p>
              <p className="text-purple-700">
                REPPING utilizza modelli di intelligenza artificiale (OpenAI GPT) per fornire 
                assistenza e suggerimenti. Le risposte dell'AI sono generate automaticamente e 
                potrebbero contenere errori o imprecisioni.
              </p>
              <p className="text-purple-700 mt-2">
                <strong>L'utente è responsabile</strong> della verifica delle informazioni fornite 
                dall'assistente prima di prendere decisioni commerciali. REPPING non garantisce 
                l'accuratezza, completezza o idoneità delle risposte AI per scopi specifici.
              </p>
            </div>
          </section>

          {/* 12. Modifiche */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">12. Modifiche alla Privacy Policy</h2>
            <p>
              Ci riserviamo di modificare questa informativa. Le modifiche saranno comunicate 
              tramite email o notifica in-app. La versione aggiornata sarà sempre disponibile 
              su questa pagina con la data di ultimo aggiornamento.
            </p>
          </section>

          {/* Footer links */}
          <footer className="pt-6 border-t border-slate-200 flex flex-wrap gap-4 text-sm">
            <Link href="/legal/terms" className="text-blue-600 hover:underline">Termini di Servizio</Link>
            <Link href="/legal/cookies" className="text-blue-600 hover:underline">Cookie Policy</Link>
            <Link href="/settings/my-data" className="text-blue-600 hover:underline">I Miei Dati</Link>
          </footer>

        </article>
      </div>
    </div>
  );
}

