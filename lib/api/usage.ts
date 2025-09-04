// lib/api/usage.ts
// Versione "no-noise": niente errori in console e niente 400 ripetuti.
// Strategie:
// 1) Tenta PRIMA l'usage globale (endpoint senza conversationId).
// 2) SOLO se serve, prova lo scoped per-conversazione (senza loggare errori).
// 3) Qualsiasi errore -> ritorna {0,0,0} per non bloccare l'UI.

export type Usage = { tokensIn: number; tokensOut: number; costTotal: number };
type UsageResponse = Partial<Usage> & { error?: string };

async function safeFetchJSON(url: string): Promise<UsageResponse | null> {
  try {
    const res = await fetch(url, { method: "GET" });
    // 204: nessun contenuto/usage
    if (res.status === 204) return null;
    // 400/404 ecc.: trattiamo come "nessun dato", senza rumore
    if (!res.ok) return null;

    const data = (await res.json()) as UsageResponse;
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Riepilogo usage corrente, resiliente:
 * - prova prima il globale (nessun 400 in console);
 * - opzionale tentativo per-conversazione se indicato (e comunque silenzioso);
 * - fallback a zeri se non disponibile.
 */
export async function getCurrentChatUsage(conversationId?: string): Promise<Usage> {
  // 1) Globale
  const global = await safeFetchJSON(`/api/usage/current-chat`);
  if (global) {
    return {
      tokensIn: global.tokensIn ?? 0,
      tokensOut: global.tokensOut ?? 0,
      costTotal: global.costTotal ?? 0,
    };
  }

  // 2) Scoped per-conversazione (solo se abbiamo un id)
  if (conversationId) {
    const scoped = await safeFetchJSON(
      `/api/usage/current-chat?conversationId=${encodeURIComponent(conversationId)}`
    );
    if (scoped) {
      return {
        tokensIn: scoped.tokensIn ?? 0,
        tokensOut: scoped.tokensOut ?? 0,
        costTotal: scoped.costTotal ?? 0,
      };
    }
  }

  // 3) Fallback sicuro
  return { tokensIn: 0, tokensOut: 0, costTotal: 0 };
}
