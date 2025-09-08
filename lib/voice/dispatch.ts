// lib/voice/dispatch.ts
import type { Intent } from "./intents";

export type HandleResult = {
  ok: boolean;
  message?: string;
  data?: any;
};

/**
 * DEPRECATA: non parliamo più da qui.
 * L'audio viene gestito a livello UI (HomeClient/useTTS) e
 * rispettando il toggle Altoparlante.
 */
export function speak(_text: string) {
  // no-op
}

export async function handleIntent(intent: Intent): Promise<HandleResult> {
  try {
    switch (intent.type) {
      case "CLIENT_CREATE": {
        const res = await fetch("/api/clients/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: intent.name ?? "" }),
        });
        const data = await res.json().catch(() => null);
        const ok = res.ok;
        const message = ok
          ? `Cliente ${intent.name ?? "senza nome"} creato.`
          : `Errore creazione cliente: ${data?.error ?? "sconosciuto"}.`;
        // non forziamo TTS qui
        return { ok, message, data };
      }

      case "CLIENT_SEARCH": {
        const res = await fetch(`/api/clients/search?q=${encodeURIComponent(intent.query)}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message = `Errore nella ricerca: ${data?.error ?? "sconosciuto"}.`;
          return { ok: false, message, data };
        }
        const items = (data?.items ?? []) as Array<{ id: string; name: string }>;
        const message =
          items.length === 0
            ? `Nessun cliente trovato per ${intent.query}.`
            : `Trovati ${items.length} risultati. Primo: ${items[0].name}.`;
        return { ok: true, message, data: { items } };
      }

      case "CLIENT_UPDATE": {
        // In futuro potrai passare l'id corretto; per ora apre la pagina di quick-add.
        const message = `Apro la modifica per ${intent.name}.`;
        if (typeof window !== "undefined") window.location.href = `/tools/quick-add`;
        return { ok: true, message };
      }

      case "NOTES_SEARCH": {
        const url = `/api/clients/notes-search?account=${encodeURIComponent(
          intent.accountHint
        )}&topic=${encodeURIComponent(intent.topic)}`;
        const res = await fetch(url);
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message = `Errore nella ricerca note: ${data?.error ?? "sconosciuto"}.`;
          return { ok: false, message, data };
        }
        const hits: Array<{ snippet: string }> = data?.items ?? [];
        const message =
          hits.length === 0
            ? `Nessuna nota su ${intent.topic} per ${intent.accountHint}.`
            : `Risulta: ${hits[0].snippet}`;
        return { ok: true, message, data: { hits } };
      }

      default:
        return { ok: false };
    }
  } catch {
    const message = "Si è verificato un errore imprevisto.";
    return { ok: false, message };
  }
}
