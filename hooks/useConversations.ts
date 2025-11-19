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
    // 🔥 FORZA reload scope dal DB (ignora cache)
    console.log('🔍 [DECRYPT-SCOPE] FORZO reset cache scope...');
    if ((crypto as any).scopeCache) {
      delete (crypto as any).scopeCache['table:accounts'];
      console.log('✅ [DECRYPT-SCOPE] Cache scope cancellata');
    }
    
    console.log('🔍 [DECRYPT-SCOPE] Inizializzo scope table:accounts...');
    if (typeof crypto.getOrCreateScopeKeys === 'function') {
      await crypto.getOrCreateScopeKeys('table:accounts');
      console.log('✅ [DECRYPT-SCOPE] Scope inizializzato dal DB');
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
  
  // ✅ Recupera dati cifrati in batch tramite QUERY DIRETTA (come fa /clients)
  let accountsData = new Map<string, any>();
  
  if (uuidsToFetch.length > 0) {
    console.log('🔍 [DECRYPT-DB] Query diretta a Supabase per', uuidsToFetch.length, 'UUID');
    
    try {
      // Query diretta come in /clients/page.tsx
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name_enc, name_iv, name_bi')
        .in('id', uuidsToFetch);
      
      if (error) {
        console.error('❌ [DECRYPT-DB] Supabase error:', error);
      } else {
        console.log('✅ [DECRYPT-DB] Fetched accounts:', data?.length);
        
        // Converti hex a base64 usando lo STESSO metodo di /clients
        const hexToBase64 = (hexStr: any): string => {
          if (!hexStr || typeof hexStr !== 'string') return '';
          if (!hexStr.startsWith('\\x')) return hexStr; // Se NON è hex, ritorna così com'è
          
          const hex = hexStr.slice(2);
          const bytes = hex.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
          return bytes;
        };
        
        for (const acc of data || []) {
          // Converti hex -> base64 prima di memorizzare
          const converted = {
            id: acc.id,
            name_enc: hexToBase64(acc.name_enc),
            name_iv: hexToBase64(acc.name_iv),
            name_bi: hexToBase64(acc.name_bi)
          };
          
          accountsData.set(acc.id, converted);
          console.log('🔍 [DECRYPT-DB] Account stored:', {
            id: acc.id.substring(0, 8) + '...',
            hasNameEnc: !!converted.name_enc,
            nameEncLength: converted.name_enc?.length,
            nameEncPrefix: converted.name_enc?.substring(0, 20),
            hasNameIv: !!converted.name_iv,
            hasNameBi: !!converted.name_bi
          });
        }
      }
    } catch (error) {
      console.error('❌ [DECRYPT-DB] Batch fetch error:', error);
    }
  } else {
    console.log('✅ [DECRYPT-DB] Tutti i placeholder hanno dati inline, skip DB query');
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
          console.log('🔍 [DECRYPT-BATCH] Account RAW prima di decryptFields:');
          console.log('🔍 [DECRYPT-BATCH] - account.id:', account.id);
          console.log('🔍 [DECRYPT-BATCH] - account.name_enc:', account.name_enc);
          console.log('🔍 [DECRYPT-BATCH] - account.name_iv:', account.name_iv);
          console.log('🔍 [DECRYPT-BATCH] - typeof name_enc:', typeof account.name_enc);
          console.log('🔍 [DECRYPT-BATCH] - typeof name_iv:', typeof account.name_iv);
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
            console.log('🔍 [DECRYPT-BATCH] Keys dell\'oggetto:', Object.keys(decrypted));
            console.log('🔍 [DECRYPT-BATCH] Valori:', Object.values(decrypted));
            console.log('🔍 [DECRYPT-BATCH] decrypted.name =', decrypted.name);
            console.log('🔍 [DECRYPT-BATCH] typeof decrypted.name =', typeof decrypted.name);
            
            // Provo a prendere la prima chiave disponibile
            const firstKey = Object.keys(decrypted)[0];
            console.log('🔍 [DECRYPT-BATCH] Prima chiave trovata:', firstKey);
            console.log('🔍 [DECRYPT-BATCH] Valore prima chiave:', decrypted[firstKey]);
            
            clientName = decrypted.name || 'Cliente sconosciuto';
            
          } catch (error) {
            console.error('❌ [DECRYPT-BATCH] ERROR decryptFields:', error);
            console.error('❌ [DECRYPT-BATCH] Error message:', (error as Error).message);
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
    
    // ✅ NON decriptare qui - lascia i placeholder intatti
    // HomeClient si occuperà della decriptazione quando crypto sarà pronto
    console.log('📨 [LOAD-MSG] Salvo messaggi RAW (con placeholder), HomeClient decripterà');
    setBubbles(items);
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
