// app/chat/rules.ts

// Intents supportati (minimo vitale)
export type Intent =
  | "count"                 // es. "Quanti clienti ho?"
  | "list_names"            // es. "Come si chiamano?"
  | "list_emails"           // es. "E le email?"
  | "list_missing_products" // es. "Prodotti mancanti?"
  | "help"                  // aiuto / cosa posso chiedere
  | "reset"                 // reset contesto
  | "unknown";              // non capito

export type TopicHint = "clients" | "prodotti" | "ordini" | "global" | null;

export type Entities = {
  raw?: string;               // testo normalizzato
  number?: number | null;     // numeri catturati, se utili
  keywords?: string[];        // parole chiave rilevanti
  polarity?: "missing" | null;// per casi tipo "mancanti", "senza"
};

// Funzione principale
export function parseUtterance(input: string): {
  intent: Intent;
  entities: Entities;
  topicHint: TopicHint;
} {
  const raw = normalize(input);

  // --- Regole di topic (per suggerire lo scope) ---
  const talksClients  = /(client[oi]|clientela|negozi|bar|pasticcerie)\b/.test(raw);
  const talksProducts = /(prodott[oi]|articol[oi]|catalogo|listino)\b/.test(raw);
  const talksOrders   = /(ordin[oi]|order|comand[oi]|fattur[ae])\b/.test(raw);

  let topicHint: TopicHint = null;
  if (talksClients)  topicHint = "clients";
  else if (talksProducts) topicHint = "prodotti";
  else if (talksOrders)   topicHint = "ordini";

  // --- Intents principali con varianti comuni ---
  if (isReset(raw)) {
    return { intent: "reset", entities: { raw }, topicHint };
  }

  if (isHelp(raw)) {
    return { intent: "help", entities: { raw }, topicHint: topicHint ?? "global" };
  }

  if (isCount(raw)) {
    // se manca il topic ma l’utente non specifica, proviamo a indovinare: default "clients"
    return { intent: "count", entities: attachCommonEntities(raw), topicHint: topicHint ?? "clients" };
  }

  if (isListNames(raw)) {
    return { intent: "list_names", entities: attachCommonEntities(raw), topicHint: topicHint ?? null };
  }

  if (isListEmails(raw)) {
    return { intent: "list_emails", entities: attachCommonEntities(raw), topicHint: topicHint ?? "clients" };
  }

  if (isListMissingProducts(raw)) {
    return {
      intent: "list_missing_products",
      entities: { ...attachCommonEntities(raw), polarity: "missing" },
      topicHint: topicHint ?? "prodotti",
    };
  }

  // fallback
  return { intent: "unknown", entities: attachCommonEntities(raw), topicHint: topicHint ?? null };
}

// -------------------- Regole / Helpers --------------------

function normalize(t: string) {
  return t
    .trim()
    .toLowerCase()
    // normalizza accenti/diacritici
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    // compatta spazi
    .replace(/\s+/g, " ");
}

function isReset(t: string) {
  return /^(\/reset|resetta|azzera( re)? (il )?contesto|ricomincia|nuova sessione)$/.test(t);
}

function isHelp(t: string) {
  return /(aiuto|help|cosa posso chiedere|come funziona|\?)$/.test(t);
}

function isCount(t: string) {
  return (
    /^(quanti|numero|conta)\b/.test(t) && /(client[oi]|prodott[oi]|ordin[oi])\b/.test(t)
  ) || /(tot|qta|qtà)\b/.test(t);
}

function isListNames(t: string) {
  return /(come si chiamano|i nomi|lista nomi|dammi i nomi)\b/.test(t) ||
         /^nomi\??$/.test(t);
}

function isListEmails(t: string) {
  return /(^|\b)(e )?(le )?email(s)?\??$/.test(t) ||
         /(dammi|mostra).*(email)/.test(t);
}

function isListMissingProducts(t: string) {
  return /(mancanti|mancanza|non presenti|che mancano)\b/.test(t) &&
         /(prodott[oi]|articol[oi]|catalogo|listino)\b/.test(t);
}

function attachCommonEntities(t: string): Entities {
  const numbers = Array.from(t.matchAll(/\b(\d+)\b/g)).map(m => parseInt(m[1], 10));
  const number = numbers.length ? numbers[0] : null;

  // parole chiave grezze utili per filtri elementari
  const keywords = Array.from(
    new Set(
      (t.match(/\b[a-zà-ù]{3,}\b/gi) || [])
        .filter(w => !STOP_WORDS.has(w))
    )
  );

  return { raw: t, number, keywords, polarity: null };
}

const STOP_WORDS = new Set<string>([
  "il","lo","la","i","gli","le","un","una","uno",
  "di","a","da","in","con","su","per","tra","fra","e","o",
  "mi","ti","si","ci","vi","che","come","si","sono","sei","sei",
  "quanti","quanto","quante","quanta","tot","numero","conta","lista",
  "dammi","mostra","dimmi","dimmelo","fammi","perche","perché",
  "questo","questa","questi","queste","quello","quella",
  "dei","degli","delle","del","della","dell","dallo","dalla","dalle",
  "dei","ai","agli","alle","agli","all","al","allo","alla","alle",
  "ho","abbiamo","hai","avete","hanno","ci","me","te","tu","voi","loro",
  "siamo","siete","sono","sto","stai","sta","state","stanno",
  "qual e","qual è","qual","e","ed","oppure","anche","poi","allora"
]);
