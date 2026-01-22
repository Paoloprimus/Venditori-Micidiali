// lib/chat/utils.ts
// Utility functions per HomeClient - estratte per mantenibilità

/** Patch prezzi: se la risposta contiene 0 o 0% sostituisco con fallback chiari */
export function patchPriceReply(text: string): string {
  if (!text) return text;

  let t = text;
  t = t.replace(/(Il prezzo base di «[^»]+» è )0([.,\s]|$)/i, "$1non disponibile a catalogo$2");
  t = t.replace(/(Sconto(?:\sapplicato)?:\s*)0\s*%/i, "$1nessuno");
  t = t.replace(/(Attualmente lo sconto applicato è\s*)0\s*%/i, "$1nessuno");

  return t;
}

/** Pattern conferma sì/no */
export const YES_PATTERN = /\b(s[ìi]|esatto|ok|procedi|vai|confermo|invia)\b/i;
export const NO_PATTERN = /\b(no|annulla|stop|ferma|negativo|non ancora)\b/i;

/** Stopwords per estrazione termini prodotto */
const STOPWORDS = new Set([
  "il","lo","la","i","gli","le","un","una","uno","di","a","da","in","con","su","per","tra","fra",
  "quanti","quanto","quante","quanta","ci","sono","è","e","che","nel","nello","nella","al","allo",
  "alla","agli","alle","catalogo","deposito","magazzino","costa","prezzo","quanto","quanto?","?","."
]);

/** Rimuove accenti e converte in lowercase */
export function unaccentLower(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Estrae termine prodotto dalla stringa normalizzata */
export function extractProductTerm(normalized: string): string {
  const tokens = normalized.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const candidates = tokens.filter(t => !STOPWORDS.has(t));
  if (!candidates.length) return normalized.trim();
  return candidates.sort((a, b) => b.length - a.length)[0];
}

/** POST JSON helper */
export async function postJSON(url: string, body: any): Promise<any> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return r.json();
}

/** Template fill helper */
export function fillTemplateSimple(tpl: string, data: Record<string, any>): string {
  return tpl.replace(/\{(\w+)\}/g, (_m, k) => {
    const v = data?.[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Template locali per risposte prodotti */
export const LOCAL_TEMPLATES: Record<string, { response: string }> = {
  prod_conteggio_catalogo: {
    response: "A catalogo ho trovato {count} referenze di «{prodotto}».",
  },
  prod_giacenza_magazzino: {
    response: "In deposito ci sono {stock} pezzi di «{prodotto}».",
  },
  prod_prezzo_sconti: {
    response: "Il prezzo base di «{prodotto}» è {price}. Sconto applicato: {discount}.",
  },
};

/** Pagine per navigazione */
export const NAVIGATION_PAGES: Record<string, { url: string; name: string }> = {
  clients: { url: '/clients', name: 'Lista Clienti' },
  visits: { url: '/visits', name: 'Lista Visite' },
  products: { url: '/products', name: 'Prodotti' },
  documents: { url: '/documents', name: 'Documenti' },
  settings: { url: '/settings', name: 'Impostazioni' },
};

/** Genera risposta per intent semplici (gestiti localmente) */
export function getLocalIntentResponse(intent: string, entities: Record<string, any>): string | null {
  switch (intent) {
    case 'greet':
      return "Ciao! 👋 Come posso aiutarti oggi?";
    
    case 'help':
      return "Posso aiutarti con:\n\n" +
        "📋 **Clienti**: \"Quanti clienti ho?\", \"Cerca cliente Rossi\"\n" +
        "📍 **Visite**: \"Visite di oggi\", \"Quando ho visto Bianchi?\"\n" +
        "💰 **Vendite**: \"Quanto ho venduto questo mese?\"\n" +
        "📞 **Planning**: \"Cosa devo fare oggi?\", \"Chi devo richiamare?\"\n\n" +
        "Oppure: [Clienti](/clients) | [Visite](/visits) | [Prodotti](/products)";
    
    case 'thanks':
      return "Prego! 😊 Sono qui se ti serve altro.";
    
    case 'cancel':
      return "Ok, annullato.";
    
    case 'navigate':
      const target = entities.targetPage;
      if (target && NAVIGATION_PAGES[target]) {
        return `📂 **${NAVIGATION_PAGES[target].name}**\n\n👉 [Clicca qui per aprire](${NAVIGATION_PAGES[target].url})`;
      }
      return "Dove vuoi andare?\n\n" +
        "• [Clienti](/clients)\n" +
        "• [Visite](/visits)\n" +
        "• [Prodotti](/products)\n" +
        "• [Documenti](/documents)";
    
    default:
      return null;
  }
}

/** Converte numeri in parole italiane per TTS naturale */
function numberToItalianWords(num: number): string {
  if (num < 0) return 'meno ' + numberToItalianWords(-num);
  if (num === 0) return 'zero';
  
  const units = ['', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'];
  const teens = ['dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
  const tens = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];
  
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (u === 0) return tens[t];
    if (u === 1 || u === 8) return tens[t].slice(0, -1) + units[u]; // vent'uno, ventotto
    return tens[t] + units[u];
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const prefix = h === 1 ? 'cento' : units[h] + 'cento';
    if (rest === 0) return prefix;
    return prefix + (rest < 10 ? units[rest] : numberToItalianWords(rest));
  }
  if (num < 10000) {
    const k = Math.floor(num / 1000);
    const rest = num % 1000;
    const prefix = k === 1 ? 'mille' : units[k] + 'mila';
    if (rest === 0) return prefix;
    return prefix + numberToItalianWords(rest);
  }
  // Per numeri più grandi, ritorna la cifra
  return num.toString();
}

/** Strip markdown, emoji e placeholder per TTS */
export function stripMarkdownForTTS(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/\*\*/g, '') // Bold
    .replace(/\[CLIENT:[a-f0-9-]+(?:\|[^|\]]*)*\]/gi, 'un cliente') // Placeholder non decriptati
    // 🔧 Rimuovi TUTTE le emoji (Unicode ranges)
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '')
    // Converti numeri in parole italiane (es. "94" → "novantaquattro")
    .replace(/€\s*(\d+(?:[.,]\d+)?)/g, (_, n) => {
      const num = parseFloat(n.replace(',', '.'));
      return numberToItalianWords(Math.round(num)) + ' euro';
    })
    .replace(/\b(\d+)\s*(clienti?|visite?|ordini?|€|euro)\b/gi, (_, n, word) => {
      return numberToItalianWords(parseInt(n)) + ' ' + word.toLowerCase();
    })
    .replace(/\b(\d+)\.\s/g, (_, n) => numberToItalianWords(parseInt(n)) + '. ') // Liste numerate
    .replace(/\s+/g, ' ') // Normalizza spazi multipli
    .trim();
}

