// lib/nlu/utterance_preproc.ts
const FILLERS = [
  "eh", "ehm", "mmh", "boh", "cioè", "tipo", "allora", "dai", "ecco", "insomma",
  "praticamente", "ok", "okay", "va beh", "vabbè", "uh", "uhm"
];

const MAP_SYN = new Map<string, string>([
  ["i mail", "email"],
  ["la mail", "email"],
  ["le mail", "email"],
  ["mail", "email"],
  ["e mail", "email"],
  ["contatti", "clienti"],   // spesso sinonimizzati nel parlato
  ["contatto", "cliente"],
  ["quanti ne ho", "quanti clienti ho"],
  ["quanti contatti", "quanti clienti"],
  ["nomi dei contatti", "nomi dei clienti"],
]);

const NUM_IT: Array<[RegExp, string]> = [
  [/zero/g, "0"], [/uno/g, "1"], [/una/g, "1"], [/due/g, "2"], [/tre/g, "3"],
  [/quattro/g, "4"], [/cinque/g, "5"], [/sei/g, "6"], [/sette/g, "7"],
  [/otto/g, "8"], [/nove/g, "9"], [/dieci/g, "10"], [/undici/g, "11"],
  [/dodici/g, "12"], [/tredici/g, "13"], [/quattordici/g, "14"], [/quindici/g, "15"],
  [/sedici/g, "16"], [/diciassette/g, "17"], [/diciotto/g, "18"], [/diciannove/g, "19"],
  [/venti/g, "20"], [/trenta/g, "30"], [/quaranta/g, "40"], [/cinquanta/g, "50"],
  [/sessanta/g, "60"], [/settanta/g, "70"], [/ottanta/g, "80"], [/novanta/g, "90"],
  [/cento/g, "100"], [/mille/g, "1000"], [/duemila/g, "2000"],
];

function stripPunctuation(s: string) {
  return s.replace(/[!?.,;:()\[\]{}"“”'’]+/g, " ");
}

function collapseSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function removeFillers(tokens: string[]) {
  return tokens.filter(t => !FILLERS.includes(t));
}

function applySynonyms(s: string) {
  let out = s;
  for (const [from, to] of MAP_SYN.entries()) {
    const re = new RegExp(`\\b${from}\\b`, "g");
    out = out.replace(re, to);
  }
  return out;
}

function normalizeNumbers(s: string) {
  let out = s;
  for (const [re, val] of NUM_IT) out = out.replace(re, val);
  return out;
}

function dedupeRepeats(s: string) {
  return s.replace(/\b(\w+)\s+\1\b/g, "$1");
}

/** Normalizzazione "voce→testo" prima della classificazione intent. */
export function preprocessUtterance(input: string): string {
  if (!input) return "";
  let s = input.toLowerCase();
  s = stripPunctuation(s);
  s = collapseSpaces(s);
  const toks = removeFillers(s.split(" "));
  s = toks.join(" ");
  s = applySynonyms(s);
  s = normalizeNumbers(s);
  s = dedupeRepeats(s);
  return collapseSpaces(s);
}
