// hooks/useConversations.ts
"use client";
import { useEffect, useRef, useState } from "react";
import { listConversations, createConversation as apiCreate, type Conv } from "../lib/api/conversations";
import { getMessagesByConversation, sendMessage } from "../lib/api/messages";
import { getCurrentChatUsage, type Usage } from "../lib/api/usage";

export type Bubble = { role: "user" | "assistant"; content: string; created_at?: string };

type Options = {
  onAssistantReply?: (text: string) => void; // es: TTS o side-effects
};

export function useConversations(opts: Options = {}) {
  const { onAssistantReply } = opts;

  // ---- Stato
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [modelBadge, setModelBadge] = useState<string>("…");
  const [currentConv, setCurrentConv] = useState<Conv | null>(null);

  // ---- Refs UI
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);   // ✅ sentinel in fondo al thread
  const firstPaintRef = useRef(true);            // evita animazione al primo render

  // ---- Utils
  function autoTitleRome() {
    const fmt = new Intl.DateTimeFormat("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      timeZone: "Europe/Rome",
    });
    return fmt.format(new Date()).toLowerCase().replace(/\./g, "");
  }

  function autoResize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 164;
    el.style.height = Math.min(el.scrollHeight, max) + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }

  // ---- API wrappers
  /**
   * refreshUsage
   * - Se bubbles è vuoto, chiedi l'usage GLOBALE (evita 400).
   * - Se c'è traffico, prova lo scoped per-conversazione.
   */
  async function refreshUsage(convId?: string) {
    try {
      const hasTraffic = bubbles.length > 0;
      const u = await getCurrentChatUsage(hasTraffic ? convId : undefined);
      setUsage(u);
    } catch {
      // usage è best-effort: non sporcare la console
    }
  }

  async function loadMessages(convId: string) {
    const items = await getMessagesByConversation(convId, 200);
    setBubbles(items);
  }

  /**
   * ensureConversation
   * - Trova la conversazione di oggi (match esatto o include).
   * - Se non esiste, la crea.
   * - Dopo selezione/creazione: usage GLOBALE finché non c'è traffico.
   */
  async function ensureConversation(): Promise<Conv> {
    if (currentConv?.id) return currentConv;
    const autoTitle = autoTitleRome();

    try {
      const list = await listConversations(50);
      const today = list.find((c) => c.title === autoTitle || c.title.includes(autoTitle));
      if (today) {
        setCurrentConv(today);
        await loadMessages(today.id);
        await refreshUsage(today.id); // globale se vuota, scoped se già ha messaggi
        return today;
      }
    } catch {
      // silenzio
    }

    const created = await apiCreate(autoTitle);
    setCurrentConv(created);
    setBubbles([]);
    await refreshUsage(created.id); // globale (nessun traffico ancora)
    return created;
  }

  async function createConversation(title: string) {
    const created = await apiCreate(title.trim());
    setCurrentConv(created);
    setBubbles([]);
    await refreshUsage(created.id); // globale
  }

  /**
   * send
   * - Aggiunge il messaggio utente.
   * - Manda al backend e aggiunge la reply.
   * - SOLO DOPO il primo scambio chiede usage per-conv (ora l'API ha conteggi).
   */
  async function send(content: string) {
    setServerError(null);
    const txt = content.trim();
    if (!txt) return;

    const conv = await ensureConversation();
    setBubbles((b) => [...b, { role: "user", content: txt }]);

    try {
      const replyText = await sendMessage({ content: txt, conversationId: conv.id, terse: false });
      setBubbles((b) => [...b, { role: "assistant", content: replyText }]);
      onAssistantReply?.(replyText);
      await refreshUsage(conv.id); // ORA sì: per-conv (hasTraffic = true)
    } catch (e: any) {
      // 429: quota/rate limit → messaggio chiaro
      if (e?.status === 429) {
        const retry = Number(e?.details?.retryAfter) || 0;
        const hint =
          retry > 0
            ? `Quota OpenAI esaurita. Riprova tra ~${retry}s oppure controlla Billing.`
            : "Quota OpenAI esaurita. Controlla il piano/chiave (Billing).";
        setServerError(hint);
        setBubbles((b) => [
          ...b,
          { role: "assistant", content: "⚠️ " + hint },
        ]);
        return;
      }

      setServerError(e?.message || "Errore server");
      setBubbles((b) => [
        ...b,
        { role: "assistant", content: "⚠️ Errore nel modello. Apri il pannello in alto per dettagli." },
      ]);
    }
  } // ← chiusura send()

  // ---- Bootstrap
  useEffect(() => {
    const loadTodaySession = async () => {
      const todayTitle = autoTitleRome();
      try {
        const list = await listConversations(50);
        const today = list.find((c) => c.title === todayTitle);
        if (today) {
          setCurrentConv(today);
          await loadMessages(today.id);
          await refreshUsage(today.id); // globale se vuota, scoped se già ha messaggi
        }
      } catch {
        // silenzio
      }
    };

    fetch("/api/model")
      .then((r) => r.json())
      .then((d) => setModelBadge(d?.model ?? "n/d"))
      .catch(() => setModelBadge("n/d"));

    loadTodaySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Autoscroll SEMPRE all'ultimo messaggio
  useEffect(() => {
    const sentinel = endRef.current;
    if (!sentinel) return;
    const behavior: ScrollBehavior = firstPaintRef.current ? "auto" : "smooth";
    firstPaintRef.current = false;
    requestAnimationFrame(() => {
      try {
        sentinel.scrollIntoView({ behavior, block: "end" });
      } catch {
        if (threadRef.current) {
          (threadRef.current as HTMLDivElement).scrollTop = (threadRef.current as HTMLDivElement).scrollHeight;
        }
      }
    });
  }, [bubbles]);

  // ---- Selezione conversazione (drawer)
  async function handleSelectConv(c: Conv) {
    setCurrentConv({ id: c.id, title: c.title });
    await loadMessages(c.id);
    await refreshUsage(c.id); // globale se vuota, scoped se ha messaggi
  }

  return {
    // stato
    bubbles, setBubbles,
    input, setInput,
    usage, serverError, modelBadge,
    currentConv, setCurrentConv,

    // refs/util
    taRef, threadRef, endRef,   // ✅ esportiamo anche endRef
    autoResize, autoTitleRome,

    // azioni
    ensureConversation,
    createConversation,
    loadMessages,
    refreshUsage,
    send,
    handleSelectConv,
  };
}
