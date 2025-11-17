// hooks/useConversations.ts
"use client";
import { useEffect, useRef, useState } from "react";
import { listConversations, createConversation as apiCreate, type Conv } from "../lib/api/conversations";
import { getMessagesByConversation, sendMessage } from "../lib/api/messages";
import { getCurrentChatUsage, type Usage } from "../lib/api/usage";
import { supabase } from "../lib/supabase/client";
import { useCrypto } from "@/lib/crypto/CryptoProvider";

export type Bubble = { role: "user" | "assistant"; content: string; created_at?: string };

/**
 * Decifra i placeholder [CLIENT:uuid] o [CLIENT:uuid|enc|iv|bi] nella risposta dell'assistente
 */
export async function decryptClientPlaceholders(text: string): Promise<string> {
  console.log('🔍 [DECRYPT-START] ======================');
  console.log('🔍 [DECRYPT-START] Testo ricevuto (primi 200 char):', text.substring(0, 200));
  
  // Pattern esteso: [CLIENT:uuid] o [CLIENT:uuid|name_enc|name_iv|name_bi]
  const clientPattern = /\[CLIENT:([a-f0-9-]+)(?:\|([^|\]]+)\|([^|\]]+)\|([^|\]]+))?\]/g;
  const matches = [...text.matchAll(clientPattern)];
  
  console.log('🔍 [DECRYPT-START] Placeholder trovati:', matches.length);
  
  if (matches.length === 0) {
    console.log('🔍 [DECRYPT-START] Nessun placeholder, ritorno testo originale');
    return text;
  }
  
  // ✅ Protezione SSR
  if (typeof window === 'undefined') {
    console.log('🔍 [DECRYPT-SSR] Ambiente server, skip decriptazione');
    return text;
  }
  
  console.log('🔍 [DECRYPT-CRYPTO] Controllo CryptoService...');
  
  // Ottieni crypto service
  const crypto = (window as any).cryptoSvc;
  if (!crypto || typeof crypto.decryptFields !== 'function') {
    console.error('❌ [DECRYPT-CRYPTO] CryptoService non disponibile o manca decryptFields');
    console.log('🔍 [DECRYPT-CRYPTO] window.cryptoSvc:', crypto);
    return text;
  }
  
  console.log('✅ [DECRYPT-CRYPTO] CryptoService trovato');
  
  // ✅ WAIT: Aspetta che crypto sia unlocked (max 5 secondi)
  if (typeof crypto.isUnlocked === 'function' && !crypto.isUnlocked()) {
    console.warn('⏳ [DECRYPT-CRYPTO] CryptoService non ancora sbloccato, attendo...');
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (crypto.isUnlocked()) {
        console.log('✅ [DECRYPT-CRYPTO] CryptoService sbloccato dopo', i * 100, 'ms');
        break;
      }
    }
    if (!crypto.isUnlocked()) {
      console.error('❌ [DECRYPT-CRYPTO] Timeout: crypto non sbloccato dopo 5s');
      return text;
    }
  } else {
    console.log('✅ [DECRYPT-CRYPTO] CryptoService già sbloccato');
  }
  
  // ✅ WAIT: Assicurati che lo scope 'table:accounts' sia inizializzato
  try {
    console.log('🔍 [DECRYPT-SCOPE] Inizializzo scope table:accounts...');
    if (typeof crypto.getOrCreateScopeKeys === 'function') {
      await crypto.getOrCreateScopeKeys('table:accounts');
      console.log('✅ [DECRYPT-SCOPE] Scope inizializzato');
    }
  } catch (error) {
    console.error('❌ [DECRYPT-SCOPE] Errore inizializzazione scope:', error);
  }
  
  // Raggruppa UUID da recuperare (quelli senza dati inline)
  const uuidsToFetch: string[] = [];
  const matchesMap = new Map<string, RegExpMatchArray>();
  
  console.log('🔍 [DECRYPT-PARSE] Analizzo placeholder...');
  
  for (const match of matches) {
    const accountId = match[1];
    const hasInlineData = match[2] && match[3] && match[4];
    
    matchesMap.set(accountId, match);
    
    console.log('🔍 [DECRYPT-PARSE] Placeholder:', {
      accountId: accountId.substring(0, 8) + '...',
      hasInlineData,
      nameEnc: match[2] ? match[2].substring(0, 20) + '...' : null,
      nameIv: match[3] ? match[3].substring(0, 20) + '...' : null,
      nameBi: match[4] ? match[4].substring(0, 20) + '...' : null
    });
    
    if (!hasInlineData) {
      uuidsToFetch.push(accountId);
    }
  }
  
  console.log('🔍 [DECRYPT-PARSE] UUID da recuperare via API:', uuidsToFetch.length);
  
  // ✅ Recupera dati cifrati in batch tramite API
  let accountsData = new Map<string, any>();
  
  if (uuidsToFetch.length > 0) {
    console.log('🔍 [DECRYPT-API] Chiamo /api/accounts/decrypt-batch con', uuidsToFetch.length, 'UUID');
    
    try {
      const response = await fetch('/api/accounts/decrypt-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds: uuidsToFetch })
      });
      
      console.log('🔍 [DECRYPT-API] Response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ [DECRYPT-API] Batch fetch failed:', response.status);
      } else {
        const { accounts } = await response.json();
        console.log('✅ [DECRYPT-API] Fetched accounts:', accounts?.length);
        
        for (const acc of accounts || []) {
          accountsData.set(acc.id, acc);
          console.log('🔍 [DECRYPT-API] Account stored:', {
            id: acc.id.substring(0, 8) + '...',
            hasNameEnc: !!acc.name_enc,
            nameEncLength: acc.name_enc?.length,
            nameEncPrefix: acc.name_enc?.substring(0, 20),
            hasNameIv: !!acc.name_iv,
            hasNameBi: !!acc.name_bi
          });
        }
      }
    } catch (error) {
      console.error('❌ [DECRYPT-API] Batch fetch error:', error);
    }
  } else {
    console.log('✅ [DECRYPT-API] Tutti i placeholder hanno dati inline, skip API call');
  }
  
  let result = text;
  
  console.log('🔍 [DECRYPT-LOOP] Inizio decriptazione', matchesMap.size, 'placeholder');
  
  // Decifra ogni placeholder
  for (const [accountId, match] of matchesMap) {
    const placeholder = match[0];
    const nameEnc = match[2];
    const nameIv = match[3];
    const nameBi = match[4];
    
    console.log('🔍 [DECRYPT-LOOP] Processando:', {
      accountId: accountId.substring(0, 8) + '...',
      placeholder: placeholder.substring(0, 50) + '...',
      hasInlineData: !!(nameEnc && nameIv && nameBi)
    });
    
    try {
      let clientName: string;
      
      // Se ci sono dati cifrati inline, usali direttamente
      if (nameEnc && nameIv && nameBi) {
        console.log('✅ [DECRYPT-INLINE] Usando dati inline');
        
        const encryptedData = {
          id: accountId,
          name_enc: nameEnc,
          name_iv: nameIv,
          name_bi: nameBi
        };
        
        console.log('🔍 [DECRYPT-INLINE] Chiamo decryptFields...');
        
        const decrypted = await crypto.decryptFields(
          'table:accounts',
          'accounts',
          accountId,
          encryptedData,
          ['name']
        );
        
        console.log('✅ [DECRYPT-INLINE] Decriptato:', decrypted);
        clientName = decrypted.name || 'Cliente sconosciuto';
        
      } else {
        // Usa dati recuperati in batch
        console.log('🔍 [DECRYPT-BATCH] Cerco dati in accountsData...');
        const account = accountsData.get(accountId);
        console.log('🔍 [DECRYPT-BATCH] Account trovato:', {
          found: !!account,
          hasNameEnc: account?.name_enc ? true : false,
          accountData: account ? {
            id: account.id?.substring(0, 8) + '...',
            name_enc: account.name_enc?.substring(0, 20) + '...',
            name_iv: account.name_iv?.substring(0, 20) + '...',
            name_bi: account.name_bi?.substring(0, 20) + '...'
          } : null
        });
        
        if (!account || !account.name_enc) {
          console.warn(`❌ [DECRYPT-BATCH] Account ${accountId.substring(0, 8)}... non trovato o senza dati`);
          clientName = 'Cliente sconosciuto';
        } else {
          console.log('🔍 [DECRYPT-BATCH] Chiamo decryptFields...');
          
          try {
            const decrypted = await crypto.decryptFields(
              'table:accounts',
              'accounts',
              account.id,
              account,
              ['name']
            );
            
            console.log('✅ [DECRYPT-BATCH] Decriptato:', decrypted);
            clientName = decrypted.name || 'Cliente sconosciuto';
            
          } catch (error) {
            console.error('❌ [DECRYPT-BATCH] ERROR decryptFields:', error);
            console.error('❌ [DECRYPT-BATCH] Stack:', (error as Error).stack);
            clientName = 'Cliente sconosciuto';
          }
        }
      }
      
      // Sostituisci placeholder con nome reale
      console.log('✅ [DECRYPT-REPLACE] Sostituisco placeholder con:', clientName);
      result = result.replace(placeholder, clientName);
      
    } catch (error) {
      console.error(`❌ [DECRYPT-ERROR] Errore decifratura ${accountId.substring(0, 8)}...:`, error);
      console.error(`❌ [DECRYPT-ERROR] Stack:`, (error as Error).stack);
      result = result.replace(placeholder, 'Cliente sconosciuto');
    }
  }
  
  console.log('🔍 [DECRYPT-END] ======================');
  console.log('🔍 [DECRYPT-END] Risultato (primi 200 char):', result.substring(0, 200));
  
  return result;
}

type Options = {
  onAssistantReply?: (text: string) => void;
};

export function useConversations(opts: Options = {}) {
  const { onAssistantReply } = opts;
  const { ready } = useCrypto();

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [modelBadge, setModelBadge] = useState<string>("…");
  const [currentConv, setCurrentConv] = useState<Conv | null>(null);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const firstPaintRef = useRef(true);

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
    try {
      const hasTraffic = bubbles.length > 0;
      const u = await getCurrentChatUsage(hasTraffic ? convId : undefined);
      setUsage(u);
    } catch {
      // usage è best-effort
    }
  }

  async function loadMessages(convId: string) {
    console.log('📨 [LOAD-MSG] Inizio caricamento messaggi per conversazione:', convId);
    const items = await getMessagesByConversation(convId, 200);
    console.log('📨 [LOAD-MSG] Messaggi caricati:', items.length);
    
    const decryptedItems = await Promise.all(
      items.map(async (item, index) => {
        if (item.role === 'assistant' && item.content) {
          console.log(`📨 [LOAD-MSG] Decripto messaggio ${index + 1}/${items.length}`);
          const decrypted = await decryptClientPlaceholders(item.content);
          return { ...item, content: decrypted };
        }
        return item;
      })
    );
    
    console.log('📨 [LOAD-MSG] Fine decriptazione, aggiorno bubbles');
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

  async function send(content: string) {
    console.error("[useConversations.send] HIT - chiamata al modello generico", content);
    
    setServerError(null);
    const txt = content.trim();
    if (!txt) return;

    const conv = await ensureConversation();

    setBubbles((b) => [...b, { role: "user", content: txt }]);

    try {
      const replyText = await sendMessage({ 
        content: txt, 
        conversationId: conv.id, 
        terse: false 
      });
      
      // ❌ RIMOSSO: non decriptare qui - lascia che sia HomeClient a gestirlo
      // const decryptedReply = await decryptClientPlaceholders(replyText);
      
      // ✅ Aggiungi messaggio RAW con placeholder intatti
      setBubbles((b) => [...b, { role: "assistant", content: replyText }]);
      onAssistantReply?.(replyText);
      await refreshUsage(conv.id);
      
    } catch (e: any) {
      if (e?.status === 429) {
        const retry = Number(e?.details?.retryAfter) || 0;
        const hint = retry > 0
          ? `Quota OpenAI esaurita. Riprova tra ~${retry}s oppure controlla Billing.`
          : "Quota OpenAI esaurita. Controlla il piano/chiave (Billing).";
        setServerError(hint);
        setBubbles((b) => b.filter((m) => m.role !== "user" || m.content !== txt));
        return;
      }
      setServerError(e?.message || "Errore invio messaggio");
      setBubbles((b) => b.filter((m) => m.role !== "user" || m.content !== txt));
    }
  }

  async function sendDirectly(text: string) {
    await send(text);
  }

  async function switchConversation(convId: string) {
    const c = (await listConversations(100)).find((x) => x.id === convId);
    if (!c) return;
    setCurrentConv(c);
    await loadMessages(convId);
    await refreshUsage(convId);
  }

  async function deleteConversation(convId: string) {
    await supabase.from("conversations").delete().eq("id", convId);
    if (currentConv?.id === convId) {
      await ensureConversation();
    }
  }

  async function updateConversationTitle(convId: string, newTitle: string) {
    await supabase
      .from("conversations")
      .update({ title: newTitle })
      .eq("id", convId);

    if (currentConv?.id === convId) {
      setCurrentConv({ ...currentConv, title: newTitle });
    }
  }

  async function handleSelectConv(c: Conv) {
    setCurrentConv({ id: c.id, title: c.title });
    await loadMessages(c.id);
    await refreshUsage(c.id);
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/model");
        const { model } = await r.json();
        setModelBadge(model || "gpt-4o-mini");
      } catch {
        setModelBadge("?");
      }
    })();
  }, []);

  useEffect(() => {
    if (firstPaintRef.current) {
      firstPaintRef.current = false;
      return;
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bubbles]);

  return {
    bubbles,
    setBubbles,
    input,
    setInput,
    usage,
    serverError,
    setServerError,
    modelBadge,
    currentConv,
    setCurrentConv,
    taRef,
    threadRef,
    endRef,
    autoResize,
    autoTitleRome,
    ensureConversation,
    createConversation,
    loadMessages,
    send,
    sendDirectly,
    switchConversation,
    deleteConversation,
    updateConversationTitle,
    refreshUsage,
    handleSelectConv,
  };
}
