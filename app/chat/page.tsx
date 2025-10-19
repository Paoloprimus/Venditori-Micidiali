"use client";

import { useState } from "react";
import { useConversation } from "../context/ConversationContext";
import { runChatTurn } from "./planner";
// ⬇️ IMPORT: se il tuo hook è in un percorso diverso, aggiorna questa riga
// import { useCrypto } from "../lib/crypto/useCrypto";
const ready = false as const;
const crypto = null;



type ChatMsg = { role: "user" | "bot"; text: string };

export default function ChatTestPage() {
  const { state, expired, setScope, remember, reset } = useConversation();
  const { ready, crypto } = useCrypto();

  const [log, setLog] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");

  async function onSend() {
    const text = input.trim();
    if (!text) return;

    setLog((l) => [...l, { role: "user", text }]);
    setInput("");

    try {
      const res = await runChatTurn(text, { state, expired, setScope, remember, reset }, ready ? crypto : null);
      setLog((l) => [...l, { role: "bot", text: res.text }]);
      // Debug utile in console
      // eslint-disable-next-line no-console
      console.debug("[planner result]", res);
    } catch (e: any) {
      setLog((l) => [...l, { role: "bot", text: "Errore: " + (e?.message ?? "sconosciuto") }]);
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onSend();
  }

  return (
    <div className="p-6 mx-auto max-w-5xl grid md:grid-cols-2 gap-6">
      {/* --- COLONNA CHAT --- */}
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Chat di prova (motore semantico)</h1>

        {/* Stato cifratura */}
        <div className={`text-sm ${ready ? "text-green-700" : "text-orange-700"}`}>
          Cifratura: <b>{ready ? "sbloccata" : "non pronta"}</b>
        </div>

        {/* Log messaggi */}
        <div className="border rounded-lg h-[420px] overflow-auto bg-white p-3">
          {log.length === 0 && (
            <div className="text-gray-500 text-sm">
              Suggerimenti: “Quanti clienti ho?”, poi “Come si chiamano?”, poi “E le email?”
            </div>
          )}
          {log.map((m, i) => (
            <div key={i} className={`my-1 ${m.role === "user" ? "text-right" : "text-left"}`}>
              <span
                className={`inline-block px-3 py-2 rounded-lg ${
                  m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                }`}
              >
                {m.text}
              </span>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder='Scrivi e premi Invio… (es. "Quanti clienti ho?")'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button onClick={onSend} className="border rounded-lg px-4 py-2 bg-blue-600 text-white">
            Invia
          </button>
        </div>
      </div>

      {/* --- COLONNA DEBUG --- */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Debug contesto</h2>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm px-2 py-1 rounded border bg-white">
            scope: <b>{state.scope}</b>
          </span>
          <span className={`text-sm px-2 py-1 rounded border ${expired ? "bg-red-50" : "bg-white"}`}>
            expired: <b>{String(expired)}</b>
          </span>
          <span className="text-sm px-2 py-1 rounded border bg-white">
            ultimo_intent: <b>{state.ultimo_intent ?? "—"}</b>
          </span>
          <button
            className="text-sm px-2 py-1 rounded border bg-white hover:bg-gray-50"
            onClick={() => setScope("clients")}
          >
            scope → clients
          </button>
          <button
            className="text-sm px-2 py-1 rounded border bg-white hover:bg-gray-50"
            onClick={() => setScope("prodotti")}
          >
            scope → prodotti
          </button>
          <button
            className="text-sm px-2 py-1 rounded border bg-white hover:bg-gray-50"
            onClick={() => setScope("global")}
          >
            scope → global
          </button>
          <button
            className="text-sm px-2 py-1 rounded border bg-white hover:bg-gray-50"
            onClick={() => reset()}
          >
            /reset (azzera contesto)
          </button>
        </div>

        {/* Stato completo (solo lettura) */}
        <pre className="text-xs border rounded bg-gray-50 p-3 overflow-auto max-h-[260px]">
{JSON.stringify(
  {
    scope: state.scope,
    topic_attivo: state.topic_attivo,
    ultimo_intent: state.ultimo_intent,
    entita_correnti: state.entita_correnti,
    ultimo_risultato: state.ultimo_risultato,
    updated_at: state.updated_at,
  },
  null,
  2
)}
        </pre>

        {/* Istruzioni rapide */}
        <div className="text-sm text-gray-700">
          <p className="mb-1 font-medium">Istruzioni:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              Se la cifratura non è pronta, sblocca l&apos;accesso (login / unlock) e riprova: le funzioni usano i dati
              reali di Supabase con decifratura client-side.
            </li>
            <li>
              Esempio percorso: <code>/chat</code> — questa pagina non modifica l&apos;UI esistente e la puoi eliminare
              in ogni momento.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
