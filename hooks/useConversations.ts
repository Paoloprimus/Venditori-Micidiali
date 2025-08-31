"use client";
import { useEffect, useRef, useState } from "react";

export type Bubble = { role: "user" | "assistant"; content: string; created_at?: string };
export type Usage = { tokensIn: number; tokensOut: number; costTotal: number };
export type Conv = { id: string; title: string };

type Options = {
  onAssistantReply?: (text: string) => void;   // per TTS
};

export function useConversations(opts: Options = {}) {
  const { onAssistantReply } = opts;

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [modelBadge, setModelBadge] = useState<string>("…");
  const [currentConv, setCurrentConv] = useState<Conv | null>(null);

  // Refs utili
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

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

  async function refreshUsage(convId?: string) {
    const q = convId ? `?conversationId=${encodeURIComponent(convId)}` : "";
    const res = await fetch(`/api/usage/current-chat${q}`);
    const data = await res.json();
    if (!data?.error) setUsage({ tokensIn: data.tokensIn ?? 0, tokensOut: data.tokensOut ?? 0, costTotal: data.costTotal ?? 0 });
  }

  async function loadMessages(convId: string) {
    const q = new URLSearchParams({ conversationId: convId, limit: "200" });
    const res = await fetch(`/api/messages/by-conversation?${q.toString()}`);
    const data = await res.json();
    if (res.ok) {
      setBubbles((data.items || []).map((m: any) => ({ role: m.role, content: m.content, created_at: m.created_at })));
    } else {
      setBubbles([]);
    }
  }

  async function ensureConversation(): Promise<Conv> {
    if (currentConv?.id) return currentConv;
    const autoTitle = autoTitleRome();
    try {
      const res = await fetch(`/api/conversations/list?limit=50`);
      const data = await res.json();
      if (res.ok && data.items) {
        const todaySession = data.items.find((item: Conv) =>
          item.title === autoTitle || item.title.includes(autoTitle)
        );
        if (todaySession) {
          setCurrentConv(todaySession);
          await refreshUsage(todaySession.id);
          return todaySession;
        }
      }
    } catch (e) {
      console.log("Errore nel controllo sessioni esistenti:", e);
    }
    const res = await fetch("/api/conversations/new", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: autoTitle }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.details || data?.error || "Errore creazione automatica");
    const id = data?.id ?? data?.conversation?.id ?? data?.item?.id;
    const title = data?.title ?? data?.conversation?.title ?? data?.item?.title ?? autoTitle;
    if (!id) throw new Error("ID conversazione mancante nella risposta");
    const conv = { id, title };
    setCurrentConv(conv);
    await refreshUsage(id);
    return conv;
  }

  async function createConversation(title: string) {
    const t = title.trim();
    if (!t) return;
    const res = await fetch("/api/conversations/new", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Errore creazione conversazione");
    const id = data?.id ?? data?.conversation?.id ?? data?.item?.id;
    const finalTitle = data?.title ?? data?.conversation?.title ?? data?.item?.title ?? t;
    if (!id) throw new Error("ID conversazione mancante nella risposta");
    setCurrentConv({ id, title: finalTitle });
    setBubbles([]);
    await refreshUsage(id);
  }

  async function send(content: string) {
    setServerError(null);
    const txt = content.trim();
    if (!txt) return;
    let conv: Conv;
    try {
      conv = await ensureConversation();
    } catch (e: any) {
      throw new Error(e?.message || "Impossibile creare la conversazione");
    }
    const convId = conv.id;

    setBubbles((b) => [...b, { role: "user", content: txt }]);

    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: txt, terse: false, conversationId: convId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data?.details || data?.error || "Errore server");
      setBubbles((b) => [...b, { role: "assistant", content: "⚠️ Errore nel modello. Apri il pannello in alto per dettagli." }]);
      return;
    }
    const replyText = data.reply ?? "Ok.";
    setBubbles((b) => [...b, { role: "assistant", content: replyText }]);
    onAssistantReply?.(replyText);
    await refreshUsage(convId);
  }

  // Bootstrap iniziale
  useEffect(() => {
    const loadTodaySession = async () => {
      const todayTitle = autoTitleRome();
      try {
        const res = await fetch(`/api/conversations/list?limit=50`);
        const data = await res.json();
        if (res.ok && data.items) {
          const todaySession = data.items.find((item: Conv) => item.title === todayTitle);
          if (todaySession) {
            setCurrentConv(todaySession);
            await loadMessages(todaySession.id);
            await refreshUsage(todaySession.id);
          }
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

  // autoscroll thread
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [bubbles]);

  function handleSelectConv(c: Conv) {
    setCurrentConv({ id: c.id, title: c.title });
    loadMessages(c.id);
    refreshUsage(c.id);
  }

  return {
    // stato
    bubbles, setBubbles,
    input, setInput,
    usage, serverError, modelBadge,
    currentConv, setCurrentConv,

    // refs e utils
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
