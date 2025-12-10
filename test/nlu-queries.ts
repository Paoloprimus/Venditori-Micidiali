// test/nlu-queries.ts
// Suite di 50 query di test per il parser NLU di Repping
// Coprono gli intent più comuni per un agente HoReCa

export type TestQuery = {
  id: number;
  query: string;
  expectedIntent: string;
  expectedEntities?: Record<string, any>;
  minConfidence?: number; // default 0.75
};

export const TEST_QUERIES: TestQuery[] = [
  // ═══════════════════════════════════════════════════════════════
  // CLIENTI (10 query)
  // ═══════════════════════════════════════════════════════════════
  { id: 1,  query: "Quanti clienti ho?",           expectedIntent: "client_count" },
  { id: 2,  query: "quanti clienti ho in totale",  expectedIntent: "client_count" },
  { id: 3,  query: "numero clienti",               expectedIntent: "client_count" },
  { id: 4,  query: "Lista clienti",                expectedIntent: "client_list" },
  { id: 5,  query: "mostrami i clienti",           expectedIntent: "client_list" },
  { id: 6,  query: "elenca tutti i clienti",       expectedIntent: "client_list" },
  { id: 7,  query: "Cerca cliente Rossi",          expectedIntent: "client_search", expectedEntities: { clientName: "Rossi" } },
  { id: 8,  query: "trova il cliente Bianchi",     expectedIntent: "client_search", expectedEntities: { clientName: "Bianchi" } },
  { id: 9,  query: "chi non vedo da un mese",      expectedIntent: "client_inactive" },
  { id: 10, query: "clienti inattivi",             expectedIntent: "client_inactive" },

  // ═══════════════════════════════════════════════════════════════
  // VISITE (10 query)
  // ═══════════════════════════════════════════════════════════════
  { id: 11, query: "Visite di oggi",               expectedIntent: "visit_today" },
  { id: 12, query: "chi ho visto oggi",            expectedIntent: "visit_today" },
  { id: 13, query: "clienti visitati oggi",        expectedIntent: "visit_today" },
  { id: 14, query: "quante visite ho fatto oggi",  expectedIntent: "visit_count", expectedEntities: { period: "today" } },
  { id: 15, query: "visite questa settimana",      expectedIntent: "visit_count", expectedEntities: { period: "week" } },
  { id: 16, query: "quante visite questo mese",    expectedIntent: "visit_count", expectedEntities: { period: "month" } },
  { id: 17, query: "quando ho visto Rossi",        expectedIntent: "visit_last", expectedEntities: { clientName: "Rossi" } }, // visit_history è equivalente a visit_last
  { id: 18, query: "ultima visita a Bianchi",      expectedIntent: "visit_last", expectedEntities: { clientName: "Bianchi" } },
  { id: 19, query: "storico visite Mario",         expectedIntent: "visit_history", expectedEntities: { clientName: "Mario" } },
  { id: 20, query: "prima visita di oggi",         expectedIntent: "visit_by_position", expectedEntities: { position: 1 } },

  // ═══════════════════════════════════════════════════════════════
  // VENDITE (10 query)
  // ═══════════════════════════════════════════════════════════════
  { id: 21, query: "quanto ho venduto oggi",       expectedIntent: "sales_today" }, // sales_today ha confidence più alta
  { id: 22, query: "vendite di oggi",              expectedIntent: "sales_today" },
  { id: 23, query: "fatturato oggi",               expectedIntent: "sales_today" },
  { id: 24, query: "vendite questo mese",          expectedIntent: "sales_period", expectedEntities: { period: "month" } }, // sales_period gestisce periodi specifici
  { id: 25, query: "quanto ho fatturato questa settimana", expectedIntent: "sales_period", expectedEntities: { period: "week" } }, // sales_period gestisce periodi specifici
  { id: 26, query: "vendite a Rossi",              expectedIntent: "sales_by_client", expectedEntities: { clientName: "Rossi" } },
  { id: 27, query: "quanto ha comprato Bianchi",   expectedIntent: "sales_by_client", expectedEntities: { clientName: "Bianchi" } },
  { id: 28, query: "chi compra birra",             expectedIntent: "sales_by_product", expectedEntities: { productName: "birra" } },
  { id: 29, query: "a chi ho venduto vino",        expectedIntent: "sales_by_product", expectedEntities: { productName: "vino" } },
  { id: 30, query: "ordine medio questo mese",     expectedIntent: "analytics_avg_order" },

  // ═══════════════════════════════════════════════════════════════
  // PLANNING (6 query)
  // ═══════════════════════════════════════════════════════════════
  { id: 31, query: "cosa devo fare oggi",          expectedIntent: "planning_today" },
  { id: 32, query: "piano di oggi",                expectedIntent: "planning_today" },
  { id: 33, query: "appuntamenti oggi",            expectedIntent: "planning_today" },
  { id: 34, query: "chi devo richiamare",          expectedIntent: "planning_callbacks" },
  { id: 35, query: "richiami da fare",             expectedIntent: "planning_callbacks" },
  { id: 36, query: "callback in sospeso",          expectedIntent: "planning_callbacks" },

  // ═══════════════════════════════════════════════════════════════
  // PRODOTTI (4 query)
  // ═══════════════════════════════════════════════════════════════
  { id: 37, query: "prodotti mancanti",            expectedIntent: "product_missing" },
  { id: 38, query: "cosa manca in magazzino",      expectedIntent: "product_missing" },
  { id: 39, query: "cosa ho discusso con Rossi",   expectedIntent: "product_discussed", expectedEntities: { clientName: "Rossi" } },
  { id: 40, query: "prodotti trattati con Verdi",  expectedIntent: "product_discussed", expectedEntities: { clientName: "Verdi" } },

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS (6 query)
  // ═══════════════════════════════════════════════════════════════
  { id: 41, query: "top 10 clienti",               expectedIntent: "analytics_top_clients" },
  { id: 42, query: "migliori clienti del mese",    expectedIntent: "analytics_top_clients" },
  { id: 43, query: "prodotti più venduti",         expectedIntent: "analytics_top_products" },
  { id: 44, query: "top prodotti questo mese",     expectedIntent: "analytics_top_products" },
  { id: 45, query: "previsione fatturato",         expectedIntent: "analytics_forecast" },
  { id: 46, query: "qual è il giorno migliore",    expectedIntent: "analytics_best_day" },

  // ═══════════════════════════════════════════════════════════════
  // CONVERSAZIONALI (4 query)
  // ═══════════════════════════════════════════════════════════════
  { id: 47, query: "ciao",                         expectedIntent: "greet" },
  { id: 48, query: "buongiorno",                   expectedIntent: "greet" },
  { id: 49, query: "aiuto",                        expectedIntent: "help" },
  { id: 50, query: "grazie",                       expectedIntent: "thanks" },
];

// ═══════════════════════════════════════════════════════════════
// FASE 1: ELABORAZIONI NUMERICHE (10 test)
// ═══════════════════════════════════════════════════════════════
export const PHASE1_NUMERIC_QUERIES: TestQuery[] = [
  { id: 51, query: "quanto ho fatturato in media al giorno questo mese", expectedIntent: "analytics_daily_avg" },
  { id: 52, query: "media giornaliera vendite",                         expectedIntent: "analytics_daily_avg" },
  { id: 53, query: "variazione vendite rispetto al mese scorso",        expectedIntent: "analytics_month_comparison" },
  { id: 54, query: "confronto con il mese precedente",                  expectedIntent: "analytics_month_comparison" },
  { id: 55, query: "quanto manca per arrivare a 10000 euro",            expectedIntent: "analytics_target_gap" },
  { id: 56, query: "quanto manca al target",                            expectedIntent: "analytics_target_gap" },
  { id: 57, query: "se continuo così quanto fatturo a fine anno",       expectedIntent: "analytics_yearly_forecast" },
  { id: 58, query: "previsione annuale",                                expectedIntent: "analytics_yearly_forecast" },
  { id: 59, query: "qual è il cliente che sta crescendo di più",        expectedIntent: "analytics_growth_leader" },
  { id: 60, query: "cliente con la crescita maggiore",                  expectedIntent: "analytics_growth_leader" },
  { id: 61, query: "quanti clienti nuovi ho acquisito questo mese",     expectedIntent: "analytics_new_clients" },
  { id: 62, query: "nuovi clienti del trimestre",                       expectedIntent: "analytics_new_clients" },
  { id: 63, query: "qual è il mio tasso di conversione",                expectedIntent: "analytics_conversion_rate" },
  { id: 64, query: "conversione visite vendite",                        expectedIntent: "analytics_conversion_rate" },
  { id: 65, query: "ogni quanto visito lo stesso cliente",              expectedIntent: "analytics_visit_frequency" },
  { id: 66, query: "frequenza media visite per cliente",                expectedIntent: "analytics_visit_frequency" },
  { id: 67, query: "quanto fatturato genero per km",                    expectedIntent: "revenue_per_km" },
  { id: 68, query: "euro per chilometro",                               expectedIntent: "revenue_per_km" },
];

// ═══════════════════════════════════════════════════════════════
// FASE 2: INFERENZE STRATEGICHE (20 test)
// ═══════════════════════════════════════════════════════════════
export const PHASE2_STRATEGY_QUERIES: TestQuery[] = [
  // Priorità visite
  { id: 71, query: "quali clienti dovrei visitare questa settimana",    expectedIntent: "strategy_visit_priority" },
  { id: 72, query: "chi dovrei visitare per primo",                     expectedIntent: "strategy_visit_priority" },
  { id: 73, query: "chi è prioritario da vedere",                       expectedIntent: "strategy_visit_priority" },
  
  // Rischio churn
  { id: 74, query: "chi rischia di passare alla concorrenza",           expectedIntent: "strategy_churn_risk" },
  { id: 75, query: "clienti a rischio",                                 expectedIntent: "strategy_churn_risk" },
  { id: 76, query: "chi potrei perdere",                                expectedIntent: "strategy_churn_risk" },
  
  // Focus fatturato
  { id: 77, query: "dove dovrei concentrarmi per aumentare il fatturato", expectedIntent: "strategy_revenue_focus" },
  { id: 78, query: "come posso aumentare le vendite",                   expectedIntent: "strategy_revenue_focus" },
  
  // Focus prodotti
  { id: 79, query: "quali prodotti dovrei spingere di più",             expectedIntent: "strategy_product_focus" },
  { id: 80, query: "su quali prodotti puntare",                         expectedIntent: "strategy_product_focus" },
  
  // Cliente ideale
  { id: 81, query: "qual è il mio cliente ideale",                      expectedIntent: "strategy_ideal_customer" },
  { id: 82, query: "profilo del cliente perfetto",                      expectedIntent: "strategy_ideal_customer" },
  
  // Opportunità perse
  { id: 83, query: "dove sto perdendo opportunità",                     expectedIntent: "strategy_lost_opportunities" },
  { id: 84, query: "quali opportunità mi sto perdendo",                 expectedIntent: "strategy_lost_opportunities" },
  
  // Potenziale crescita
  { id: 85, query: "quali clienti piccoli potrebbero crescere",         expectedIntent: "strategy_growth_potential" },
  { id: 86, query: "clienti con potenziale inespresso",                 expectedIntent: "strategy_growth_potential" },
  
  // Piano d'azione
  { id: 87, query: "cosa dovrei fare per raggiungere 10000 euro",       expectedIntent: "strategy_action_plan", expectedEntities: { targetAmount: 10000 } },
  { id: 88, query: "come arrivo al target",                             expectedIntent: "strategy_action_plan" },
  
  // Momento migliore
  { id: 89, query: "qual è il miglior momento per visitare i bar",      expectedIntent: "strategy_best_time", expectedEntities: { localeType: "bar" } },
  { id: 90, query: "quando visitare i ristoranti",                      expectedIntent: "strategy_best_time", expectedEntities: { localeType: "ristoranti" } },
];

// ═══════════════════════════════════════════════════════════════
// FASE 3: VISUALIZZAZIONI E TREND (20 test)
// ═══════════════════════════════════════════════════════════════
export const PHASE3_VISUAL_QUERIES: TestQuery[] = [
  // Trend vendite
  { id: 91, query: "mostrami il trend vendite degli ultimi 6 mesi",     expectedIntent: "chart_sales_trend" },
  { id: 92, query: "andamento fatturato",                               expectedIntent: "chart_sales_trend" },
  { id: 93, query: "come stanno andando le vendite",                    expectedIntent: "chart_sales_trend" },
  
  // Confronto YoY
  { id: 94, query: "confronta le vendite con l'anno scorso",            expectedIntent: "chart_yoy_comparison" },
  { id: 95, query: "rispetto all'anno scorso come sto",                 expectedIntent: "chart_yoy_comparison" },
  
  // Distribuzione per giorno
  { id: 96, query: "distribuzione vendite per giorno della settimana",  expectedIntent: "chart_sales_by_weekday" },
  { id: 97, query: "in che giorno vendo di più",                        expectedIntent: "chart_sales_by_weekday" },
  
  // Per città
  { id: 98, query: "classifica città per fatturato",                    expectedIntent: "chart_sales_by_city" },
  { id: 99, query: "vendite per zona",                                  expectedIntent: "chart_sales_by_city" },
  
  // Per tipo locale
  { id: 100, query: "distribuzione visite per tipo locale",             expectedIntent: "chart_visits_by_type" },
  { id: 101, query: "quanti bar e quanti ristoranti visito",            expectedIntent: "chart_visits_by_type" },
  
  // Ordine medio trend
  { id: 102, query: "andamento ordine medio",                           expectedIntent: "chart_avg_order_trend" },
  { id: 103, query: "come sta cambiando lo scontrino medio",            expectedIntent: "chart_avg_order_trend" },
  
  // Clienti per fascia
  { id: 104, query: "clienti per fascia di fatturato",                  expectedIntent: "chart_clients_by_revenue" },
  { id: 105, query: "distribuzione clienti per spesa",                  expectedIntent: "chart_clients_by_revenue" },
  
  // Stagionalità
  { id: 106, query: "qual è la stagionalità delle mie vendite",         expectedIntent: "chart_seasonality" },
  { id: 107, query: "mesi migliori e peggiori",                         expectedIntent: "chart_seasonality" },
  
  // Crescita clienti
  { id: 108, query: "evoluzione del numero clienti",                    expectedIntent: "chart_client_growth" },
  { id: 109, query: "crescita portfolio clienti",                       expectedIntent: "chart_client_growth" },
  
  // ═══════════════════════════════════════════════════════════════
  // 🎩 NAPOLEONE - Briefing Proattivo
  // ═══════════════════════════════════════════════════════════════
  
  { id: 110, query: "fammi il punto della situazione",                  expectedIntent: "napoleon_briefing" },
  { id: 111, query: "napoleone dimmi cosa fare",                        expectedIntent: "napoleon_briefing" },
  { id: 112, query: "aggiornami sulla situazione",                      expectedIntent: "napoleon_briefing" },
  { id: 113, query: "briefing della giornata",                          expectedIntent: "napoleon_briefing" },
  { id: 114, query: "ok napoleone che mi dici",                         expectedIntent: "napoleon_briefing" },
];

// Query aggiuntive per test futuri (varianti dialettali, errori ortografici, ecc.)
export const EXTENDED_QUERIES: TestQuery[] = [
  // Varianti con errori comuni
  { id: 101, query: "quanti clenti ho",            expectedIntent: "client_count", minConfidence: 0.6 },
  { id: 102, query: "vissite oggi",                expectedIntent: "visit_today", minConfidence: 0.6 },
  
  // Varianti informali
  { id: 103, query: "fammi vedere i clienti",      expectedIntent: "client_list" },
  { id: 104, query: "dimmi le visite",             expectedIntent: "visit_today" },
  
  // Query composite (future)
  { id: 105, query: "clienti di Milano che hanno comprato vino", expectedIntent: "composite_query" },
  { id: 106, query: "bar di Verona non visitati da 2 settimane", expectedIntent: "composite_query" },
];

