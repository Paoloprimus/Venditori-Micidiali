// lib/api/usage.ts
import { fetchJSON, ApiError } from "./http";

export type Usage = { tokensIn: number; tokensOut: number; costTotal: number };
type UsageResponse = Partial<Usage> & { error?: string };

/**
 * Riepilogo usage corrente.
 * - Se passi conversationId prova prima per-conversazione.
 * - Se il server risponde 400/404 (es. INVALID_CONVERSATION o nessun usage registrato),
 *   si riprova senza conversationId (usage globale).
 * - In caso di ulteriore errore, si ritorna 0,0,0 per evitare di bloccare l'app.
 */
export async function getCurrentChatUsage(conversationId?: string): Promise<Usage> {
  const q = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";

  try {
    const data = await fetchJSON<UsageResponse>(`/api/usage/current-chat${q}`);
    return {
      tokensIn: data.tokensIn ?? 0,
      tokensOut: data.tokensOut ?? 0,
      costTotal: data.costTotal ?? 0,
    };
  } catch (e: any) {
    if (e instanceof ApiError && (e.status === 400 || e.status === 404)) {
      // INVALID_CONVERSATION o nessun usage per quella conversazione: fallback al globale
      try {
        const data = await fetchJSON<UsageResponse>(`/api/usage/current-chat`);
        return {
          tokensIn: data.tokensIn ?? 0,
          tokensOut: data.tokensOut ?? 0,
          costTotal: data.costTotal ?? 0,
        };
      } catch {
        return { tokensIn: 0, tokensOut: 0, costTotal: 0 };
      }
    }
    // altri errori: prova a non rompere l'UI
    return { tokensIn: 0, tokensOut: 0, costTotal: 0 };
  }
}
