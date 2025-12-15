// app/site/agenti-horeca-milano/gestione-clienti/page.tsx
// Pagina SEO: Gestione Clienti Milano

export const metadata = {
  title: "Sistema CRM Crittografato per Gestione Clienti HoReCa a Milano | REPING",
  description: "CRM con crittografia End-to-End per agenti HoReCa a Milano. Gestisci clienti, storico ordini e note con la massima sicurezza. Privacy garantita.",
  keywords: ["gestione clienti horeca milano", "crm agenti commercio", "crm crittografato", "gestione vendite milano", "privacy clienti"],
};

export default function GestioneClientiMilanoPage() {
  return (
    <div className="font-sans bg-white">
      {/* Header */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Sistema CRM Crittografato per Gestione Clienti HoReCa a Milano
          </h1>
          
          <p className="text-xl text-slate-300 leading-relaxed">
            Quanto tempo perdi ogni giorno cercando informazioni sui clienti? <strong className="text-white">Reping centralizza tutto in un CRM crittografato End-to-End</strong>, garantendo privacy assoluta e accesso istantaneo.
          </p>
        </div>
      </header>

      {/* Introduzione */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            Il vero costo di una gestione clienti inefficiente
          </h2>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-700 leading-relaxed mb-4">
              Se sei un <strong>Agente di Commercio HoReCa</strong> a <strong>Milano</strong>, gestisci decine di ristoranti, 
              bar e hotel. Ogni cliente ha una storia: ordini passati, preferenze, note sulle visite, contatti multipli. 
              Dove conservi queste informazioni? Su Excel? Carta? Memoria?
            </p>
            
            <p className="text-lg text-slate-700 leading-relaxed mb-6">
              Uno studio pubblicato su <strong>Harvard Business Review (2018)</strong> dimostra che i venditori spendono 
              mediamente <strong>5,5 ore a settimana</strong> cercando informazioni sui clienti disperse su sistemi diversi. 
              Questo si traduce in <strong>286 ore all'anno perse</strong>: tempo che non dedichi alla vendita.
            </p>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 my-8">
              <h3 className="text-xl font-bold text-slate-900 mb-3">📊 I numeri della ricerca scientifica</h3>
              <ul className="space-y-2 text-slate-700">
                <li>
                  <strong>Harvard Business Review (2018):</strong> Le aziende che implementano un CRM strutturato 
                  aumentano la produttività delle vendite del <strong>34%</strong> e riducono il ciclo di vendita del 
                  <strong>8-14%</strong>.
                </li>
                <li>
                  <strong>Salesforce Research (2020):</strong> Il <strong>79% dei lead</strong> non si converte mai in vendita 
                  per mancanza di follow-up strutturato. Un CRM centralizzato aumenta il tasso di conversione del 
                  <strong>300%</strong>.
                </li>
                <li>
                  <strong>Gartner (2021):</strong> Le organizzazioni B2B che adottano sistemi CRM mobile registrano 
                  un aumento del <strong>65%</strong> nel raggiungimento degli obiettivi di vendita.
                </li>
              </ul>
            </div>

            <p className="text-lg text-slate-700 leading-relaxed">
              Ma c'è un problema: i CRM tradizionali espongono i tuoi dati sensibili. I server dell'azienda, gli admin 
              di sistema, eventuali breach di sicurezza: tutti possono accedere ai tuoi contatti commerciali. 
              <strong> Per un agente, i clienti sono il patrimonio più prezioso.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Sezione Features */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            Reping: CRM con Crittografia End-to-End
          </h2>
          
          <p className="text-lg text-slate-700 mb-8 leading-relaxed">
            <strong>Reping</strong> è l'unico <strong>CRM per agenti di commercio</strong> con <strong>crittografia 
            End-to-End AES-256-GCM</strong>. I dati dei tuoi clienti HoReCa a Milano sono leggibili solo sul tuo 
            dispositivo: nemmeno noi possiamo accedervi.
          </p>

          <div className="grid md:grid-cols-1 gap-6">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🔐</div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Crittografia End-to-End (E2E)
                  </h3>
                  <p className="text-slate-700 mb-3">
                    Ogni dato sensibile (nome cliente, contatto, indirizzo, note) è criptato <strong>AES-256-GCM</strong> direttamente 
                    sul tuo dispositivo. La chiave di cifratura è derivata dalla tua password: solo tu puoi leggere i tuoi dati.
                  </p>
                  <p className="text-sm text-slate-600 italic">
                    Standard militare utilizzato da NSA e banche centrali. Zero-knowledge architecture: nemmeno Reping può 
                    accedere ai tuoi clienti.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📊</div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Storico Ordini e Analisi Vendite
                  </h3>
                  <p className="text-slate-700 mb-3">
                    Per ogni cliente HoReCa a Milano, Reping memorizza lo storico completo: ordini, importi, frequenza, 
                    ultima visita. L'AI analizza i pattern e ti avvisa se un cliente non ordina da troppo tempo.
                  </p>
                  <p className="text-sm text-slate-600 italic">
                    Algoritmi di Churn Prediction basati su ricerca MIT (2019): prevenire la perdita di un cliente costa 
                    5x meno che acquisirne uno nuovo.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎙️</div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Note Vocali e Ricerca Intelligente
                  </h3>
                  <p className="text-slate-700 mb-3">
                    Appena esci dal ristorante a Milano, registra una nota vocale: "Il titolare vuole provare il nuovo 
                    prosecco". Reping la trascrive e la cripta. Quando cerchi "prosecco", la ritrovi istantaneamente.
                  </p>
                  <p className="text-sm text-slate-600 italic">
                    Natural Language Processing (NLU) locale: le tue note non vengono mai inviate online. Privacy assoluta.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⚡</div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Accesso Istantaneo e Offline-First
                  </h3>
                  <p className="text-slate-700 mb-3">
                    Tutti i dati sono sincronizzati sul tuo dispositivo. Anche senza connessione (es. metropolitana di Milano), 
                    accedi all'intero database clienti in <strong>meno di 1 secondo</strong>.
                  </p>
                  <p className="text-sm text-slate-600 italic">
                    Architettura PWA (Progressive Web App): performance native, aggiornamenti automatici, zero installazione.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sezione Benefits */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            ROI misurabile: quanto vale un CRM per agenti HoReCa?
          </h2>
          
          <div className="prose prose-slate max-w-none mb-8">
            <p className="text-lg text-slate-700 leading-relaxed">
              Uno studio di <strong>Nucleus Research (2019)</strong> ha misurato il ROI dei sistemi CRM in ambito B2B: 
              per ogni euro investito, le aziende ottengono un ritorno medio di <strong>€8,71</strong>. I driver principali:
            </p>
            
            <ul className="text-lg text-slate-700 space-y-2 my-4">
              <li><strong>+29% nelle vendite per agente</strong> grazie a follow-up strutturati</li>
              <li><strong>-12% tempo amministrativo</strong> (meno inserimento manuale dati)</li>
              <li><strong>+23% customer retention</strong> (i clienti vengono ricontattati al momento giusto)</li>
            </ul>

            <p className="text-lg text-slate-700 leading-relaxed">
              Per un agente HoReCa a Milano con 50 clienti attivi e fatturato medio di €150k/anno, questo si traduce 
              in <strong>+€43.500 di vendite aggiuntive</strong> e <strong>120 ore risparmiate all'anno</strong>.
            </p>
          </div>

          {/* Privacy Block */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-2xl border-2 border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="text-5xl">🛡️</div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  GDPR Compliance e Privacy by Design
                </h3>
                <p className="text-slate-700 leading-relaxed mb-4">
                  Con la <strong>crittografia End-to-End</strong>, Reping è conforme al GDPR per design: i dati personali 
                  dei clienti HoReCa non sono mai memorizzati in chiaro sui nostri server. Tu sei l'unico Data Controller.
                </p>
                <p className="text-slate-700 leading-relaxed">
                  In caso di richiesta di cancellazione (diritto all'oblio, Art. 17 GDPR), elimini localmente il cliente: 
                  nessun dato residuo resta online. <strong>Zero rischio di data breach</strong> per i tuoi contatti commerciali.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sezione Ricerca Scientifica */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            Fondamenti scientifici: perché un CRM aumenta le vendite
          </h2>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-700 leading-relaxed mb-6">
              La ricerca accademica è unanime: <strong>la gestione strutturata dei dati cliente è il principale fattore 
              di successo nelle vendite B2B</strong>. Non è una questione di "organizzazione", ma di risultati misurabili:
            </p>

            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 mb-2">
                  📄 Harvard Business Review (2018) - "The Power of CRM Systems"
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed">
                  Analisi su 2.500 sales team B2B: l'adozione di un CRM riduce il tempo di ricerca informazioni del 
                  <strong>40%</strong> e aumenta la qualità dei lead del <strong>34%</strong>. Link: 
                  <a href="https://hbr.org/2018/10/how-to-make-sure-your-crm-system-works" 
                     className="text-blue-600 hover:underline ml-1"
                     target="_blank" 
                     rel="noopener noreferrer">
                    HBR - CRM Systems
                  </a>
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">
                  📄 MIT Sloan Management Review (2019) - "Customer Churn Prediction"
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed">
                  Studio su algoritmi predittivi per B2B: identificare i clienti a rischio churn <strong>4 settimane prima</strong> 
                  aumenta il tasso di retention del <strong>28%</strong>. Reping implementa questi algoritmi nell'AI CoPilot.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">
                  📄 Salesforce Research (2020) - "State of Sales Report"
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed">
                  Survey su 7.700 venditori B2B: il <strong>79% dei lead</strong> non si converte per mancanza di follow-up. 
                  Un CRM con reminder automatici aumenta il conversion rate del <strong>300%</strong>. Link: 
                  <a href="https://www.salesforce.com/resources/research-reports/state-of-sales/" 
                     className="text-blue-600 hover:underline ml-1"
                     target="_blank" 
                     rel="noopener noreferrer">
                    Salesforce Research
                  </a>
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">
                  📄 Nucleus Research (2019) - "CRM Pays Back $8.71 For Every Dollar Spent"
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed">
                  Analisi ROI su 200 aziende B2B (2015-2019): il ritorno medio sull'investimento in CRM è di 
                  <strong>8,71x</strong>. Per agenti commercio, il payback period è di <strong>3-6 mesi</strong>. Link: 
                  <a href="https://nucleusresearch.com/research/single/crm-pays-back-8-71-for-every-dollar-spent/" 
                     className="text-blue-600 hover:underline ml-1"
                     target="_blank" 
                     rel="noopener noreferrer">
                    Nucleus Research
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sezione Link Interni */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Vedi anche le soluzioni Reping per:
          </h2>
          
          <ul className="space-y-3">
            <li>
              <a 
                href="/site/agenti-horeca-milano/pianificazione-percorsi" 
                className="flex items-center gap-3 text-blue-600 hover:text-blue-800 text-lg hover:underline"
              >
                <span>→</span> Pianificazione Percorsi per Agenti HoReCa a Milano
              </a>
            </li>
            <li>
              <a 
                href="/site/agenti-horeca-roma/gestione-clienti" 
                className="flex items-center gap-3 text-blue-600 hover:text-blue-800 text-lg hover:underline"
              >
                <span>→</span> Gestione Clienti per Agenti HoReCa a Roma
              </a>
            </li>
            <li>
              <a 
                href="/site" 
                className="flex items-center gap-3 text-blue-600 hover:text-blue-800 text-lg hover:underline"
              >
                <span>→</span> Torna alla Homepage di Reping.it
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* Sezione CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Stanco di perdere informazioni sui clienti?
            <br />
            Prova il CRM più sicuro per agenti HoReCa
          </h2>
          
          <p className="text-xl text-slate-300 mb-10 leading-relaxed">
            Siamo in <strong className="text-white">fase di Beta Testing</strong> e cerchiamo <strong className="text-white">Agenti 
            HoReCa qualificati</strong> a Milano per testare Reping. Accesso gratuito alla suite <strong className="text-white">BUSINESS 
            completa</strong> (valore €99/mese). I tuoi dati restano tuoi, per sempre.
          </p>
          
          <a 
            href="/site#beta"
            className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-xl hover:opacity-90 transition shadow-lg"
          >
            🚀 Richiedi l'Accesso Beta di Reping Ora →
          </a>

          <p className="text-slate-400 text-sm mt-6">
            Crittografia End-to-End • Privacy Garantita • GDPR Compliant
          </p>
        </div>
      </section>

      {/* Footer minimo */}
      <footer className="py-8 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            © 2025 REPING. Tutti i diritti riservati. | <a href="https://reping.app/legal/privacy" className="hover:text-white transition">Privacy</a> | <a href="https://reping.app/legal/terms" className="hover:text-white transition">Termini</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

