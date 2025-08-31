// lib/api/conversations.ts
import { fetchJSON } from "./http";

export type Conv = { id: string; title: string };

type ListResponse = { items: Conv[] };
type CreateResponse = { id?: string; title?: string; conversation?: Conv; item?: Conv };

/** Lista conversazioni (limite opzionale) */
export async function listConversations(limit = 50): Promise<Conv[]> {
  const data = await fetchJSON<ListResponse>(`/api/conversations/list?limit=${limit}`);
  return data.items ?? [];
}

/** Crea conversazione con titolo */
export async function createConversation(title: string): Promise<Conv> {
  const data = await fetchJSON<CreateResponse>(`/api/conversations/new`, {
    method: "POST",
    body: { title },
  });
  const id = data.id ?? data.conversation?.id ?? data.item?.id;
  const t = data.title ?? data.conversation?.title ?? data.item?.title ?? title;
  if (!id) throw new Error("ID conversazione mancante nella risposta");
  return { id, title: t };
}
