// lib/api/usage.ts
import { fetchJSON } from "./http";

export type Usage = { tokensIn: number; tokensOut: number; costTotal: number };
type UsageResponse = Partial<Usage> & { error?: string };

/** Riepilogo usage corrente (opz: per conversazione) */
export async function getCurrentChatUsage(conversationId?: string): Promise<Usage> {
  const q = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";
  const data = await fetchJSON<UsageResponse>(`/api/usage/current-chat${q}`);
  return {
    tokensIn: data.tokensIn ?? 0,
    tokensOut: data.tokensOut ?? 0,
    costTotal: data.costTotal ?? 0,
  };
}
