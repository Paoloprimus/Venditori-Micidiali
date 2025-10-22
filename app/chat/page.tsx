"use client";

import { useState } from "react";
import { useConversation } from "../context/ConversationContext";
import { runChatTurn_v2 as runChatTurn } from "./planner";
import { toPlannerScope } from "@/lib/nlu/scope"; // adapter locale→planner

type ChatMsg = { role: "user" | "bot"; text: string };

// (opzionale e consentito) puoi lasciare questo named export se vuoi forzare dinamica:
// export const dynamic = "force-dynamic";

export default function ChatTestPage() {
  // includo anche setTopic per gestire il pulsante "global"
  const { state, expired, setScope, remember, reset, setTopic } = useConversation();

  // 👇 FINTA cifratura per la pagina di prova: niente import, niente hook
  const ready = true;
  const crypto = {
    decryptFields: async (_scope: string, _table: string, _id: string, row: any) => row,
  };

  const [log, setLog] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");

  async function onSend() {
    const text = input.trim();
    if (!text) return;

    setLog((l) => [...l, { role: "user", text }]);
    setInput("");

    try {
      // mappa lo scope locale ("prodotti","ordini","vendite") verso quello atteso dal planner ("products","orders","sales")
      const plannerState = {
        ...state,
        scope: toPlannerScope(state.scope as any),
      };

      // adapter per setScope: il planner parla inglese, noi riportiamo allo scope locale
      const plannerCtx = {
        state: plannerState,
        expired,
        setScope: (s: any) => {
          const back =
            s === "products" ? "prodotti" :
            s === "orders"   ? "ordini"   :
            s === "sales"    ? "vendite"  :
            "clients";
          setScope(back as any);
        },
        remember,
        reset,
      } as any;

      const res = await runChatTurn(text, plannerCtx, crypto);
      setLog((l) => [...l, { role: "bot", text: res.text }]);
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

        <div className="text-sm text-green-700">
          Cifratura: <b>{ready ? "simulata (OK per test)" : "non pronta"}</b>
        </div>

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
          {/* "global": non imposta uno scope invalido, azzera solo il topic attivo */}
          <button
            className="text-sm px-2 py-1 rounded border bg-white hover:bg-gray-50"
            onClick={() => setTopic(null)}
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
      </div>
    </div>
  );
}
