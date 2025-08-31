// hooks/useConversations.ts
"use client";
import { useEffect, useRef, useState } from "react";
import { listConversations, createConversation as apiCreate, type Conv } from "../lib/api/conversations";
import { getMessagesByConversation, sendMessage } from "../lib/api/messages";
import { getCurrentChatUsage, type Usage } from "../lib/api/usage";

export type Bubble = { role: "user" | "assistant"; content: string; created_at?: string };

type Options = {
  onAssistantReply?: (text: string) => void; // per TTS o altre reazioni
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
  async function refreshUsage(convId?: string) {
    try {
      const u = await getCurrentChatUsage(convId);
      setUsage(u);
    } catch (e) {
      // Non blocchiamo l'app per usage; log silenzioso
      console.warn("refreshUsage error:", e);
    }
  }

  async function loadMessages(convId: string) {
    const items = await getMessagesByConversation(convId, 200);
    setBubbles(items);
  }

  async function ensureConversation(): Promise<Conv> {
    if (currentConv?.id) return currentConv;
    const autoTitle = autoTitleRome();

    try {
      const list = await listConversations(50);
      // Tollerante: match esatto o include (come nel tuo codice originale)
      const today = list.find((c) => c.title === autoTitle || c.title.includes(autoTitle));
      if (today) {
        setCurrentConv(today);
        await refreshUsage(today.id);
        return today;
      }
    } catch (e) {
      console.warn("Errore listConversations:", e);
    }

    const created = await apiCreate(autoTitle);
    setCurrentConv(created);
    await refreshUsage(created.id);
    return created;
  }

  async function createConversation(title: string) {
    const created = await apiCreate(title.trim());
    setCurrentConv(created);
    setBubbles([]);
    await refreshUsage(created.id);
  }

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
      await refreshUsage(conv.id);
    } catch (e: any) {
      setServerError(e?.message || "Errore server");
      setBubbles((b) => [
        ...b,
        { role: "assistant", content: "⚠️ Errore nel modello. Apri il pannello in alto per dettagli." },
      ]);
    }
  }

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
          await refreshUsage(today.id);
        }
      } catch (e) {
        console.log("Errore nel caricamento sessioni:", e);
      }
    };

    fetch("/api/model")
      .then((r) => r.json())
      .then((d) => setModelBadge(d?.model ?? "n/d"))
      .catch(() => setModelBadge("n/d"));

    loadTodaySession();
  }, []);

  // ---- Autoscroll su nuovi messaggi
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [bubbles]);

  // ---- Selezione conversazione dall’esterno (drawer)
  async function handleSelectConv(c: Conv) {
    setCurrentConv({ id: c.id, title: c.title });
    await loadMessages(c.id);
    await refreshUsage(c.id);
  }

  return {
    // stato
    bubbles, setBubbles,
    input, setInput,
    usage, serverError, modelBadge,
    currentConv, setCurrentConv,

    // refs/util
    taRef, threadRef,
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
