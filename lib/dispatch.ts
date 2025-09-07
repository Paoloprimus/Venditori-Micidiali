// lib/voice/dispatch.ts
import { Intent } from './intents';

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
        if (!intent.name) {
          speak('Dimmi il nome del nuovo cliente.');
          return true;
        }
        // crea subito un cliente minimale (solo nome). Campi extra li puoi dettare dopo.
        const res = await fetch('/api/clients/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: intent.name }),
        });
        const data = await res.json();
        if (res.ok) {
          speak(`Cliente ${intent.name} creato. Vuoi aggiungere dettagli?`);
        } else {
          speak(`Errore nella creazione del cliente: ${data?.error ?? 'sconosciuto'}.`);
        }
        return true;
      }

      case 'CLIENT_SEARCH': {
        if (!intent.query) {
          speak('Dimmi cosa cercare, per esempio: cerca cliente Rossi.');
          return true;
        }
        const res = await fetch(`/api/clients/search?q=${encodeURIComponent(intent.query)}`);
        const data = await res.json();
        if (!res.ok) {
          speak(`Errore nella ricerca: ${data?.error ?? 'sconosciuto'}.`);
          return true;
        }
        const items = (data?.items ?? []) as Array<{ id: string; name: string }>;
        if (items.length === 0) {
          speak(`Nessun cliente trovato per ${intent.query}.`);
        } else {
          const first = items[0];
          speak(`Ho trovato ${items.length} risultati. Primo: ${first.name}. Vuoi aprirlo?`);
          // TODO (facoltativo): se l'utente dice "sì", naviga a /accounts/[id]
        }
        return true;
      }

      case 'CLIENT_UPDATE': {
        if (!intent.name) {
          speak('Dimmi quale cliente vuoi modificare.');
          return true;
        }
        // Per semplicità: apri la pagina di modifica (UI) se l’hai, altrimenti usa quick-add
        // Navigazione lato client (se chiamato da un componente client): window.location.href = ...
        speak(`Apro la scheda di ${intent.name}.`);
        if (typeof window !== 'undefined') {
          window.location.href = `/tools/quick-add`; // oppure: /accounts/edit?name=...
        }
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
