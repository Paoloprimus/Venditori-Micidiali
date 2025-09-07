// lib/voice/dispatch.ts
import type { Intent } from './intents';

export function speak(text: string) {
  if (typeof window === 'undefined') return;
  const s = window.speechSynthesis;
  if (!s) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'it-IT';
  s.cancel();
  s.speak(utt);
}

export async function handleIntent(intent: Intent): Promise<boolean> {
  try {
    switch (intent.type) {
      case 'CLIENT_CREATE': {
        const res = await fetch('/api/clients/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: intent.name ?? '' }),
        });
        const data = await res.json();
        if (res.ok) speak(`Cliente ${intent.name ?? 'senza nome'} creato.`);
        else speak(`Errore creazione cliente: ${data?.error ?? 'sconosciuto'}.`);
        return true;
      }

      case 'CLIENT_SEARCH': {
        const res = await fetch(`/api/clients/search?q=${encodeURIComponent(intent.query)}`);
        const data = await res.json();
        if (!res.ok) { speak(`Errore nella ricerca: ${data?.error ?? 'sconosciuto'}.`); return true; }
        const items = (data?.items ?? []) as Array<{ id: string; name: string }>;
        if (items.length === 0) speak(`Nessun cliente trovato per ${intent.query}.`);
        else speak(`Trovati ${items.length} risultati. Primo: ${items[0].name}.`);
        return true;
      }

      case 'CLIENT_UPDATE': {
        // qui potrai aprire una pagina /accounts/[id]/edit quando sarà pronta
        speak(`Apro la modifica per ${intent.name}.`);
        if (typeof window !== 'undefined') window.location.href = `/tools/quick-add`;
        return true;
      }

      case 'NOTES_SEARCH': {
        const url = `/api/clients/notes-search?account=${encodeURIComponent(intent.accountHint)}&topic=${encodeURIComponent(intent.topic)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) { speak(`Errore nella ricerca note: ${data?.error ?? 'sconosciuto'}.`); return true; }
        const hits: Array<{ snippet: string }> = data?.items ?? [];
        if (hits.length === 0) speak(`Nessuna nota su ${intent.topic} per ${intent.accountHint}.`);
        else speak(`Risulta: ${hits[0].snippet}`);
        return true;
      }

      default:
        return false;
    }
  } catch {
    speak('Si è verificato un errore imprevisto.');
    return true;
  }
}
