// lib/ai/tools.ts
// Definizioni dei tools per OpenAI Function Calling
// Estratto da app/api/messages/send/route.ts per mantenibilità

import OpenAI from "openai";

export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_clients",
      description: "Cerca clienti nel database. Usa per domande su clienti, conteggi, liste.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Filtra per città (es. Verona, Negrar)" },
          tipo_locale: { type: "string", description: "Tipo: bar, ristorante, pizzeria, hotel, etc." },
          notes_contain: { type: "string", description: "Cerca testo nelle note (es. figli, pagamento, interessi)" },
          limit: { type: "number", description: "Max risultati (default 10, max 100)" },
          count_only: { type: "boolean", description: "Se true, restituisce solo il conteggio" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_in_notes",
      description: "Cerca informazioni specifiche nelle note dei clienti. Usa per domande tipo 'ha figli?', 'preferenze pagamento', 'interessi', etc.",
      parameters: {
        type: "object",
        properties: {
          search_text: { type: "string", description: "Cosa cercare nelle note (es. figli, contanti, allergico)" },
          client_city: { type: "string", description: "Opzionale: filtra per città del cliente" }
        },
        required: ["search_text"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_visits",
      description: "Ottieni visite/attività. Usa per storico visite, ultime visite, visite di oggi.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "ID cliente specifico (opzionale)" },
          period: { type: "string", enum: ["today", "week", "month", "year"], description: "Periodo" },
          limit: { type: "number", description: "Max risultati (default 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_sales_summary",
      description: "Riepilogo vendite/fatturato per periodo.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "year"], description: "Periodo (default: month)" },
          client_id: { type: "string", description: "Solo per un cliente specifico (opzionale)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description: "Genera link per aprire una pagina dell'app (clienti, visite, prodotti, etc.)",
      parameters: {
        type: "object",
        properties: {
          page: { type: "string", enum: ["clients", "visits", "products", "documents", "settings"], description: "Pagina da aprire" }
        },
        required: ["page"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_visit_by_position",
      description: "Ottieni info su una visita in base alla posizione nel giorno (primo, secondo, terzo cliente visitato). Usa per domande tipo 'il secondo cliente di oggi', 'il primo che ho visto ieri'.",
      parameters: {
        type: "object",
        properties: {
          day: { type: "string", enum: ["today", "yesterday", "tomorrow"], description: "Giorno di riferimento" },
          position: { type: "number", description: "Posizione: 1 = primo, 2 = secondo, etc." }
        },
        required: ["day", "position"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_visits_by_product",
      description: "Cerca visite in cui sono stati discussi/venduti specifici prodotti. Usa per domande tipo 'chi ha comprato cornetti', 'a chi ho venduto birra'.",
      parameters: {
        type: "object",
        properties: {
          product: { type: "string", description: "Prodotto cercato (es. cornetti, birra, caffè)" },
          day: { type: "string", enum: ["today", "yesterday", "week", "month"], description: "Periodo (opzionale)" }
        },
        required: ["product"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_pdf_report",
      description: "Genera un report PDF. Usa quando l'utente chiede di salvare, esportare, o generare un PDF/report.",
      parameters: {
        type: "object",
        properties: {
          report_type: { type: "string", enum: ["clienti", "visite", "vendite"], description: "Tipo di report" },
          city_filter: { type: "string", description: "Filtra per città (opzionale)" },
          tipo_filter: { type: "string", description: "Filtra per tipo locale (opzionale)" },
          period: { type: "string", enum: ["today", "week", "month", "year"], description: "Periodo per report visite/vendite" }
        },
        required: ["report_type"]
      }
    }
  },
  // 🆕 ANALYTICS TOOLS
  {
    type: "function",
    function: {
      name: "get_top_clients",
      description: "Ottieni i migliori clienti per fatturato. Usa per domande tipo 'chi sono i miei migliori clienti', 'clienti top', 'chi fattura di più'.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["month", "quarter", "year"], description: "Periodo di analisi (default: month)" },
          limit: { type: "number", description: "Numero di clienti da mostrare (default: 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_top_products",
      description: "Ottieni i prodotti più venduti per fatturato. Usa per domande tipo 'qual è il prodotto più venduto', 'prodotti top', 'cosa vendo di più'.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["month", "quarter", "year"], description: "Periodo di analisi (default: month)" },
          limit: { type: "number", description: "Numero di prodotti da mostrare (default: 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_best_selling_day",
      description: "Trova il giorno della settimana con più vendite. Usa per domande tipo 'in che giorno vendo di più', 'giorno migliore', 'quando lavoro meglio'.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["month", "quarter", "year"], description: "Periodo di analisi (default: month)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_zone_performance",
      description: "Analizza le performance per zona/città. Usa per domande tipo 'qual è la mia zona migliore', 'città più produttiva', 'dove vendo di più'.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["month", "quarter", "year"], description: "Periodo di analisi (default: month)" }
        }
      }
    }
  }
];

