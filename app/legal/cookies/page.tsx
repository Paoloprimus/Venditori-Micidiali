"use client";

import Link from "next/link";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="topbar">
        <Link href="/" className="iconbtn">← Home</Link>
        <span className="title">Cookie Policy</span>
        <span className="spacer" />
        <span className="badge">v1.0 - Dic 2025</span>
      </div>

      {/* Contenuto */}
      <div className="container py-8">
        <article className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 text-sm text-slate-700 leading-relaxed">
          
          <header>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Informativa sui Cookie</h1>
            <p className="text-slate-500 text-xs">
              Ai sensi della Direttiva ePrivacy 2002/58/CE e del Provvedimento del Garante n. 229/2014
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Ultimo aggiornamento: 2 Dicembre 2025
            </p>
          </header>

          <hr className="border-slate-200" />

          {/* 1. Cosa sono i cookie */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Cosa Sono i Cookie</h2>
            <p>
              I cookie sono piccoli file di testo che i siti web salvano sul tuo dispositivo 
              (computer, smartphone, tablet) quando li visiti. Servono a memorizzare informazioni 
              sulla tua navigazione per migliorare l'esperienza utente.
            </p>
            <p className="mt-2">
              REPING utilizza cookie per far funzionare correttamente l'applicazione e, 
              con il tuo consenso, per analizzare l'utilizzo del servizio.
            </p>
          </section>

          {/* 2. Cookie tecnici */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Cookie Tecnici (Necessari)</h2>
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="font-medium text-green-800 mb-2">✅ Non richiedono consenso</p>
              <p className="text-green-700">
                Questi cookie sono indispensabili per il funzionamento di REPING e non possono 
                essere disattivati senza compromettere l'uso dell'applicazione.
              </p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 border-b">Nome</th>
                    <th className="text-left p-2 border-b">Scopo</th>
                    <th className="text-left p-2 border-b">Durata</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b font-mono">sb-*-auth-token</td>
                    <td className="p-2 border-b">Autenticazione Supabase (sessione utente)</td>
                    <td className="p-2 border-b">7 giorni</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono">repping:pph</td>
                    <td className="p-2 border-b">Chiave crittografia (localStorage)</td>
                    <td className="p-2 border-b">Sessione</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono">repping:cookie_consent</td>
                    <td className="p-2 border-b">Memorizza preferenze cookie</td>
                    <td className="p-2 border-b">12 mesi</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. Cookie analytics */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">3. Cookie di Analytics (Opzionali)</h2>
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="font-medium text-blue-800 mb-2">📊 Richiedono il tuo consenso</p>
              <p className="text-blue-700">
                Questi cookie ci aiutano a capire come gli utenti utilizzano REPING, 
                permettendoci di migliorare il servizio. Raccolgono informazioni in forma 
                anonima e aggregata.
              </p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 border-b">Servizio</th>
                    <th className="text-left p-2 border-b">Scopo</th>
                    <th className="text-left p-2 border-b">Privacy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b">Vercel Analytics</td>
                    <td className="p-2 border-b">Statistiche di utilizzo, performance</td>
                    <td className="p-2 border-b">
                      <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                        Policy Vercel
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Nota: Al momento non utilizziamo Google Analytics o altri tracker di terze parti 
              che richiedono consenso specifico. Questa policy sarà aggiornata se verranno 
              introdotti nuovi strumenti di analytics.
            </p>
          </section>

          {/* 4. Cookie terze parti */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">4. Cookie di Terze Parti</h2>
            <p>
              REPING non utilizza cookie di profilazione pubblicitaria o cookie di social media. 
              Non vendiamo dati a terze parti per scopi pubblicitari.
            </p>
            <p className="mt-2">
              I servizi di terze parti che utilizziamo (Supabase per database, OpenAI per AI) 
              non installano cookie sul tuo browser.
            </p>
          </section>

          {/* 5. Come gestire i cookie */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">5. Come Gestire i Cookie</h2>
            
            <h3 className="font-medium text-slate-800 mt-4 mb-2">Tramite REPING:</h3>
            <p>
              Puoi modificare le tue preferenze sui cookie in qualsiasi momento cliccando sul 
              link "Gestisci Cookie" nel footer dell'applicazione o visitando questa pagina.
            </p>

            <h3 className="font-medium text-slate-800 mt-4 mb-2">Tramite il browser:</h3>
            <p>
              Puoi anche gestire i cookie attraverso le impostazioni del tuo browser:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2 text-xs">
              <li>
                <strong>Chrome:</strong>{" "}
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                  Gestione cookie Chrome
                </a>
              </li>
              <li>
                <strong>Firefox:</strong>{" "}
                <a href="https://support.mozilla.org/it/kb/Gestione%20dei%20cookie" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                  Gestione cookie Firefox
                </a>
              </li>
              <li>
                <strong>Safari:</strong>{" "}
                <a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                  Gestione cookie Safari
                </a>
              </li>
              <li>
                <strong>Edge:</strong>{" "}
                <a href="https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                  Gestione cookie Edge
                </a>
              </li>
            </ul>

            <div className="bg-amber-50 border border-amber-200 rounded p-4 mt-4">
              <p className="font-medium text-amber-800 mb-2">⚠️ Attenzione</p>
              <p className="text-amber-700 text-xs">
                Disabilitare i cookie tecnici impedirà il funzionamento di REPING. 
                In particolare, i cookie di autenticazione (sb-*-auth-token) sono 
                indispensabili per mantenere la sessione di login.
              </p>
            </div>
          </section>

          {/* 6. Consenso e revoca */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">6. Consenso e Revoca</h2>
            <p>
              Al primo accesso a REPING, ti viene mostrato un banner per scegliere quali 
              cookie accettare. Le tue preferenze sono salvate e rispettate per 12 mesi.
            </p>
            <p className="mt-2">
              Puoi revocare o modificare il consenso in qualsiasi momento. La revoca non 
              pregiudica la liceità del trattamento effettuato prima della revoca.
            </p>
          </section>

          {/* 7. LocalStorage e SessionStorage */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">7. Altre Tecnologie di Storage</h2>
            <p>
              Oltre ai cookie, REPING utilizza altre tecnologie di memorizzazione locale:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>
                <strong>localStorage:</strong> per salvare le preferenze dell'app e la chiave 
                di crittografia (cancellata al logout)
              </li>
              <li>
                <strong>sessionStorage:</strong> per dati temporanei della sessione corrente
              </li>
            </ul>
            <p className="mt-2">
              Questi dati sono memorizzati solo sul tuo dispositivo e non vengono trasmessi 
              ai nostri server.
            </p>
          </section>

          {/* 8. Modifiche */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">8. Modifiche alla Cookie Policy</h2>
            <p>
              Questa Cookie Policy può essere aggiornata periodicamente. Le modifiche saranno 
              pubblicate su questa pagina con la nuova data di aggiornamento. Per modifiche 
              sostanziali, mostreremo nuovamente il banner cookie.
            </p>
          </section>

          {/* 9. Contatti */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">9. Contatti</h2>
            <p>Per domande sui cookie:</p>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 mt-2">
              <p>Email: <a href="mailto:privacy@repping.it" className="text-blue-600">privacy@repping.it</a></p>
            </div>
          </section>

          {/* Footer links */}
          <footer className="pt-6 border-t border-slate-200 flex flex-wrap gap-4 text-sm">
            <Link href="/legal/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            <Link href="/legal/terms" className="text-blue-600 hover:underline">Termini di Servizio</Link>
            <Link href="/settings/my-data" className="text-blue-600 hover:underline">I Miei Dati</Link>
          </footer>

        </article>
      </div>
    </div>
  );
}

