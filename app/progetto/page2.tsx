import React from 'react';

const ProjectDocument = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-blue-800 mb-2">VENDITORI MICIDIALI</h1>
        <h2 className="text-4xl font-bold text-blue-800 mb-2">Sales IA CoPilot</h2>
        <p className="text-xl text-blue-600">Partnership di Sviluppo e Business Plan</p>
        <div className="mt-4 flex justify-center items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">Da CoPilot a Desktop Aziendale — Partnership Strategy</p>
        </div>
        <p className="text-gray-500 mt-2">Proposta di Collaborazione - Agosto 2025</p>
      </header>

      {/* 1) Il Problema Che Risolviamo */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-red-100 text-red-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">1</span>
          </div>
          <h2 className="text-2xl font-semibold">Il Problema delle PMI Italiane</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-lg mb-3 text-red-700">🔥 Situazione Attuale</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span>I venditori perdono il 40% del tempo in burocrazia (CRM, report, ricerca informazioni)</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span>Informazioni clienti sparse, incomplete, spesso dimenticate</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span>Opportunità perse per mancanza di preparazione agli appuntamenti</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span>Software aziendali disconnessi, costosi e mai utilizzati davvero</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-3 text-green-700">✅ La Nostra Soluzione</h3>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-blue-800 font-medium mb-2">Un assistente IA che cresce con la vostra azienda:</p>
                <p className="text-sm text-blue-700">Inizia come CoPilot per le vendite, ma si evolve fino a diventare il sistema operativo digitale completo della vostra PMI - tutto attraverso conversazione naturale, zero moduli da compilare.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 2) Roadmap di Partnership */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">2</span>
          </div>
          <h2 className="text-2xl font-semibold">Il Nostro Percorso Insieme</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="space-y-6">
            
            {/* FASE 1 */}
            <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded-r-lg">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-green-700">🚀 FASE 1: CoPilot Vendite (4-6 mesi)</h3>
                <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs font-medium">SVILUPPO ATTUALE</span>
              </div>
              <p className="text-green-800 mb-3 font-medium">Valore immediato per i vostri venditori</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Cosa Fa Per Voi:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Elimina compilazione CRM (risparmio 2 ore/giorno per venditore)</li>
                    <li>• Briefing clienti automatici prima di ogni appuntamento</li>
                    <li>• Report giornalieri pronti da condividere</li>
                    <li>• Memoria perfetta di tutte le conversazioni clienti</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Come Funziona:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Conversazione naturale: "Ho appena visto Rossi, è interessato ma vuole uno sconto"</li>
                    <li>• L'IA capisce, struttura e memorizza tutto</li>
                    <li>• Al mattino vi dice: "Oggi vedi Bianchi, ricorda che preferisce email, non telefonate"</li>
                    <li>• Report automatici per manager e colleghi</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-green-100 rounded-lg">
                <p className="text-green-800 text-sm font-medium">📊 ROI Atteso: +25% tempo vendita effettiva, -80% tempo amministrativo</p>
              </div>
            </div>

            {/* FASE 2 */}
            <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r-lg">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-blue-700">🧠 FASE 2: Sistema Intelligente (6-12 mesi)</h3>
                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">SVILUPPO FUTURO</span>
              </div>
              <p className="text-blue-800 mb-3 font-medium">L'IA impara dai vostri successi e li replica</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Funzionalità Avanzate:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Apprende dai vostri migliori venditori e suggerisce strategie</li>
                    <li>• Anticipa i bisogni: "Rossi di solito ordina a fine mese, chiamalo"</li>
                    <li>• Community aziendale: condivide tattiche vincenti nel team</li>
                    <li>• Dashboard manager con insights automatici</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Integrazioni:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Si collega al vostro gestionale esistente</li>
                    <li>• Importa email, calendari, telefonate</li>
                    <li>• Esporta dati per contabilità e amministrazione</li>
                    <li>• App mobile per venditori in movimento</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-blue-800 text-sm font-medium">🎯 Obiettivo: Diventare il sistema CRM definitivo, personalizzato sui vostri processi</p>
              </div>
            </div>

            {/* FASE 3 */}
            <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-4 rounded-r-lg">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-purple-700">🏢 FASE 3: Desktop Aziendale (12-18 mesi)</h3>
                <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">VISIONE FINALE</span>
              </div>
              <p className="text-purple-800 mb-3 font-medium">Un unico sistema per tutta la vostra azienda</p>
              
              <div className="grid md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-medium text-xs mb-2 text-purple-700">💼 Operations</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Gestione fornitori</li>
                    <li>• Tracking progetti</li>
                    <li>• Ordini automatici</li>
                  </ul>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-medium text-xs mb-2 text-purple-700">👥 Risorse Umane</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Onboarding nuovo personale</li>
                    <li>• Gestione ferie/permessi</li>
                    <li>• Knowledge base aziendale</li>
                  </ul>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h4 className="font-medium text-xs mb-2 text-purple-700">💰 Amministrazione</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Budget e cash flow</li>
                    <li>• Fatturazione automatica</li>
                    <li>• Compliance fiscale</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                <p className="text-purple-800 text-sm font-medium">🎯 Risultato: La vostra PMI diventa completamente digitale, ma senza complessità</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 3) Cosa Significa Per La Vostra Azienda */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">3</span>
          </div>
          <h2 className="text-2xl font-semibold">Cosa Significa Per La Vostra Azienda</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-bold text-green-700 mb-2 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8s.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582s-.07.34-.433.582c-.155.103-.346.196-.567.267z"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8s.602 1.766 1.324 2.246.676.662 1.676.662v1.091c-.155-.03-.293-.083-.398-.145a.75.75 0 00-.814 1.26c.293.19.608.394.95.55A1 1 0 009 14h2a1 1 0 00.262-.044c.342-.156.657-.36.95-.55a.75.75 0 00-.814-1.26c-.105.062-.243.115-.398.145v-1.091c1-.03 1.676-.212 2.324-.662C14.398 9.766 15 8.991 15 8s-.602-1.766-1.324-2.246A4.535 4.535 0 0012 5.092V5a1 1 0 011-1z" clipRule="evenodd"/>
                  </svg>
                  Risparmio Economico Immediato
                </h3>
                <ul className="text-sm space-y-1">
                  <li>• <strong>-2 ore/giorno per venditore</strong> in burocrazia = più tempo per vendere</li>
                  <li>• <strong>Eliminazione licenze CRM</strong> tradizionali costose</li>
                  <li>• <strong>Riduzione errori e dimenticanze</strong> che costano opportunità</li>
                  <li>• <strong>Meno consulenze esterne</strong> per gestione dati</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-blue-700 mb-2 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd"/>
                  </svg>
                  Crescita del Business
                </h3>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Venditori più preparati</strong> = più chiusure</li>
                  <li>• <strong>Follow-up automatici</strong> = zero opportunità perse</li>
                  <li>• <strong>Customer experience professionale</strong> = clienti più soddisfatti</li>
                  <li>• <strong>Insights sui trend</strong> = decisioni più informate</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-lg">
                <h3 className="font-bold text-amber-700 mb-2 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Semplicità Operativa
                </h3>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Zero formazione</strong> - si usa parlando normalmente</li>
                  <li>• <strong>Zero moduli da compilare</strong> - tutto via conversazione</li>
                  <li>• <strong>Funziona subito</strong> - nessuna configurazione complessa</li>
                  <li>• <strong>Cresce con voi</strong> - più lo usate, più diventa intelligente</li>
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-bold text-purple-700 mb-2 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/>
                  </svg>
                  Vantaggio Competitivo
                </h3>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Prima della concorrenza</strong> - tecnologia all'avanguardia</li>
                  <li>• <strong>Barriere all'uscita</strong> - più lo usate, più diventa vostro</li>
                  <li>• <strong>Immagine innovativa</strong> - clienti impressionati dalla vostra efficienza</li>
                  <li>• <strong>Scalabilità</strong> - cresce senza costi aggiuntivi</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 4) La Partnership Proposta */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-indigo-100 text-indigo-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">4</span>
          </div>
          <h2 className="text-2xl font-semibold">La Nostra Proposta di Partnership</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          
          <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500 mb-6">
            <p className="text-indigo-800 font-medium">Non vi stiamo vendendo un software. Vi proponiamo una partnership strategica per co-sviluppare il futuro degli strumenti aziendali per PMI.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-3 text-green-700">🤝 Cosa Vi Offriamo</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span><strong>Sviluppo personalizzato</strong> sui vostri processi reali</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span><strong>Implementazione graduale</strong> senza rischi operativi</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span><strong>Supporto tecnico dedicato</strong> durante tutto il percorso</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span><strong>ROI garantito</strong> o revisione delle condizioni</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span><strong>Licenza perpetua</strong> per le funzionalità sviluppate insieme</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-3 text-blue-700">🎯 Cosa Chiediamo</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span><strong>Accesso ai vostri processi</strong> per personalizzazione</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span><strong>Feedback costante</strong> dal team vendite</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span><strong>Disponibilità per test</strong> e iterazioni</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span><strong>Partecipazione attiva</strong> come case study (se desiderato)</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  <span><strong>Investimento condiviso</strong> nel percorso di crescita</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 5) Timing e Urgenza */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-red-100 text-red-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">5</span>
          </div>
          <h2 className="text-2xl font-semibold">Perché Adesso È Il Momento Giusto</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          
          <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500 mb-6">
            <h3 className="text-red-800 font-bold mb-2">⏰ Finestra Competitiva Limitata</h3>
            <p className="text-red-700 text-sm">Le grandi aziende tech si stanno accorgendo dell'opportunità PMI. Chi si muove adesso avrà 2-3 anni di vantaggio sui competitors.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-amber-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-amber-600 mb-2">18 MESI</div>
              <p className="text-sm text-amber-800">Tempo stimato prima che il mercato si saturi di soluzioni simili</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">PRIMI</div>
              <p className="text-sm text-green-800">Diventerete i primi nella vostra area con questa tecnologia</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">LOCK-IN</div>
              <p className="text-sm text-blue-800">Più l'IA impara i vostri processi, più diventa difficile per i competitors imitarvi</p>
            </div>
          </div>

        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 6) Prossimi Passi */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">6</span>
          </div>
          <h2 className="text-2xl font-semibold">Come Iniziamo</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 rounded-lg w-10 h-10 flex items-center justify-center mr-4 flex-shrink-0">
                <span className="font-bold">1</span>
              </div>
              <div>
                <h3 className="font-medium text-lg">Incontro Conoscitivo (1 settimana)</h3>
                <p className="text-gray-600">Analizziamo insieme i vostri processi vendita attuali, identificiamo le priorità e definiamo gli obiettivi del progetto.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 rounded-lg w-10 h-10 flex items-center justify-center mr-4 flex-shrink-0">
                <span className="font-bold">2</span>
              </div>
              <div>
                <h3 className="font-medium text-lg">Prototipo Personalizzato (2-3 settimane)</h3>
                <p className="text-gray-600">Sviluppiamo una versione demo che funziona sui vostri dati e processi reali, non una demo generica.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 rounded-lg w-10 h-10 flex items-center justify-center mr-4 flex-shrink-0">
                <span className="font-bold">3</span>
              </div>
              <div>
                <h3 className="font-medium text-lg">Test Pilota (1 mese)</h3>
                <p className="text-gray-600">1-2 venditori usano il sistema in situazioni reali. Misuriamo i risultati e raccogliamo feedback.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 rounded-lg w-10 h-10 flex items-center justify-center mr-4 flex-shrink-0">
                <span className="font-bold">4</span>
              </div>
              <div>
                <h3 className="font-medium text-lg">Implementazione Completa</h3>
                <p className="text-gray-600">Se i risultati del pilota sono positivi, estendiamo a tutto il team vendite e iniziamo a pianificare le fasi successive.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 7) Conclusione */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">7</span>
          </div>
          <h2 className="text-2xl font-semibold">Il Futuro Inizia Oggi</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p className="mb-4 font-medium text-lg">Non stiamo costruendo solo un CoPilot per venditori.</p>
          <p className="mb-4">Stiamo creando il sistema operativo digitale del futuro per le PMI italiane - un sistema che capisce, ricorda, impara e cresce con la vostra azienda.</p>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-l-4 border-blue-500">
            <p className="text-gray-800 font-medium flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Insieme possiamo costruire il vantaggio competitivo che vi distinguerà per i prossimi 10 anni.
            </p>
          </div>

          <div className="mt-6 text-center">
            <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="font-medium">Siete pronti a iniziare questo viaggio con noi?</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500">
        <p className="font-medium text-gray-700">Sales IA CoPilot → Desktop Aziendale Completo</p>
        <p className="mt-2">La Partnership che Trasforma la Vostra PMI</p>
        <p className="mt-2">© 2025 IA Utile. Tutti i diritti riservati.</p>
      </footer>
    </div>
  );
};

export default ProjectDocument;
