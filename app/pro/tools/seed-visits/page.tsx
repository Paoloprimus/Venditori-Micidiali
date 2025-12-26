'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCrypto } from '@/lib/crypto/CryptoProvider';

// ============================================================================
// DATI CLIENTI FITTIZI (94 clienti provincia Verona)
// ============================================================================

const CLIENTS_DATA = [
  { name: "Verona1", contact: "Mario Rossi", city: "Verona", address: "Via Mazzini 12", tipo: "Bar", lat: 45.438382, lng: 10.992358, notes: "Cliente storico" },
  { name: "Verona2", contact: "Luca Bianchi", city: "Verona", address: "Piazza Bra 5", tipo: "Ristorante", lat: 45.438796, lng: 10.994573, notes: "Ordini settimanali" },
  { name: "Verona3", contact: "Anna Verdi", city: "Verona", address: "Via Cappello 23", tipo: "Pizzeria", lat: 45.441954, lng: 10.998192, notes: "VIP - Sconti speciali" },
  { name: "Verona4", contact: "Paolo Neri", city: "Verona", address: "Corso Porta Nuova 88", tipo: "Caffetteria", lat: 45.435761, lng: 10.990547, notes: "Nuovo cliente" },
  { name: "Verona5", contact: "Giulia Russo", city: "Verona", address: "Via Roma 45", tipo: "Bar", lat: 45.440083, lng: 10.993256, notes: "Cliente affezionato" },
  { name: "Verona6", contact: "Marco Ferrari", city: "Verona", address: "Via Stella 19", tipo: "Trattoria", lat: 45.444567, lng: 10.996458, notes: "Pagamento 30gg" },
  { name: "Verona7", contact: "Sara Esposito", city: "Verona", address: "Piazza Erbe 34", tipo: "Bar", lat: 45.443456, lng: 10.998124, notes: "Consegna mattina" },
  { name: "Verona8", contact: "Andrea Colombo", city: "Verona", address: "Via Leoni 67", tipo: "Ristorante", lat: 45.442891, lng: 10.995342, notes: "Cliente premium" },
  { name: "Verona9", contact: "Elena Ricci", city: "Verona", address: "Lungadige Matteotti 15", tipo: "Pizzeria", lat: 45.447789, lng: 11.001235, notes: "Ordini elevati" },
  { name: "Verona10", contact: "Francesco Marino", city: "Verona", address: "Via Pellicciai 8", tipo: "Bar", lat: 45.444123, lng: 10.997567, notes: "Contatti frequenti" },
  { name: "Verona11", contact: "Chiara Romano", city: "Verona", address: "Corso Cavour 41", tipo: "Caffetteria", lat: 45.445234, lng: 10.992345, notes: "Cliente occasionale" },
  { name: "Verona12", contact: "Davide Greco", city: "Verona", address: "Via Dietro Pallone 5", tipo: "Osteria", lat: 45.446567, lng: 10.998901, notes: "Buon pagatore" },
  { name: "Verona13", contact: "Martina Bruno", city: "Verona", address: "Piazza Corrubbio 12", tipo: "Bar", lat: 45.440012, lng: 10.996678, notes: "Richiede fattura" },
  { name: "Verona14", contact: "Simone Gallo", city: "Verona", address: "Via San Paolo 23", tipo: "Ristorante", lat: 45.439123, lng: 10.994456, notes: "Ordini regolari" },
  { name: "Verona15", contact: "Valentina Conti", city: "Verona", address: "Via Oberdan 56", tipo: "Pizzeria", lat: 45.436789, lng: 10.991234, notes: "Nuovo contatto" },
  { name: "Verona16", contact: "Roberto De Luca", city: "Verona", address: "Stradone Porta Palio 78", tipo: "Bar", lat: 45.448901, lng: 10.987654, notes: "Cliente fedele" },
  { name: "Verona17", contact: "Federica Mancini", city: "Verona", address: "Via Anfiteatro 9", tipo: "Trattoria", lat: 45.43989, lng: 10.995567, notes: "Pagamento anticipato" },
  { name: "Verona18", contact: "Alessandro Costa", city: "Verona", address: "Corso Milano 134", tipo: "Bar", lat: 45.451234, lng: 10.998902, notes: "Ottimo cliente" },
  { name: "Verona19", contact: "Laura Giordano", city: "Verona", address: "Via Interrato Acqua Morta 44", tipo: "Caffetteria", lat: 45.442345, lng: 10.992346, notes: "Consegne serali" },
  { name: "Verona20", contact: "Matteo Marchetti", city: "Verona", address: "Piazza San Zeno 2", tipo: "Osteria", lat: 45.44789, lng: 10.982345, notes: "Cliente storico zona" },
  { name: "Verona21", contact: "Alessia Barbieri", city: "Verona", address: "Via Seminario 18", tipo: "Bar", lat: 45.445678, lng: 10.998903, notes: "Ordini medi" },
  { name: "Verona22", contact: "Stefano Fontana", city: "Verona", address: "Lungadige San Giorgio 15", tipo: "Ristorante", lat: 45.440123, lng: 11.004567, notes: "Cliente esigente" },
  { name: "Verona23", contact: "Silvia Santoro", city: "Verona", address: "Via Garibaldi 72", tipo: "Pizzeria", lat: 45.435678, lng: 10.992347, notes: "Pagamento contante" },
  { name: "Verona24", contact: "Daniele Ferrara", city: "Verona", address: "Piazza Cittadella 7", tipo: "Bar", lat: 45.448902, lng: 10.991235, notes: "Richiede preventivi" },
  { name: "Verona25", contact: "Monica Vitale", city: "Verona", address: "Via San Cosimo 31", tipo: "Caffetteria", lat: 45.441234, lng: 10.996789, notes: "Nuovo contatto recente" },
  { name: "Verona26", contact: "Fabio Leone", city: "Verona", address: "Corso Porta Borsari 19", tipo: "Trattoria", lat: 45.443456, lng: 10.994567, notes: "Cliente affidabile" },
  { name: "Verona27", contact: "Paola Longo", city: "Verona", address: "Via Scala 44", tipo: "Bar", lat: 45.446789, lng: 10.992348, notes: "Ordini piccoli frequenti" },
  { name: "Verona28", contact: "Giorgio Serra", city: "Verona", address: "Piazza Viviani 8", tipo: "Ristorante", lat: 45.438901, lng: 10.995678, notes: "Cliente premium zona" },
  { name: "Verona29", contact: "Claudia Orlando", city: "Verona", address: "Via Redentore 25", tipo: "Pizzeria", lat: 45.442346, lng: 10.998904, notes: "Pagamento 60gg" },
  { name: "Verona30", contact: "Massimo Riva", city: "Verona", address: "Lungadige Porta Vittoria 9", tipo: "Bar", lat: 45.445678, lng: 11.002345, notes: "Richiede ordini urgenti" },
  { name: "Verona31", contact: "Elisa Caruso", city: "Verona", address: "Via Pigna 52", tipo: "Caffetteria", lat: 45.440123, lng: 10.991236, notes: "Cliente occasionale" },
  { name: "Verona32", contact: "Antonio Palmieri", city: "Verona", address: "Piazza Nogara 14", tipo: "Osteria", lat: 45.436789, lng: 10.994568, notes: "Ordini elevati" },
  { name: "Verona33", contact: "Barbara Lombardi", city: "Verona", address: "Via Duomo 3", tipo: "Bar", lat: 45.444567, lng: 10.996789, notes: "Contatti regolari" },
  { name: "Verona34", contact: "Vincenzo Moretti", city: "Verona", address: "Corso Castelvecchio 28", tipo: "Ristorante", lat: 45.44789, lng: 10.992349, notes: "Cliente VIP" },
  { name: "Verona35", contact: "Cristina Rizzo", city: "Verona", address: "Via Leoncino 11", tipo: "Pizzeria", lat: 45.441234, lng: 10.995679, notes: "Nuovo cliente promettente" },
  { name: "Verona36", contact: "Emanuele Ferraro", city: "Verona", address: "Piazza Pozza 6", tipo: "Bar", lat: 45.438901, lng: 10.998905, notes: "Pagamento puntuale" },
  { name: "Verona37", contact: "Diana Basile", city: "Verona", address: "Via Sottoriva 21", tipo: "Trattoria", lat: 45.445678, lng: 10.991237, notes: "Cliente storico" },
  { name: "Verona38", contact: "Riccardo Gentile", city: "Verona", address: "Lungadige Re Teodorico 34", tipo: "Bar", lat: 45.442346, lng: 11.005678, notes: "Ordini medi regolari" },
  { name: "Verona39", contact: "Sabrina Mariani", city: "Verona", address: "Via Macello 47", tipo: "Caffetteria", lat: 45.43789, lng: 10.994569, notes: "Richiede fattura elettronica" },
  { name: "Verona40", contact: "Lorenzo Battaglia", city: "Verona", address: "Piazza Isolo 16", tipo: "Osteria", lat: 45.446789, lng: 10.99789, notes: "Cliente affezionato centro" },
  // Villafranca
  { name: "Villafranca1", contact: "Giuseppe Fabbri", city: "Villafranca di Verona", address: "Via Pace 15", tipo: "Bar", lat: 45.352905, lng: 10.844298, notes: "Cliente aeroporto zona" },
  { name: "Villafranca2", contact: "Maria Bellini", city: "Villafranca di Verona", address: "Corso Garibaldi 89", tipo: "Ristorante", lat: 45.354567, lng: 10.846789, notes: "Ordini settimanali fissi" },
  { name: "Villafranca3", contact: "Angelo Parisi", city: "Villafranca di Verona", address: "Piazza Castello 4", tipo: "Pizzeria", lat: 45.351234, lng: 10.842345, notes: "Nuovo contatto" },
  // San Bonifacio
  { name: "SanBonifacio1", contact: "Teresa Ferri", city: "San Bonifacio", address: "Via Roma 78", tipo: "Bar", lat: 45.395234, lng: 11.272345, notes: "Cliente zona industriale" },
  { name: "SanBonifacio2", contact: "Carlo Monti", city: "San Bonifacio", address: "Corso Venezia 45", tipo: "Trattoria", lat: 45.39789, lng: 11.275678, notes: "Pagamento 30gg" },
  { name: "SanBonifacio3", contact: "Rosa Sala", city: "San Bonifacio", address: "Via Marconi 12", tipo: "Caffetteria", lat: 45.392346, lng: 11.278901, notes: "Ordini elevati" },
  // Bussolengo
  { name: "Bussolengo1", contact: "Sergio Villa", city: "Bussolengo", address: "Via Verona 123", tipo: "Bar", lat: 45.471234, lng: 10.845678, notes: "Cliente Gardaland zona" },
  { name: "Bussolengo2", contact: "Patrizia Morelli", city: "Bussolengo", address: "Piazza XXVI Aprile 9", tipo: "Ristorante", lat: 45.474567, lng: 10.848902, notes: "Ottimo pagatore" },
  { name: "Bussolengo3", contact: "Mauro Rossetti", city: "Bussolengo", address: "Via Matteotti 56", tipo: "Pizzeria", lat: 45.47789, lng: 10.851234, notes: "Cliente storico" },
  // Legnago
  { name: "Legnago1", contact: "Franca Amato", city: "Legnago", address: "Corso Garibaldi 234", tipo: "Bar", lat: 45.192346, lng: 11.305678, notes: "Cliente zona sud" },
  { name: "Legnago2", contact: "Claudio De Rosa", city: "Legnago", address: "Piazza Libertà 18", tipo: "Trattoria", lat: 45.195678, lng: 11.308901, notes: "Pagamento anticipato" },
  { name: "Legnago3", contact: "Giovanna Bianco", city: "Legnago", address: "Via Roma 67", tipo: "Caffetteria", lat: 45.198901, lng: 11.311234, notes: "Ordini regolari" },
  // San Giovanni Lupatoto
  { name: "SanGiovanniLupatoto1", contact: "Bruno Rossini", city: "San Giovanni Lupatoto", address: "Via Belvedere 45", tipo: "Bar", lat: 45.382346, lng: 11.035678, notes: "Cliente sud Verona" },
  { name: "SanGiovanniLupatoto2", contact: "Daniela Giuliani", city: "San Giovanni Lupatoto", address: "Corso Italia 12", tipo: "Ristorante", lat: 45.385678, lng: 11.038901, notes: "Pagamento puntuale" },
  { name: "SanGiovanniLupatoto3", contact: "Maurizio Farina", city: "San Giovanni Lupatoto", address: "Via Venezia 89", tipo: "Pizzeria", lat: 45.388901, lng: 11.041234, notes: "Cliente affidabile" },
  // Soave
  { name: "Soave1", contact: "Nicoletta Poli", city: "Soave", address: "Via Castello 23", tipo: "Bar", lat: 45.421234, lng: 11.245678, notes: "Cliente zona vini" },
  { name: "Soave2", contact: "Piero Galli", city: "Soave", address: "Piazza Antenna 5", tipo: "Osteria", lat: 45.424567, lng: 11.248901, notes: "Ordini elevati enoteche" },
  { name: "Soave3", contact: "Ornella Benedetti", city: "Soave", address: "Via Roma 78", tipo: "Trattoria", lat: 45.42789, lng: 11.251234, notes: "Cliente storico" },
  // Bardolino
  { name: "Bardolino1", contact: "Gianluca Sartori", city: "Bardolino", address: "Lungolago Cipriani 34", tipo: "Bar", lat: 45.541234, lng: 10.725678, notes: "Cliente lago turistico" },
  { name: "Bardolino2", contact: "Antonella Pellegrini", city: "Bardolino", address: "Via Marconi 67", tipo: "Ristorante", lat: 45.544567, lng: 10.728901, notes: "Pagamento 60gg stagionale" },
  { name: "Bardolino3", contact: "Flavio Martini", city: "Bardolino", address: "Piazza Matteotti 12", tipo: "Pizzeria", lat: 45.54789, lng: 10.731234, notes: "Cliente estate" },
  // Peschiera del Garda
  { name: "PeschieradelGarda1", contact: "Enzo Mazza", city: "Peschiera del Garda", address: "Viale Venezia 89", tipo: "Bar", lat: 45.43789, lng: 10.682345, notes: "Cliente stazione" },
  { name: "PeschieradelGarda2", contact: "Mirella Marini", city: "Peschiera del Garda", address: "Piazza Betteloni 23", tipo: "Caffetteria", lat: 45.441234, lng: 10.685678, notes: "Ordini turistici" },
  { name: "PeschieradelGarda3", contact: "Alberto Neri", city: "Peschiera del Garda", address: "Via Milano 45", tipo: "Ristorante", lat: 45.444567, lng: 10.688901, notes: "Cliente lago sud" },
  // Isola della Scala
  { name: "IsoladellaScala1", contact: "Carla Testa", city: "Isola della Scala", address: "Corso Garibaldi 123", tipo: "Bar", lat: 45.271234, lng: 11.005678, notes: "Cliente pianura" },
  { name: "IsoladellaScala2", contact: "Tommaso Gentile", city: "Isola della Scala", address: "Via Roma 56", tipo: "Trattoria", lat: 45.274567, lng: 11.008901, notes: "Pagamento contante" },
  { name: "IsoladellaScala3", contact: "Luciana Ferretti", city: "Isola della Scala", address: "Piazza Libertà 8", tipo: "Pizzeria", lat: 45.27789, lng: 11.011234, notes: "Cliente zona riso" },
  // Negrar
  { name: "Negrar1", contact: "Guido Pagani", city: "Negrar", address: "Via Garibaldi 34", tipo: "Bar", lat: 45.531234, lng: 10.935678, notes: "Cliente Valpolicella" },
  { name: "Negrar2", contact: "Rossana Barone", city: "Negrar", address: "Piazza Mercato 12", tipo: "Osteria", lat: 45.534567, lng: 10.938901, notes: "Ordini vini pregiati" },
  { name: "Negrar3", contact: "Ivano Rizzi", city: "Negrar", address: "Via Roma 67", tipo: "Trattoria", lat: 45.53789, lng: 10.941234, notes: "Cliente cantina" },
  // Cerea
  { name: "Cerea1", contact: "Lucia Monti", city: "Cerea", address: "Corso Garibaldi 89", tipo: "Bar", lat: 45.194567, lng: 11.218901, notes: "Cliente bassa veronese" },
  { name: "Cerea2", contact: "Renzo Colombo", city: "Cerea", address: "Via Roma 45", tipo: "Ristorante", lat: 45.19789, lng: 11.221234, notes: "Pagamento 30gg" },
  { name: "Cerea3", contact: "Graziella Rossi", city: "Cerea", address: "Piazza Libertà 23", tipo: "Pizzeria", lat: 45.201234, lng: 11.224567, notes: "Ordini medi" },
  // Bovolone
  { name: "Bovolone1", contact: "Elio Martini", city: "Bovolone", address: "Via Verona 123", tipo: "Bar", lat: 45.251234, lng: 11.125678, notes: "Cliente zona est" },
  { name: "Bovolone2", contact: "Nadia Serra", city: "Bovolone", address: "Corso Italia 56", tipo: "Caffetteria", lat: 45.254567, lng: 11.128901, notes: "Pagamento puntuale" },
  { name: "Bovolone3", contact: "Ottavio Ferri", city: "Bovolone", address: "Piazza Costituzione 8", tipo: "Trattoria", lat: 45.25789, lng: 11.131234, notes: "Cliente storico" },
  // Valeggio sul Mincio
  { name: "ValeggiosulMincio1", contact: "Ada Bellini", city: "Valeggio sul Mincio", address: "Via Roma 78", tipo: "Bar", lat: 45.355678, lng: 10.738901, notes: "Cliente Borghetto" },
  { name: "ValeggiosulMincio2", contact: "Ugo Mariani", city: "Valeggio sul Mincio", address: "Piazza Carlo Alberto 12", tipo: "Ristorante", lat: 45.358901, lng: 10.741234, notes: "Ordini tortellini" },
  { name: "ValeggiosulMincio3", contact: "Emma Santi", city: "Valeggio sul Mincio", address: "Via Mincio 45", tipo: "Pizzeria", lat: 45.361234, lng: 10.744567, notes: "Cliente Parco Sigurtà" },
  // Sommacampagna
  { name: "Sommacampagna1", contact: "Dino Greco", city: "Sommacampagna", address: "Via Verona 234", tipo: "Bar", lat: 45.411234, lng: 10.855678, notes: "Cliente zona ovest" },
  { name: "Sommacampagna2", contact: "Rita Mancini", city: "Sommacampagna", address: "Corso Roma 67", tipo: "Trattoria", lat: 45.414567, lng: 10.858901, notes: "Pagamento 30gg" },
  { name: "Sommacampagna3", contact: "Aldo Leone", city: "Sommacampagna", address: "Piazza Italia 9", tipo: "Caffetteria", lat: 45.41789, lng: 10.861234, notes: "Ordini regolari" },
  // Castelnuovo del Garda
  { name: "CastelnuovodelGarda1", contact: "Vera Fontana", city: "Castelnuovo del Garda", address: "Via Gardesana 123", tipo: "Bar", lat: 45.451234, lng: 10.745678, notes: "Cliente Gardaland sud" },
  { name: "CastelnuovodelGarda2", contact: "Nello Costa", city: "Castelnuovo del Garda", address: "Piazza Mazzini 34", tipo: "Ristorante", lat: 45.454567, lng: 10.748901, notes: "Pagamento stagionale" },
  { name: "CastelnuovodelGarda3", contact: "Olga Caruso", city: "Castelnuovo del Garda", address: "Via Roma 56", tipo: "Pizzeria", lat: 45.45789, lng: 10.751234, notes: "Cliente turistico" },
  // San Martino Buon Albergo
  { name: "SanMartinoBA1", contact: "Ivo Romano", city: "San Martino Buon Albergo", address: "Via Verona 89", tipo: "Bar", lat: 45.418901, lng: 11.065678, notes: "Cliente est Verona" },
  { name: "SanMartinoBA2", contact: "Lidia Giordano", city: "San Martino Buon Albergo", address: "Corso Italia 23", tipo: "Caffetteria", lat: 45.421234, lng: 11.068901, notes: "Pagamento anticipato" },
  { name: "SanMartinoBA3", contact: "Cesare Vitale", city: "San Martino Buon Albergo", address: "Piazza Libertà 45", tipo: "Trattoria", lat: 45.424567, lng: 11.071234, notes: "Ordini fissi" },
  // Zevio
  { name: "Zevio1", contact: "Alma Longo", city: "Zevio", address: "Via Roma 123", tipo: "Bar", lat: 45.384567, lng: 11.138901, notes: "Cliente sud-est" },
  { name: "Zevio2", contact: "Tullio Palmieri", city: "Zevio", address: "Corso Garibaldi 56", tipo: "Ristorante", lat: 45.38789, lng: 11.141234, notes: "Pagamento 60gg" },
  { name: "Zevio3", contact: "Ilda Lombardi", city: "Zevio", address: "Piazza Maggiore 12", tipo: "Pizzeria", lat: 45.391234, lng: 11.144567, notes: "Cliente affidabile" },
  // Grezzana
  { name: "Grezzana1", contact: "Fausto Moretti", city: "Grezzana", address: "Via Verona 78", tipo: "Bar", lat: 45.501234, lng: 11.008901, notes: "Cliente valle nord" },
  { name: "Grezzana2", contact: "Iris Rizzo", city: "Grezzana", address: "Piazza Vittoria 23", tipo: "Osteria", lat: 45.504567, lng: 11.011234, notes: "Ordini montagna" },
  { name: "Grezzana3", contact: "Primo Ferraro", city: "Grezzana", address: "Via Roma 45", tipo: "Trattoria", lat: 45.50789, lng: 11.014567, notes: "Cliente Valpantena" },
];

// Prodotti HoReCa realistici
const PRODUCTS = [
  "Caffè Illy 1kg", "Caffè Lavazza 1kg", "Birra Moretti 33cl x24", "Birra Peroni 33cl x24",
  "Prosecco DOC 75cl", "Vino Valpolicella DOC", "Coca-Cola 33cl x24", "Acqua San Benedetto 50cl x24",
  "Cornetti surgelati x50", "Brioche mignon x100", "Patatine San Carlo 45g x20",
  "Olio EVO Puglia 5L", "Passata pomodoro 3kg", "Mozzarella fior di latte 1kg",
  "Prosciutto crudo Parma 7kg", "Gelato vaschetta 5L"
];

const ESITI = ['ordine_acquisito', 'da_richiamare', 'info_richiesta', 'no_interesse', 'altro'];
const ESITI_WEIGHTS = [45, 20, 15, 10, 10];

const VISIT_NOTES = [
  "Interessato a promozione caffè", "Richiede listino aggiornato", "Ordine concordato per prossima settimana",
  "Titolare assente, parlato con dipendente", "Buona accoglienza, da ricontattare", "Soddisfatto del servizio",
  "Richiede campioni nuovi prodotti", "Nuovo listino consegnato", "Interessato a birre artigianali",
  "Cliente molto soddisfatto", "Ordine registrato, consegna giovedì", "Problema qualità ultimo ordine"
];

function weightedRandom(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function getWorkingDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function generateImporto(tipo: string, esito: string): number | null {
  if (esito !== 'ordine_acquisito') return Math.random() < 0.1 ? Math.round(Math.random() * 100 + 50) : null;
  const ranges: Record<string, [number, number]> = {
    'Bar': [80, 250], 'Caffetteria': [60, 200], 'Ristorante': [150, 500],
    'Trattoria': [120, 400], 'Pizzeria': [100, 350], 'Osteria': [100, 300]
  };
  const [min, max] = ranges[tipo] || [80, 250];
  return Math.round(Math.random() * (max - min) + min);
}

function generateProdotti(esito: string): string {
  const n = esito === 'ordine_acquisito' ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 3) + 1;
  const selected = new Set<string>();
  while (selected.size < n) selected.add(PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)]);
  return Array.from(selected).join(', ');
}

export default function SeedVisitsPage() {
  const { crypto, ready } = useCrypto();
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ accounts: 0, visits: 0 });

  const log = (msg: string) => setStatus(prev => [...prev.slice(-20), msg]);

  async function seedData() {
    if (!crypto || !ready) {
      log('❌ Crypto non pronto. Sblocca la passphrase.');
      return;
    }

    setLoading(true);
    setStatus([]);
    log('🚀 Inizio seed dati...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      // 1. Crea accounts
      log('📝 Creazione clienti...');
      const accountIds = new Map<string, string>();

      for (const client of CLIENTS_DATA) {
        const tempId = globalThis.crypto?.randomUUID?.() ?? `temp-${Date.now()}-${Math.random()}`;
        
        const nameEnc = await (crypto as any).encryptFields('table:accounts', 'accounts', tempId, { name: client.name });
        const name_bi = await (crypto as any).computeBlindIndex?.('table:accounts', client.name);

        const res = await fetch('/api/clients/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: tempId,
            name_enc: nameEnc.name_enc,
            name_iv: nameEnc.name_iv,
            name_bi,
            city: client.city,
            street: client.address,
            tipo_locale: client.tipo,
            notes: client.notes,
            lat: client.lat,
            lng: client.lng,
          })
        });

        if (res.ok) {
          const data = await res.json();
          accountIds.set(client.name, data.id || tempId);
          setStats(prev => ({ ...prev, accounts: prev.accounts + 1 }));
        } else {
          log(`⚠️ Errore cliente ${client.name}`);
        }
      }

      log(`✅ ${accountIds.size} clienti creati`);

      // 2. Genera visite
      log('📅 Generazione visite...');
      const startDate = new Date('2025-11-06');
      const endDate = new Date('2025-12-07');
      const workingDays = getWorkingDays(startDate, endDate);
      const clientsArray = Array.from(accountIds.entries());

      let visitCount = 0;
      for (const day of workingDays) {
        const visitsPerDay = Math.floor(Math.random() * 3) + 6;
        const shuffled = [...clientsArray].sort(() => Math.random() - 0.5).slice(0, visitsPerDay);

        for (const [clientName, accountId] of shuffled) {
          const clientData = CLIENTS_DATA.find(c => c.name === clientName);
          if (!clientData) continue;

          const hour = Math.floor(Math.random() * 10) + 8;
          const minute = Math.floor(Math.random() * 60);
          const visitDate = new Date(day);
          visitDate.setHours(hour, minute, 0, 0);

          const esito = ESITI[weightedRandom(ESITI_WEIGHTS)];
          const importo = generateImporto(clientData.tipo, esito);
          const prodotti = generateProdotti(esito);

          const { error } = await supabase.from('visits').insert({
            user_id: user.id,
            account_id: accountId,
            tipo: Math.random() < 0.85 ? 'visita' : 'chiamata',
            data_visita: visitDate.toISOString(),
            esito,
            durata: Math.floor(Math.random() * 30) + 10,
            importo_vendita: importo,
            notes: VISIT_NOTES[Math.floor(Math.random() * VISIT_NOTES.length)],
            prodotti_discussi: prodotti,
          });

          if (!error) {
            visitCount++;
            setStats(prev => ({ ...prev, visits: visitCount }));
          }
        }
      }

      log(`✅ Completato! ${accountIds.size} clienti, ${visitCount} visite`);

    } catch (error: any) {
      log(`❌ Errore: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 700, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>🌱 Seed Visite Demo</h1>
      <p>Genera 94 clienti fittizi + ~150 visite (6 Nov - 7 Dic 2025)</p>

      <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: 16, margin: '20px 0' }}>
        ⚠️ <strong>Attenzione:</strong> Creerà dati demo nel tuo account.
      </div>

      <button
        onClick={seedData}
        disabled={loading || !ready}
        style={{
          background: loading ? '#9ca3af' : '#2563eb',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 8,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 16,
          fontWeight: 'bold',
        }}
      >
        {loading ? '⏳ In corso...' : '🚀 Avvia Seed'}
      </button>

      <div style={{ marginTop: 20, display: 'flex', gap: 20 }}>
        <div style={{ padding: 16, background: '#dbeafe', borderRadius: 8 }}>
          👥 Clienti: <strong>{stats.accounts}</strong>
        </div>
        <div style={{ padding: 16, background: '#dcfce7', borderRadius: 8 }}>
          📅 Visite: <strong>{stats.visits}</strong>
        </div>
      </div>

      {status.length > 0 && (
        <div style={{ marginTop: 20, padding: 16, background: '#f3f4f6', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, maxHeight: 300, overflow: 'auto' }}>
          {status.map((s, i) => <div key={i}>{s}</div>)}
        </div>
      )}
    </div>
  );
}
