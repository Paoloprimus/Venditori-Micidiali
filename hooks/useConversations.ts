// hooks/useConversations.ts
"use client";
import { useEffect, useRef, useState } from "react";
import { listConversations, createConversation as apiCreate, type Conv } from "../lib/api/conversations";
import { getMessagesByConversation, sendMessage } from "../lib/api/messages";
import { getCurrentChatUsage, type Usage } from "../lib/api/usage";
import { supabase } from "../lib/supabase/client";

export type Bubble = { role: "user" | "assistant"; content: string; created_at?: string };

/**
 * Decifra i placeholder [CLIENT:uuid] o [CLIENT:uuid|enc|iv|bi] nella risposta dell'assistente
 */
async function decryptClientPlaceholders(text: string): Promise<string> {
  // Pattern esteso: [CLIENT:uuid] o [CLIENT:uuid|name_enc|name_iv|name_bi]
  const clientPattern = /\[CLIENT:([a-f0-9-]+)(?:\|([^|\]]+)\|([^|\]]+)\|([^|\]]+))?\]/g;
  const matches = [...text.matchAll(clientPattern)];
  
  if (matches.length === 0) return text;
  
  // Ottieni crypto service
  const crypto = (window as any).cryptoSvc;
  if (!crypto || typeof crypto.decryptFields !== 'function') {
    console.warn('[decryptClientPlaceholders] CryptoService non disponibile');
    return text;
  }
  
  // Raggruppa UUID da recuperare (quelli senza dati inline)
  const uuidsToFetch: string[] = [];
  const matchesMap = new Map<string, RegExpMatchArray>();
  
  for (const match of matches) {
    const accountId = match[1];
    const hasInlineData = match[2] && match[3] && match[4];
    
    matchesMap.set(accountId, match);
    
    if (!hasInlineData) {
      uuidsToFetch.push(accountId);
    }
  }
  
  // ✅ Recupera dati cifrati in batch tramite API
  let accountsData = new Map<string, any>();
  
  if (uuidsToFetch.length > 0) {
    try {
      const response = await fetch('/api/accounts/decrypt-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds: uuidsToFetch })
      });
      
      if (!response.ok) {
        console.error('[decryptClientPlaceholders] Batch fetch failed:', response.status);
      } else {
        const { accounts } = await response.json();
        console.log('🔍 [API] Fetched accounts:', accounts?.length, accounts);
        
        for (const acc of accounts || []) {
          accountsData.set(acc.id, acc);
        }
      }
    } catch (error) {
      console.error('[decryptClientPlaceholders] Batch fetch error:', error);
    }
  }
  
  let result = text;
  
  // Decifra ogni placeholder
  for (const [accountId, match] of matchesMap) {
    const placeholder = match[0];
    const nameEnc = match[2];
    const nameIv = match[3];
    const nameBi = match[4];  // ✅ name_bi (tag per GCM)
    
    try {
      let clientName: string;
      
      // Se ci sono dati cifrati inline, usali direttamente
      if (nameEnc && nameIv && nameBi) {
        const encryptedData = {
          id: accountId,
          name_enc: nameEnc,
          name_iv: nameIv,
          name_bi: nameBi  // ✅ Usa name_bi
        };
        
        const decrypted = await crypto.decryptFields(
          'table:accounts',
          'accounts',
          accountId,  // ✅ FIX: passa ID invece di stringa vuota
          encryptedData,
          ['name']
        );
        
        clientName = decrypted.name || 'Cliente sconosciuto';
        
      } else {
        // Usa dati recuperati in batch
        const account = accountsData.get(accountId);
        console.log('🔍 [DECRYPT] Account data:', accountId, account);
        
        if (!account || !account.name_enc) {
          console.warn(`[decryptClientPlaceholders] Account ${accountId} non trovato o senza dati`);
          clientName = 'Cliente sconosciuto';
        } else {
          console.log('🔍 [DECRYPT] Calling decryptFields...');
          
          try {
            const decrypted = await crypto.decryptFields(
              'table:accounts',
              'accounts',
              account.id,  // ✅ FIX: passa ID invece di stringa vuota
              account,
              ['name']
            );
            
            console.log('🔍 [DECRYPT] Result:', decrypted);
            clientName = decrypted.name || 'Cliente sconosciuto';
            
          } catch (error) {
            console.error('🔴 [DECRYPT] ERROR:', error);
            clientName = 'Cliente sconosciuto';
          }
        }
      }
      
      // Sostituisci placeholder con nome reale
      result = result.replace(placeholder, clientName);
      
    } catch (error) {
      console.error(`[decryptClientPlaceholders] Errore decifratura ${accountId}:`, error);
      result = result.replace(placeholder, 'Cliente sconosciuto');
    }
  }
  
  return result;
}

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
  const endRef = useRef<HTMLDivElement>(null);
  const firstPaintRef = useRef(true);

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
      const hasTraffic = bubbles.length > 0;
      const u = await getCurrentChatUsage(hasTraffic ? convId : undefined);
      setUsage(u);
    } catch {
      // usage è best-effort
    }
  }

  async function loadMessages(convId: string) {
    const items = await getMessagesByConversation(convId, 200);
    
    // ✅ Decifra placeholder nei messaggi assistant
    const decryptedItems = await Promise.all(
      items.map(async (item) => {
        if (item.role === 'assistant' && item.content) {
          const decrypted = await decryptClientPlaceholders(item.content);
          return { ...item, content: decrypted };
        }
        return item;
      })
    );
    
    setBubbles(decryptedItems);
  }

  async function ensureConversation(): Promise<Conv> {
    if (currentConv?.id) return currentConv;
    const autoTitle = autoTitleRome();

    try {
      const list = await listConversations(50);
      const today = list.find((c) => c.title === autoTitle || c.title.includes(autoTitle));
      if (today) {
        setCurrentConv(today);
        await loadMessages(today.id);
        await refreshUsage(today.id);
        return today;
      }
    } catch {
      // silenzio
    }

    const created = await apiCreate(autoTitle);
    setCurrentConv(created);
    setBubbles([]);
    await refreshUsage(created.id);
    return created;
  }

  async function createConversation(title: string) {
    const created = await apiCreate(title.trim());
    setCurrentConv(created);
    setBubbles([]);
    await refreshUsage(created.id);
  }

  /**
   * send - SOLO modello generico
   * Il planner è gestito da submitFromComposer in HomeClient
   */
  async function send(content: string) {
    console.error("[useConversations.send] HIT - chiamata al modello generico", content);
    
    setServerError(null);
    const txt = content.trim();
    if (!txt) return;

    const conv = await ensureConversation();

    // Bubble utente ottimistica
    setBubbles((b) => [...b, { role: "user", content: txt }]);

    try {
      const replyText = await sendMessage({ 
        content: txt, 
        conversationId: conv.id, 
        terse: false 
      });
      
      // ✅ Decifra eventuali placeholder [CLIENT:uuid] prima di mostrare
      const decryptedReply = await decryptClientPlaceholders(replyText);
      
      setBubbles((b) => [...b, { role: "assistant", content: decryptedReply }]);
      onAssistantReply?.(decryptedReply);
      await refreshUsage(conv.id);
      
    } catch (e: any) {
      // Gestione errori 429
      if (e?.status === 429) {
        const retry = Number(e?.details?.retryAfter) || 0;
        const hint = retry > 0
          ? `Quota OpenAI esaurita. Riprova tra ~${retry}s oppure controlla Billing.`
          : "Quota OpenAI esaurita. Controlla il piano/chiave (Billing).";
        setServerError(hint);
        setBubbles((b) => [...b, { role: "assistant", content: "⚠️ " + hint }]);
        return;
      }

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

  // ---- Autoscroll
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
          threadRef.current.scrollTop = threadRef.current.scrollHeight;
        }
      }
    });
  }, [bubbles]);

  // ---- Selezione conversazione
  async function handleSelectConv(c: Conv) {
    setCurrentConv({ id: c.id, title: c.title });
    await loadMessages(c.id);
    await refreshUsage(c.id);
  }

  return {
    // stato
    bubbles,
    setBubbles,
    input,
    setInput,
    usage,
    serverError,
    modelBadge,
    currentConv,
    setCurrentConv,

    // refs/util
    taRef,
    threadRef,
    endRef,
    autoResize,
    autoTitleRome,

    // azioni
    ensureConversation,
    createConversation,
    loadMessages,
    refreshUsage,
    send, // ⬅️ ora chiama SOLO il modello generico
    handleSelectConv,
  };
}
