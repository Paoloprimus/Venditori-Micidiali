// lib/api/messages.ts
import { fetchJSON } from "./http";

export type Message = { role: "user" | "assistant"; content: string; created_at?: string };

type ByConvResponse = { items: Message[] };
type SendResponse = { reply?: string };

/** Messaggi per conversazione */
export async function getMessagesByConversation(conversationId: string, limit = 200): Promise<Message[]> {
  const qs = new URLSearchParams({ conversationId, limit: String(limit) });
  const data = await fetchJSON<ByConvResponse>(`/api/messages/by-conversation?${qs.toString()}`);
  return data.items ?? [];
}

/** Invia messaggio utente e ottiene reply assistant */
export async function sendMessage(params: { content: string; conversationId: string; terse?: boolean }): Promise<string> {
  const data = await fetchJSON<SendResponse>(`/api/messages/send`, {
    method: "POST",
    body: { content: params.content, terse: !!params.terse, conversationId: params.conversationId },
  });
  return data.reply ?? "Ok.";
}
