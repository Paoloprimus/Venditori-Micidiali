// lib/api/usage.ts
import { fetchJSON, ApiError } from "./http";

export type Usage = { tokensIn: number; tokensOut: number; costTotal: number };
type UsageResponse = Partial<Usage> & { error?: string };

/**
 * Riepilogo usage corrente (opz: per conversazione).
 * Se l'API risponde 400/404 (es. INVALID_CONVERSATION), non tiriamo giù l'app:
 * ritorniamo semplicemente 0,0,0.
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
      // Es. INVALID_CONVERSATION o conversazione ancora senza usage registrato
      return { tokensIn: 0, tokensOut: 0, costTotal: 0 };
    }
    throw e; // altri errori li propaghiamo
  }
}
