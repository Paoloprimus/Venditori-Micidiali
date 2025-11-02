'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';
import { useDrawers, DrawersWithBackdrop } from '@/components/Drawers';
import TopBar from '@/components/home/TopBar';

// Dataset 80 clienti provincia Verona
const CLIENTS_DATA = [
  // Verona città centro (8)
  { nome: 'Bar Sport', indirizzo: 'Via Mazzini 15', citta: 'Verona', tipo: 'Bar', lat: 45.4408, lon: 10.9916, zona: 'Centro' },
  { nome: 'Pizzeria Da Mario', indirizzo: 'Via Roma 42', citta: 'Verona', tipo: 'Pizzeria', lat: 45.4384, lon: 10.9935, zona: 'Centro' },
  { nome: 'Ristorante Alla Colonna', indirizzo: 'Piazza Erbe 18', citta: 'Verona', tipo: 'Ristorante', lat: 45.4428, lon: 10.9982, zona: 'Centro' },
  { nome: 'Caffè Dante', indirizzo: 'Via Dante 7', citta: 'Verona', tipo: 'Bar', lat: 45.4398, lon: 10.9928, zona: 'Centro' },
  { nome: 'Trattoria Al Bersagliere', indirizzo: 'Via Dietro Pallone 1', citta: 'Verona', tipo: 'Trattoria', lat: 45.4425, lon: 11.0012, zona: 'Centro' },
  { nome: 'Hotel Accademia', indirizzo: 'Via Scala 12', citta: 'Verona', tipo: 'Hotel', lat: 45.4392, lon: 10.9889, zona: 'Centro' },
  { nome: 'Gelateria Impero', indirizzo: 'Corso Porta Borsari 31', citta: 'Verona', tipo: 'Gelateria', lat: 45.4412, lon: 10.9958, zona: 'Centro' },
  { nome: 'Pub The Queen', indirizzo: 'Via Interrato Acqua Morta 8', citta: 'Verona', tipo: 'Pub', lat: 45.4395, lon: 10.9945, zona: 'Centro' },

  // Verona Borgo Trento (6)
  { nome: 'Bar Millennium', indirizzo: 'Viale Piave 23', citta: 'Verona', tipo: 'Bar', lat: 45.4512, lon: 10.9723, zona: 'Borgo Trento' },
  { nome: 'Pizzeria Napoli', indirizzo: 'Via Mameli 14', citta: 'Verona', tipo: 'Pizzeria', lat: 45.4498, lon: 10.9745, zona: 'Borgo Trento' },
  { nome: 'Ristorante La Terrazza', indirizzo: 'Via Mameli 33', citta: 'Verona', tipo: 'Ristorante', lat: 45.4505, lon: 10.9758, zona: 'Borgo Trento' },
  { nome: 'Hotel Europa', indirizzo: 'Via Roma 8', citta: 'Verona', tipo: 'Hotel', lat: 45.4489, lon: 10.9712, zona: 'Borgo Trento' },
  { nome: 'Caffè Central', indirizzo: 'Piazza Cittadella 5', citta: 'Verona', tipo: 'Bar', lat: 45.4478, lon: 10.9698, zona: 'Borgo Trento' },
  { nome: 'Pasticceria Flego', indirizzo: 'Via Mameli 19', citta: 'Verona', tipo: 'Pasticceria', lat: 45.4502, lon: 10.9735, zona: 'Borgo Trento' },

  // Verona San Zeno (5)
  { nome: 'Trattoria San Zeno', indirizzo: 'Via Santa Toscana 4', citta: 'Verona', tipo: 'Trattoria', lat: 45.4425, lon: 10.9812, zona: 'San Zeno' },
  { nome: 'Bar Garibaldi', indirizzo: 'Via Garibaldi 23', citta: 'Verona', tipo: 'Bar', lat: 45.4418, lon: 10.9823, zona: 'San Zeno' },
  { nome: 'Pizzeria Vesuvio', indirizzo: 'Via San Giacomo 12', citta: 'Verona', tipo: 'Pizzeria', lat: 45.4432, lon: 10.9798, zona: 'San Zeno' },
  { nome: 'Ristorante Al Porto', indirizzo: 'Via Rigaste San Zeno 15', citta: 'Verona', tipo: 'Ristorante', lat: 45.4445, lon: 10.9785, zona: 'San Zeno' },
  { nome: 'Caffè del Borgo', indirizzo: 'Piazza San Zeno 2', citta: 'Verona', tipo: 'Bar', lat: 45.4439, lon: 10.9805, zona: 'San Zeno' },

  // Verona Veronetta (6)
  { nome: 'Bar Redentore', indirizzo: 'Via XX Settembre 45', citta: 'Verona', tipo: 'Bar', lat: 45.4468, lon: 11.0078, zona: 'Veronetta' },
  { nome: 'Pizzeria Capricciosa', indirizzo: 'Via Carducci 18', citta: 'Verona', tipo: 'Pizzeria', lat: 45.4475, lon: 11.0092, zona: 'Veronetta' },
  { nome: 'Trattoria Alla Fontana', indirizzo: 'Piazzetta Pescheria 6', citta: 'Verona', tipo: 'Trattoria', lat: 45.4452, lon: 11.0065, zona: 'Veronetta' },
  { nome: 'Hotel San Pietro', indirizzo: 'Via Teatro Ristori 3', citta: 'Verona', tipo: 'Hotel', lat: 45.4458, lon: 11.0088, zona: 'Veronetta' },
  { nome: 'Gelateria Ponte Pietra', indirizzo: 'Via Ponte Pietra 23', citta: 'Verona', tipo: 'Gelateria', lat: 45.4462, lon: 11.0055, zona: 'Veronetta' },
  { nome: 'Pub Stone Wall', indirizzo: 'Via Rosa 12', citta: 'Verona', tipo: 'Pub', lat: 45.4478, lon: 11.0102, zona: 'Veronetta' },

  // San Bonifacio (5)
  { nome: 'Bar Centrale', indirizzo: 'Piazza Costituzione 8', citta: 'San Bonifacio', tipo: 'Bar', lat: 45.3978, lon: 11.2745, zona: 'Est' },
  { nome: 'Pizzeria Bella Napoli', indirizzo: 'Via Roma 56', citta: 'San Bonifacio', tipo: 'Pizzeria', lat: 45.3985, lon: 11.2758, zona: 'Est' },
  { nome: 'Ristorante Da Bepi', indirizzo: 'Via Villanova 23', citta: 'San Bonifacio', tipo: 'Ristorante', lat: 45.3992, lon: 11.2768, zona: 'Est' },
  { nome: 'Hotel San Bonifacio', indirizzo: 'Via Camuzzoni 2', citta: 'San Bonifacio', tipo: 'Hotel', lat: 45.3968, lon: 11.2735, zona: 'Est' },
  { nome: 'Caffè Verdi', indirizzo: 'Corso Garibaldi 14', citta: 'San Bonifacio', tipo: 'Bar', lat: 45.3975, lon: 11.2752, zona: 'Est' },

  // Soave (5)
  { nome: 'Trattoria Al Castello', indirizzo: 'Via Castello 5', citta: 'Soave', tipo: 'Trattoria', lat: 45.4198, lon: 11.2498, zona: 'Est' },
  { nome: 'Bar Del Sole', indirizzo: 'Piazza Antenna 12', citta: 'Soave', tipo: 'Bar', lat: 45.4205, lon: 11.2512, zona: 'Est' },
  { nome: 'Ristorante Enoteca', indirizzo: 'Via Roma 9', citta: 'Soave', tipo: 'Ristorante', lat: 45.4188, lon: 11.2485, zona: 'Est' },
  { nome: 'Hotel Villa Soave', indirizzo: 'Via Monti Lessini 18', citta: 'Soave', tipo: 'Hotel', lat: 45.4212, lon: 11.2525, zona: 'Est' },
  { nome: 'Pizzeria La Rocca', indirizzo: 'Via Covignano 3', citta: 'Soave', tipo: 'Pizzeria', lat: 45.4195, lon: 11.2505, zona: 'Est' },

  // Illasi (5)
  { nome: 'Bar Aurora', indirizzo: 'Via Roma 34', citta: 'Illasi', tipo: 'Bar', lat: 45.4858, lon: 11.2118, zona: 'Est' },
  { nome: 'Pizzeria Margherita', indirizzo: 'Via Verdi 8', citta: 'Illasi', tipo: 'Pizzeria', lat: 45.4865, lon: 11.2125, zona: 'Est' },
  { nome: 'Trattoria La Valle', indirizzo: 'Via Mazzini 12', citta: 'Illasi', tipo: 'Trattoria', lat: 45.4872, lon: 11.2135, zona: 'Est' },
  { nome: 'Ristorante Alla Corte', indirizzo: 'Piazza Libertà 5', citta: 'Illasi', tipo: 'Ristorante', lat: 45.4852, lon: 11.2108, zona: 'Est' },
  { nome: 'Hotel Lessini', indirizzo: 'Via Monti 7', citta: 'Illasi', tipo: 'Hotel', lat: 45.4878, lon: 11.2142, zona: 'Est' },

  // Villafranca (5)
  { nome: 'Bar Aeroporto', indirizzo: 'Via Mantova 45', citta: 'Villafranca', tipo: 'Bar', lat: 45.3525, lon: 10.8445, zona: 'Ovest' },
  { nome: 'Pizzeria Quattro Stagioni', indirizzo: 'Corso Vittorio Emanuele 23', citta: 'Villafranca', tipo: 'Pizzeria', lat: 45.3538, lon: 10.8458, zona: 'Ovest' },
  { nome: 'Ristorante La Rosa', indirizzo: 'Via Pace 8', citta: 'Villafranca', tipo: 'Ristorante', lat: 45.3545, lon: 10.8468, zona: 'Ovest' },
  { nome: 'Hotel Castello', indirizzo: 'Piazza Castello 1', citta: 'Villafranca', tipo: 'Hotel', lat: 45.3518, lon: 10.8435, zona: 'Ovest' },
  { nome: 'Caffè Scaligero', indirizzo: 'Via Roma 67', citta: 'Villafranca', tipo: 'Bar', lat: 45.3532, lon: 10.8452, zona: 'Ovest' },

  // Sommacampagna (5)
  { nome: 'Bar Centrale Somma', indirizzo: 'Piazza Carlo Alberto 4', citta: 'Sommacampagna', tipo: 'Bar', lat: 45.4085, lon: 10.8598, zona: 'Ovest' },
  { nome: 'Pizzeria Vesuviana', indirizzo: 'Via Roma 18', citta: 'Sommacampagna', tipo: 'Pizzeria', lat: 45.4092, lon: 10.8612, zona: 'Ovest' },
  { nome: 'Trattoria Al Mulino', indirizzo: 'Via Pozzetto 12', citta: 'Sommacampagna', tipo: 'Trattoria', lat: 45.4078, lon: 10.8585, zona: 'Ovest' },
  { nome: 'Hotel Garden', indirizzo: 'Via Gardesana 34', citta: 'Sommacampagna', tipo: 'Hotel', lat: 45.4098, lon: 10.8625, zona: 'Ovest' },
  { nome: 'Ristorante Al Lago', indirizzo: 'Via Custoza 5', citta: 'Sommacampagna', tipo: 'Ristorante', lat: 45.4105, lon: 10.8638, zona: 'Ovest' },

  // Bussolengo (5)
  { nome: 'Bar Safari', indirizzo: 'Via Pastrengo 45', citta: 'Bussolengo', tipo: 'Bar', lat: 45.4698, lon: 10.8512, zona: 'Nord' },
  { nome: 'Pizzeria Panorama', indirizzo: 'Via Roma 78', citta: 'Bussolengo', tipo: 'Pizzeria', lat: 45.4712, lon: 10.8525, zona: 'Nord' },
  { nome: 'Ristorante La Griglia', indirizzo: 'Via Mazzini 23', citta: 'Bussolengo', tipo: 'Ristorante', lat: 45.4705, lon: 10.8538, zona: 'Nord' },
  { nome: 'Hotel Parco Natura', indirizzo: 'Località Broglio 2', citta: 'Bussolengo', tipo: 'Hotel', lat: 45.4685, lon: 10.8498, zona: 'Nord' },
  { nome: 'Caffè Piazza', indirizzo: 'Piazza XXVI Aprile 9', citta: 'Bussolengo', tipo: 'Bar', lat: 45.4692, lon: 10.8518, zona: 'Nord' },

  // Bardolino (5)
  { nome: 'Bar Lungolago', indirizzo: 'Lungolago Mirabello 23', citta: 'Bardolino', tipo: 'Bar', lat: 45.5425, lon: 10.7298, zona: 'Nord' },
  { nome: 'Pizzeria Bella Vista', indirizzo: 'Via Mirabello 12', citta: 'Bardolino', tipo: 'Pizzeria', lat: 45.5438, lon: 10.7312, zona: 'Nord' },
  { nome: 'Ristorante Al Porto', indirizzo: 'Piazza Matteotti 8', citta: 'Bardolino', tipo: 'Ristorante', lat: 45.5445, lon: 10.7325, zona: 'Nord' },
  { nome: 'Hotel Garda', indirizzo: 'Via Gardesana 45', citta: 'Bardolino', tipo: 'Hotel', lat: 45.5412, lon: 10.7285, zona: 'Nord' },
  { nome: 'Gelateria Dolce Vita', indirizzo: 'Corso Garibaldi 34', citta: 'Bardolino', tipo: 'Gelateria', lat: 45.5432, lon: 10.7305, zona: 'Nord' },

  // Peschiera (5)
  { nome: 'Bar Station', indirizzo: 'Piazzale Stazione 12', citta: 'Peschiera del Garda', tipo: 'Bar', lat: 45.4398, lon: 10.6898, zona: 'Nord' },
  { nome: 'Pizzeria Fortezza', indirizzo: 'Via Venezia 23', citta: 'Peschiera del Garda', tipo: 'Pizzeria', lat: 45.4412, lon: 10.6912, zona: 'Nord' },
  { nome: 'Ristorante Al Forte', indirizzo: 'Via Peschiera 8', citta: 'Peschiera del Garda', tipo: 'Ristorante', lat: 45.4425, lon: 10.6925, zona: 'Nord' },
  { nome: 'Hotel Bella Peschiera', indirizzo: 'Via Milano 56', citta: 'Peschiera del Garda', tipo: 'Hotel', lat: 45.4385, lon: 10.6885, zona: 'Nord' },
  { nome: 'Caffè Centrale Peschiera', indirizzo: 'Piazza Betteloni 4', citta: 'Peschiera del Garda', tipo: 'Bar', lat: 45.4405, lon: 10.6905, zona: 'Nord' },

  // Legnago (5)
  { nome: 'Bar Torriani', indirizzo: 'Piazza Libertà 18', citta: 'Legnago', tipo: 'Bar', lat: 45.1918, lon: 11.3045, zona: 'Sud' },
  { nome: 'Pizzeria Europa', indirizzo: 'Corso Vittorio Emanuele 45', citta: 'Legnago', tipo: 'Pizzeria', lat: 45.1925, lon: 11.3058, zona: 'Sud' },
  { nome: 'Ristorante La Barchessa', indirizzo: 'Via Matteotti 12', citta: 'Legnago', tipo: 'Ristorante', lat: 45.1932, lon: 11.3068, zona: 'Sud' },
  { nome: 'Hotel Terzo Millennio', indirizzo: 'Via Roma 89', citta: 'Legnago', tipo: 'Hotel', lat: 45.1912, lon: 11.3035, zona: 'Sud' },
  { nome: 'Caffè del Teatro', indirizzo: 'Piazza Teatro 2', citta: 'Legnago', tipo: 'Bar', lat: 45.1938, lon: 11.3075, zona: 'Sud' },

  // San Giovanni Lupatoto (5)
  { nome: 'Bar Millennium SG', indirizzo: 'Via Roma 123', citta: 'San Giovanni Lupatoto', tipo: 'Bar', lat: 45.3825, lon: 11.0245, zona: 'Sud' },
  { nome: 'Pizzeria Romana', indirizzo: 'Via Verona 56', citta: 'San Giovanni Lupatoto', tipo: 'Pizzeria', lat: 45.3838, lon: 11.0258, zona: 'Sud' },
  { nome: 'Trattoria Al Campanile', indirizzo: 'Via Chiesa 8', citta: 'San Giovanni Lupatoto', tipo: 'Trattoria', lat: 45.3845, lon: 11.0268, zona: 'Sud' },
  { nome: 'Hotel San Giovanni', indirizzo: 'Via Nazionale 34', citta: 'San Giovanni Lupatoto', tipo: 'Hotel', lat: 45.3818, lon: 11.0235, zona: 'Sud' },
  { nome: 'Ristorante La Perla', indirizzo: 'Via Venezia 12', citta: 'San Giovanni Lupatoto', tipo: 'Ristorante', lat: 45.3852, lon: 11.0275, zona: 'Sud' },

  // Isola della Scala (5)
  { nome: 'Bar Risaia', indirizzo: 'Piazza Martiri 5', citta: 'Isola della Scala', tipo: 'Bar', lat: 45.2698, lon: 11.0098, zona: 'Sud' },
  { nome: 'Pizzeria Al Riso', indirizzo: 'Via Roma 67', citta: 'Isola della Scala', tipo: 'Pizzeria', lat: 45.2712, lon: 11.0112, zona: 'Sud' },
  { nome: 'Ristorante Risotto d\'Oro', indirizzo: 'Via Gramsci 23', citta: 'Isola della Scala', tipo: 'Ristorante', lat: 45.2725, lon: 11.0125, zona: 'Sud' },
  { nome: 'Hotel Scala', indirizzo: 'Corso Italia 12', citta: 'Isola della Scala', tipo: 'Hotel', lat: 45.2685, lon: 11.0085, zona: 'Sud' },
  { nome: 'Caffè Centrale Isola', indirizzo: 'Piazza Repubblica 8', citta: 'Isola della Scala', tipo: 'Bar', lat: 45.2705, lon: 11.0105, zona: 'Sud' },
];

// Note prescrittive variegate
const NOTES_TEMPLATES = [
  'Cliente soddisfatto, ordina regolarmente',
  'Richiamare tra 10 giorni per nuovo catalogo',
  'Anticipare prossima visita per aumentare fatturato',
  'Cliente fedele, sempre preciso nei pagamenti',
  'Interessato a nuovi prodotti premium',
  'Non disturbare fino a marzo, chiusura invernale',
  'Verificare disponibilità per ordine grande evento',
  'Cliente vuole sconti maggiori, valutare proposta',
  'Molto soddisfatto del servizio, complimenti ricevuti',
  'Da richiamare urgentemente per sollecito pagamento',
  'Nuovo gestore, spiegare di nuovo condizioni',
  'Cliente top, fatturato alto e puntuale',
  'Locale rinnovato, potenziale aumento ordini',
  'Consigliare nuova linea biologica',
  'Richiesta campioni omaggio per test',
  'Cliente sensibile al prezzo, attenzione concorrenza',
  'Stagionale, riattivare a primavera',
  'Ottimo rapporto, invitare a evento aziendale',
  null, // 20% senza note
  null,
];

export default function SeedTestDataPage() {
  const router = useRouter();
  const { crypto, ready } = useCrypto();
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [log, setLog] = useState<string[]>([]);

  // Auto-unlock crypto se disponibile in storage
  useEffect(() => {
    if (!crypto) return;
    
    const checkAndUnlock = async () => {
      if (typeof crypto.isUnlocked !== 'function') return;
      
      const unlocked = crypto.isUnlocked();
      console.log('🔍 [Seed] Crypto unlocked?', unlocked);
      
      if (!unlocked) {
        const pass = sessionStorage.getItem('repping:pph') || localStorage.getItem('repping:pph');
        console.log('🔍 [Seed] Password in storage?', !!pass);
        
        if (pass && typeof crypto.unlockWithPassphrase === 'function') {
          try {
            await crypto.unlockWithPassphrase(pass);
            console.log('✅ [Seed] Auto-unlock completato!');
          } catch (e) {
            console.error('❌ [Seed] Auto-unlock fallito:', e);
          }
        }
      }
    };
    
    checkAndUnlock();
  }, [crypto]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  function addLog(msg: string) {
    console.log('[Seed]', msg);
    setLog(prev => [...prev, msg]);
  }

  // Genera numero casuale in range
  function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Genera importo vendita realistico
  function randomImporto(): number {
    // 70% ordini normali (200-800)
    // 20% ordini medi (800-1500)
    // 10% ordini grandi (1500-2000)
    const r = Math.random();
    if (r < 0.7) return randomInt(200, 800);
    if (r < 0.9) return randomInt(800, 1500);
    return randomInt(1500, 2000);
  }

  // Genera data casuale negli ultimi N giorni
  function randomDateDaysAgo(minDays: number, maxDays: number): Date {
    const days = randomInt(minDays, maxDays);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  async function handleGenerate() {
    if (!crypto || !ready) {
      alert('Sistema crypto non pronto. Riprova.');
      return;
    }

    if (!confirm('Generare 80 clienti + ~400 visite di test?\n\nATTENZIONE: Operazione irreversibile!')) {
      return;
    }

    setBusy(true);
    setLog([]);
    setProgress('Avvio generazione...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      addLog('✅ Utente autenticato');
      addLog(`📊 Generazione 80 clienti in provincia Verona...`);

      const scope = 'table:accounts';
      const createdAccountIds: string[] = [];

      // ========== GENERA 80 CLIENTI ==========
      for (let i = 0; i < CLIENTS_DATA.length; i++) {
        const client = CLIENTS_DATA[i];
        setProgress(`Cliente ${i + 1}/80: ${client.nome}`);

        // Dati contatto casuali
        const nomeContatto = `${['Mario', 'Luca', 'Paolo', 'Giovanni', 'Marco', 'Giuseppe'][randomInt(0, 5)]} ${['Rossi', 'Bianchi', 'Verdi', 'Neri', 'Ferrari'][randomInt(0, 4)]}`;
        const telefono = `04${randomInt(10000000, 59999999)}`;
        const email = Math.random() > 0.3 ? `${client.nome.toLowerCase().replace(/\s/g, '')}@email.it` : '';
        const piva = Math.random() > 0.5 ? `IT${randomInt(10000000000, 99999999999)}` : '';
        const note = NOTES_TEMPLATES[randomInt(0, NOTES_TEMPLATES.length - 1)];

        try {
          // 🔐 CIFRA NOME (ESATTAMENTE come quick-add-client)
          const nameEncrypted = await crypto.encryptFields(
            scope, 'accounts', '', 
            { name: client.nome }
          );
          if (!nameEncrypted?.name_enc || !nameEncrypted?.name_iv) {
            throw new Error('Cifratura nome fallita');
          }

          // 🔐 BLIND INDEX
          if (typeof crypto.computeBlindIndex !== 'function') {
            throw new Error('La funzione computeBlindIndex non è disponibile sul servizio crypto');
          }
          const nameBlind = await crypto.computeBlindIndex(scope, client.nome);
          if (!nameBlind || typeof nameBlind !== 'string') {
            throw new Error('Calcolo blind index fallito');
          }

          // 🔐 CIFRA CONTATTO
          const contactNameEncrypted = await crypto.encryptFields(
            scope, 'accounts', '',
            { contact_name: nomeContatto }
          );
          if (!contactNameEncrypted?.contact_name_enc || !contactNameEncrypted?.contact_name_iv) {
            throw new Error('Cifratura contatto fallita');
          }

          // 🔐 CIFRA TELEFONO
          const phoneEncrypted = await crypto.encryptFields(
            scope, 'accounts', '',
            { phone: telefono }
          );
          if (!phoneEncrypted?.phone_enc || !phoneEncrypted?.phone_iv) {
            throw new Error('Cifratura telefono fallita');
          }

          // 🔐 CIFRA INDIRIZZO
          const addressEncrypted = await crypto.encryptFields(
            scope, 'accounts', '',
            { address: `${client.indirizzo}, ${client.citta}` }
          );
          if (!addressEncrypted?.address_enc || !addressEncrypted?.address_iv) {
            throw new Error('Cifratura indirizzo fallita');
          }

          // 🔐 CIFRA EMAIL (opzionale)
          let emailEncrypted = null;
          if (email) {
            emailEncrypted = await crypto.encryptFields(
              scope, 'accounts', '',
              { email }
            );
            if (!emailEncrypted?.email_enc || !emailEncrypted?.email_iv) {
              throw new Error('Cifratura email fallita');
            }
          }

          // 🔐 CIFRA P.IVA (opzionale)
          let pivaEncrypted = null;
          if (piva) {
            pivaEncrypted = await crypto.encryptFields(
              scope, 'accounts', '',
              { vat_number: piva }
            );
            if (!pivaEncrypted?.vat_number_enc || !pivaEncrypted?.vat_number_iv) {
              throw new Error('Cifratura P.IVA fallita');
            }
          }

          // Prepara payload (ESATTAMENTE come quick-add-client)
          const payload: any = {
            name_enc: nameEncrypted.name_enc,
            name_iv: nameEncrypted.name_iv,
            name_bi: nameBlind,
            contact_name_enc: contactNameEncrypted.contact_name_enc,
            contact_name_iv: contactNameEncrypted.contact_name_iv,
            phone_enc: phoneEncrypted.phone_enc,
            phone_iv: phoneEncrypted.phone_iv,
            address_enc: addressEncrypted.address_enc,
            address_iv: addressEncrypted.address_iv,
            city: client.citta,
            tipo_locale: client.tipo,
            latitude: client.lat,
            longitude: client.lon,
            custom: note ? { notes: note } : {},
          };

          if (emailEncrypted) {
            payload.email_enc = emailEncrypted.email_enc;
            payload.email_iv = emailEncrypted.email_iv;
          }

          if (pivaEncrypted) {
            payload.vat_number_enc = pivaEncrypted.vat_number_enc;
            payload.vat_number_iv = pivaEncrypted.vat_number_iv;
          }

          // Chiama API (ESATTAMENTE come quick-add-client)
          const res = await fetch('/api/clients/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(`API error: ${data?.error || res.status}`);
          }

          createdAccountIds.push(data.accountId);
          addLog(`✅ ${i + 1}/80: ${client.nome} (${client.citta})`);

        } catch (e: any) {
          addLog(`❌ Errore ${client.nome}: ${e.message}`);
          throw e;
        }

        // Piccola pausa per non sovraccaricare
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 500));
      }

      addLog('');
      addLog('🎉 80 clienti creati con successo!');
      addLog('');
      addLog('📅 Generazione storico visite ultimi 90 giorni...');

      // ========== GENERA STORICO VISITE ==========
      let totalVisits = 0;

      // Strategia:
      // - 40 clienti "fedeli": 1 visita ogni 10-15gg = 6-8 visite in 90gg
      // - 20 clienti "medi": 1 visita ogni 20-30gg = 3-4 visite in 90gg
      // - 20 clienti "nuovi/dormienti": 0-2 visite in 90gg

      for (let i = 0; i < createdAccountIds.length; i++) {
        const accountId = createdAccountIds[i];
        const clientData = CLIENTS_DATA[i];
        
        let numVisits = 0;
        if (i < 40) {
          // Clienti fedeli: 6-8 visite
          numVisits = randomInt(6, 8);
        } else if (i < 60) {
          // Clienti medi: 3-4 visite
          numVisits = randomInt(3, 4);
        } else {
          // Clienti nuovi/dormienti: 0-2 visite
          numVisits = randomInt(0, 2);
        }

        // Genera visite distribuite negli ultimi 90 giorni
        const visitDates: Date[] = [];
        for (let v = 0; v < numVisits; v++) {
          const minDays = Math.floor(v * (90 / numVisits));
          const maxDays = Math.floor((v + 1) * (90 / numVisits));
          visitDates.push(randomDateDaysAgo(minDays, maxDays));
        }

        // Ordina cronologicamente (più vecchia prima)
        visitDates.sort((a, b) => a.getTime() - b.getTime());

        // Inserisci visite
        for (let v = 0; v < visitDates.length; v++) {
          const isLastVisit = v === visitDates.length - 1;
          const tipo = (v % 4 === 3) ? 'chiamata' : 'visita'; // 1 chiamata ogni 4
          const esito = ['ordine_acquisito', 'ordine_acquisito', 'ordine_acquisito', 'da_richiamare', 'info_richiesta'][randomInt(0, 4)];
          const importo = tipo === 'visita' && esito === 'ordine_acquisito' ? randomImporto() : null;
          const durata = tipo === 'visita' ? randomInt(15, 45) : randomInt(5, 15);
          const noteVisita = NOTES_TEMPLATES[randomInt(0, NOTES_TEMPLATES.length - 1)];

          const visitPayload: any = {
            user_id: user.id,
            account_id: accountId,
            tipo,
            data_visita: visitDates[v].toISOString(),
            esito,
            durata,
          };

          if (importo) visitPayload.importo_vendita = importo;
          if (noteVisita) visitPayload.notes = noteVisita;

          const { error } = await supabase.from('visits').insert(visitPayload);
          if (error) {
            addLog(`⚠️ Errore inserimento visita: ${error.message}`);
          } else {
            totalVisits++;
          }
        }

        if (i % 10 === 0) {
          setProgress(`Visite: ${totalVisits} generate...`);
          addLog(`📍 Visite generate: ${totalVisits}...`);
        }
      }

      addLog('');
      addLog(`🎉 COMPLETATO!`);
      addLog(`✅ 80 clienti creati`);
      addLog(`✅ ${totalVisits} visite/chiamate generate`);
      addLog(`✅ Coordinate GPS incluse`);
      addLog(`✅ Note prescrittive incluse`);
      addLog('');
      addLog('🔄 Ricaricare pagina clienti/visite per vedere i dati!');

      setProgress('✅ COMPLETATO!');

    } catch (e: any) {
      addLog(`❌ ERRORE: ${e.message}`);
      setProgress(`❌ Errore: ${e.message}`);
      alert(`Errore durante generazione:\n${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCleanup() {
    if (!confirm('ATTENZIONE!\n\nQuesta operazione cancellerà TUTTI i dati di test generati.\n\nSei sicuro?')) {
      return;
    }

    setBusy(true);
    setProgress('Pulizia in corso...');
    setLog([]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      addLog('🧹 Eliminazione visite...');
      const { error: visitsError } = await supabase
        .from('visits')
        .delete()
        .eq('user_id', user.id);

      if (visitsError) throw visitsError;

      addLog('🧹 Eliminazione clienti...');
      const { error: accountsError } = await supabase
        .from('accounts')
        .delete()
        .eq('user_id', user.id);

      if (accountsError) throw accountsError;

      addLog('✅ Pulizia completata!');
      setProgress('✅ Pulizia completata');

    } catch (e: any) {
      addLog(`❌ ERRORE: ${e.message}`);
      alert(`Errore durante pulizia:\n${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <TopBar
          title="🧪 Seed Test Data"
          onOpenLeft={openLeft}
          onOpenDati={openDati}
          onOpenDocs={openDocs}
          onOpenImpostazioni={openImpostazioni}
          onLogout={logout}
        />
      </div>

      <DrawersWithBackdrop
        leftOpen={leftOpen}
        onCloseLeft={closeLeft}
        rightOpen={rightOpen}
        rightContent={rightContent}
        onCloseRight={closeRight}
      />

      <div style={{ paddingTop: 70, padding: '70px 16px 16px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <h3 style={{ margin: 0, color: '#92400e', fontSize: 16, fontWeight: 600 }}>⚠️ ATTENZIONE - Ambiente di Test</h3>
          <p style={{ margin: '8px 0 0', color: '#92400e', fontSize: 14 }}>
            Questa pagina genera dati di test per sviluppo.<br/>
            Usa SOLO su database di test, mai in produzione!
          </p>
        </div>

        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>📊 Dataset di Test</h2>
          
          <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px' }}><strong>80 clienti</strong> provincia Verona:</p>
            <ul style={{ margin: '8px 0', paddingLeft: 24 }}>
              <li>25 Verona città (Centro, Borgo Trento, San Zeno, Veronetta)</li>
              <li>15 Est Verona (San Bonifacio, Soave, Illasi)</li>
              <li>10 Ovest Verona (Villafranca, Sommacampagna)</li>
              <li>15 Nord Verona (Bussolengo, Bardolino, Peschiera)</li>
              <li>15 Sud Verona (Legnago, San Giovanni Lupatoto, Isola della Scala)</li>
            </ul>

            <p style={{ margin: '16px 0 8px' }}><strong>~400 visite</strong> ultimi 90 giorni:</p>
            <ul style={{ margin: '8px 0', paddingLeft: 24 }}>
              <li>40 clienti fedeli: 6-8 visite ciascuno (ogni 10-15gg)</li>
              <li>20 clienti medi: 3-4 visite ciascuno (ogni 20-30gg)</li>
              <li>20 clienti nuovi/dormienti: 0-2 visite</li>
              <li>Importi vendita: €200-€2.000</li>
              <li>Note prescrittive variegate incluse</li>
            </ul>

            <p style={{ margin: '16px 0 8px' }}><strong>Dati inclusi:</strong></p>
            <ul style={{ margin: '8px 0', paddingLeft: 24 }}>
              <li>✅ Coordinate GPS reali</li>
              <li>✅ Indirizzi completi cifrati</li>
              <li>✅ Nomi/contatti/telefoni cifrati</li>
              <li>✅ Storico visite per medie trimestre/mese</li>
              <li>✅ Note prescrittive per AI</li>
              <li>✅ Giro settimana scorsa (50 visite lun-ven)</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              onClick={handleGenerate}
              disabled={busy || !crypto || !ready}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: busy ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? '⏳ Generazione...' : '🚀 Genera Dataset'}
            </button>

            <button
              onClick={handleCleanup}
              disabled={busy}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: busy ? '#9ca3af' : '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              🧹 Pulisci Tutto
            </button>
          </div>
        </div>

        {progress && (
          <div style={{ background: '#eff6ff', border: '1px solid #3b82f6', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1e40af' }}>{progress}</div>
          </div>
        )}

        {log.length > 0 && (
          <div style={{ background: '#1f2937', borderRadius: 8, padding: 16, maxHeight: 400, overflow: 'auto' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#d1d5db', whiteSpace: 'pre-wrap' }}>
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
