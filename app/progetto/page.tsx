import React from 'react';

const ProjectDocument = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-800 mb-2">VENDITORI MICIDIALI</h1>
        <h2 className="text-4xl font-bold text-blue-800 mb-2">CoPilota alle Vendite</h2>
        <p className="text-xl text-blue-600">Documento di Progetto</p>
        <div className="mt-4 flex justify-center items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">Venditori Micidiali - CoPilota alle Vendite — v1.0</p>
        </div>
        <p className="text-gray-500 mt-2">Settembre 2025</p>
      </header>

      {/* 1) Il progetto */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">1</span>
          </div>
          <h2 className="text-2xl font-semibold">Perché nasce il progetto</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p className="mb-4">Spesso i Venditori hanno giornate frenetiche, tante informazioni di natura diversa e poco tempo per preparare bene gli appuntamenti.</p>
          <p className="mb-4">Il rischio concreto è dimenticare dettagli importanti, non sfruttare tutte le opportunità e non riuscire a crearne di nuove.</p>
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-blue-800 font-medium">Venditori Micidiali nasce per risolvere in particolare questo problema: un assistente intelligente, sempre nel telefono del venditore, accessibile anche solo via voce, che trasforma ogni interazione in dati utili, prepara briefing mirati per ogni cliente e aiuta a capitalizzare ogni risvolto del processo commerciale.</p>
          </div>
        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 2) La visione */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">2</span>
          </div>
          <h2 className="text-2xl font-semibold">La visione</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p className="text-lg font-medium text-blue-700 mb-4">Un navigatore perfetto, sempre al fianco del Venditore, che conosce profondamente i suoi clienti e lo supporta in ogni fase.</p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mt-1 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span><span className="font-medium">Mattina:</span> Piano appuntamenti e briefing su chi incontrerà (condizioni, preferenze, tabù, interessi).</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mt-1 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span><span className="font-medium">Tra un incontro e l'altro:</span> il Venditore aggiorna l'assistente (parlando, Venditori Micidiali incorpora tutto).</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mt-1 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span><span className="font-medium">Fine giornata:</span> report completo, pronto per salvataggio o condivisione.</span>
            </li>
          </ul>
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <p className="text-center font-medium flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Zero form da compilare. Solo conversazione naturale.
            </p>
          </div>
        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 3) Obiettivi */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">3</span>
          </div>
          <h2 className="text-2xl font-semibold">Obiettivi</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="font-medium">Facilitare il lavoro dei venditori (meno burocrazia).</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="font-medium">Migliorare la relazione col cliente (briefing personalizzati).</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <p className="font-medium">Standardizzare raccolta dati (ogni parola diventa dato strutturato).</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="font-medium">Supportare le PMI con uno strumento accessibile e potente.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 4) Come funziona */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">4</span>
          </div>
          <h2 className="text-2xl font-semibold">Come funziona</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 rounded-lg w-10 h-10 flex items-center justify-center mr-4 flex-shrink-0">
                <span className="font-bold">1</span>
              </div>
              <div>
                <h3 className="font-medium text-lg">Conversazione naturale</h3>
                <p className="text-gray-600">l'assistente capisce se è richiesta, aggiornamento o nota.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 rounded-lg w-10 h-10 flex items-center justify-center mr-4 flex-shrink-0">
                <span className="font-bold">2</span>
              </div>
              <div>
                <h3 className="font-medium text-lg">Memoria intelligente</h3>
                <p className="text-gray-600">salva dati strutturati e note libere.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 rounded-lg w-10 h-10 flex items-center justify-center mr-4 flex-shrink-0">
                <span className="font-bold">3</span>
              </div>
              <div>
                <h3 className="font-medium text-lg">Briefing su misura</h3>
                <p className="text-gray-600">mostra solo dati reali, sintetizzati in punti chiari.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 rounded-lg w-10 h-10 flex items-center justify-center mr-4 flex-shrink-0">
                <span className="font-bold">4</span>
              </div>
              <div>
                <h3 className="font-medium text-lg">Reportistica</h3>
                <p className="text-gray-600">riepilogo di giornata o periodo, pronto da condividere.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 5) Cosa cambia per i venditori */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">5</span>
          </div>
          <h2 className="text-2xl font-semibold">Cosa cambia per i venditori</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center p-4 bg-red-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <p>Nessun modulo da compilare.</p>
            </div>
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <p>Memoria affidabile e sempre aggiornata.</p>
            </div>
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p>Preparazione migliore agli appuntamenti.</p>
            </div>
            <div className="flex items-center p-4 bg-purple-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Più tempo per vendere, meno burocrazia.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 6) Valore per l'azienda */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">6</span>
          </div>
          <h2 className="text-2xl font-semibold">Valore per l'azienda</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <ul className="list-disc pl-5 space-y-2">
            <li>Dati aggiornati e centralizzati.</li>
            <li>Riduzione errori e dimenticanze.</li>
            <li>Team allineato grazie a report condivisi.</li>
            <li>Immagine professionale verso i clienti.</li>
          </ul>
        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 7) Visione commerciale */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">7</span>
          </div>
          <h2 className="text-2xl font-semibold">Visione commerciale</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <ul className="list-disc pl-5 space-y-2">
            <li>Strumento quotidiano del venditore (desktop, mobile, voce).</li>
            <li>Assistente personale evolutivo (più lo usi, più diventa preciso).</li>
            <li>Soluzione scalabile per PMI (facile, accessibile, senza complessità).</li>
          </ul>
        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 8) Prossimi sviluppi */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">8</span>
          </div>
          <h2 className="text-2xl font-semibold">Prossimi sviluppi</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <ul className="list-disc pl-5 space-y-2">
            <li>Interazione vocale completa (mani libere in auto).</li>
            <li>Report automatici di fine giornata in PDF/Word.</li>
            <li>UI dedicata per briefing (oltre alla chat).</li>
            <li>Quick Add esteso (note, ordini, follow-up).</li>
            <li>Dashboard manager per overview attività venditori.</li>
          </ul>
        </div>
      </section>

      <div className="border-top border-t-2 border-dashed border-gray-300 my-8"></div>

      {/* 9) Conclusione */}
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
            <span className="font-bold">9</span>
          </div>
          <h2 className="text-2xl font-semibold">Conclusione</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p className="mb-4 font-medium">Assistente IA alle vendite = non un CRM tradizionale, non un chatbot generico.</p>
          <p>È un compagno di lavoro intelligente che ascolta, ricorda e supporta i venditori.</p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <p className="text-blue-800 font-medium flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Obiettivo: meno tempo perso, più vendite, clienti seguiti meglio.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500">
        <p>CoPilota alle vendite. L'IA al servizio del Venditore</p>
        <p className="mt-2">© 2025 IA Utile. Tutti i diritti riservati.</p>
      </footer>
    </div>
  );
};

export default ProjectDocument;
