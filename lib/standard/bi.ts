// lib/standard/bi.ts
// Versione TEMP: BI = SHA-256( unaccent(lower(NFKC(input))) ) → hex "\x...."
// NB: In JS serve ESCAPE: "\\x...." quando lo metti nel JSON.

function normalizeString(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    // rimozione accentate base (semplificata per subito)
    .replaceAll(/[àáâãä]/g, "a")
    .replaceAll(/[èéêë]/g, "e")
    .replaceAll(/[ìíîï]/g, "i")
    .replaceAll(/[òóôõö]/g, "o")
    .replaceAll(/[ùúûü]/g, "u")
    .replaceAll(/[ç]/g, "c")
    // spazi multipli → singolo
    .replace(/\s+/g, " ");
}

function toHex(u8: Uint8Array): string {
  return Array.from(u8).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function makeBIHexFromTerm(term: string): Promise<string> {
  const canon = normalizeString(term);
  const bytes = new TextEncoder().encode(canon);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = toHex(new Uint8Array(digest));
  // forma JS per JSON: "\\x..." (doppio backslash in stringa)
  return "\\x" + hex;
}

/**
 * Accetta una o più parole/alias e produce una bi_list pronta da inviare all'API.
 * Esempio: await makeBiList(["torta","cheesecake"])
 */
export async function makeBiList(terms: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const t of terms) {
    const bi = await makeBIHexFromTerm(t);
    if (!out.includes(bi)) out.push(bi);
  }
  return out;
}
