// components/HomeClient.tsx
// VERSIONE REFACTORED v2 - Planner locale integrato (risparmio token OpenAI)
"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useDrawers, DrawersWithBackdrop } from "./Drawers";
import { supabase } from "../lib/supabase/client";

import TopBar from "./home/TopBar";
import Thread from "./home/Thread";
import Composer from "./home/Composer";
import HomeDashboard from "./home/Dashboard";
import DialogOverlay from "./home/DialogOverlay";
import PassphraseDebugPanel from "./PassphraseDebugPanel";
import WelcomeModal from "./WelcomeModal";
import OnboardingImport from "./OnboardingImport";
import GuidedClientCreationDialog from "./GuidedClientCreationDialog";

import { useConversation } from "../app/context/ConversationContext";
import { useConversations, type Bubble, decryptClientPlaceholders } from "../hooks/useConversations";
import { useCrypto } from "@/lib/crypto/CryptoProvider";
import { useTTS } from "../hooks/useTTS";
import { useVoice } from "../hooks/useVoice";
import { useAutoResize } from "../hooks/useAutoResize";

import { matchIntent } from "@/lib/voice/intents";
import type { Intent } from "@/lib/voice/intents";
import { handleIntent } from "@/lib/voice/dispatch";

// 🆕 Planner locale per gestire ~70 intent senza OpenAI
import { 
  parseIntent, 
  updateContext, 
  createEmptyContext,
  type ConversationContext 
} from "@/lib/nlu/unified";
import { runChatTurn_v2 } from "@/app/chat/planner";

// Utilities estratte
import { 
  patchPriceReply, 
  YES_PATTERN, 
  NO_PATTERN, 
  getLocalIntentResponse,
  stripMarkdownForTTS 
} from "@/lib/chat/utils";

// Intent che DEVONO passare per OpenAI (query complesse)
const FORCE_OPENAI_INTENTS = ['unknown'];

// Soglia minima di confidence per usare planner locale
const LOCAL_CONFIDENCE_THRESHOLD = 0.75;

export default function HomeClient({ email, userName }: { email: string; userName: string }) {
  const convCtx = useConversation();
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  // ---- TTS
  const { ttsSpeaking, lastAssistantText, setLastAssistantText, speakAssistant, unlockAudio, stopSpeaking } = useTTS();
  const ttsSpeakingRef = useRef(false);
  useEffect(() => { ttsSpeakingRef.current = ttsSpeaking; }, [ttsSpeaking]);
  const isTtsSpeakingFn = useCallback(() => ttsSpeakingRef.current, []);

  // ---- Conversazioni
  const conv = useConversations({
    onAssistantReply: (text) => { setLastAssistantText(text); },
  });
  
  // ---- Crypto ready status
  const { ready: cryptoReady, crypto, userId } = useCrypto();

  // 🆕 Contesto NLU persistente per il planner locale
  const nluContextRef = useRef<ConversationContext>(createEmptyContext());
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);

  // Preferenza pagina iniziale (chat o dashboard)
  const [homePageMode, setHomePageMode] = useState<'chat' | 'dashboard'>('chat');
  
  // Carica preferenza iniziale da localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('repping_settings');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.homePageMode === 'dashboard' || data.homePageMode === 'chat') {
          setHomePageMode(data.homePageMode);
        }
      }
    } catch {}
  }, []);

  // Ascolta cambio preferenza dalle Impostazioni
  useEffect(() => {
    function handleModeChange(e: CustomEvent<{ mode: 'chat' | 'dashboard' }>) {
      setHomePageMode(e.detail.mode);
    }
    window.addEventListener('repping:homePageModeChanged', handleModeChange as EventListener);
    return () => window.removeEventListener('repping:homePageModeChanged', handleModeChange as EventListener);
  }, []);

  // Ascolta click su banner Promemoria dalla Dashboard
  useEffect(() => {
    function handleOpenPromemoria() {
      openDocs(); // Apre il drawer Documenti (che contiene i promemoria)
    }
    window.addEventListener('open-promemoria', handleOpenPromemoria);
    return () => window.removeEventListener('open-promemoria', handleOpenPromemoria);
  }, [openDocs]);

  // Listener per generazione PDF
  useEffect(() => {
    async function handleGeneratePdf(e: CustomEvent<any>) {
      const command = e.detail;
      if (!command || command.action !== 'GENERATE_PDF') return;
      if (!cryptoReady) {
        alert('Sblocca la sessione prima di generare il PDF');
        return;
      }
      
      try {
        const { generateReportListaClienti } = await import('@/lib/pdf/generator');
        
        const params = new URLSearchParams();
        if (command.filters?.city) params.set('city', command.filters.city);
        if (command.filters?.tipo) params.set('tipo', command.filters.tipo);
        
        const response = await fetch(`/api/clients/list-for-pdf?${params.toString()}`);
        const data = await response.json();
        
        if (!data.clients || data.clients.length === 0) {
          alert(`Nessun cliente trovato. Filtri: city=${command.filters?.city || 'tutti'}`);
          return;
        }
        
        // Decifra nomi client-side
        const decryptedClients = await Promise.all(data.clients.map(async (c: any) => {
          let name = `Cliente ${c.city || ''}`.trim();
          if (c.name_enc && c.name_iv && crypto && typeof (crypto as any).decryptFields === 'function') {
            try {
              const decResult = await (crypto as any).decryptFields('table:accounts', 'accounts', c.id, 
                { name_enc: c.name_enc, name_iv: c.name_iv }, ['name']);
              if (decResult?.name) name = decResult.name;
            } catch (e) { console.warn('[PDF] Decrypt error', c.id, e); }
          }
          return { ...c, name };
        }));
        
        // Genera PDF
        const pdfBlob = await generateReportListaClienti({
          nomeAgente: userName || 'Agente',
          dataGenerazione: new Date().toLocaleDateString('it-IT'),
          filtri: { tipo: command.report_type, descrizione: Object.entries(command.filters || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Tutti' },
          clienti: decryptedClients.map((c: any) => ({
            nome: c.name, citta: c.city, numVisite: c.visit_count || 0,
            ultimaVisita: c.last_visit, fatturato: c.total_sales, km: 0, note: c.notes
          })),
          numClienti: decryptedClients.length,
          visiteTotali: decryptedClients.reduce((sum: number, c: any) => sum + (c.visit_count || 0), 0),
          fatturatoTotale: decryptedClients.reduce((sum: number, c: any) => sum + (c.total_sales || 0), 0),
          kmTotali: 0
        });
        
        // Download
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_clienti_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('PDF generation error:', err);
        alert('Errore nella generazione del PDF');
      }
    }
    
    window.addEventListener('repping:generatePdf', handleGeneratePdf as unknown as EventListener);
    return () => window.removeEventListener('repping:generatePdf', handleGeneratePdf as unknown as EventListener);
  }, [userName, cryptoReady, crypto]);

  useEffect(() => { conv.ensureConversation(); }, []); // eslint-disable-line

  // ---- Stato conferma intent (legacy voce)
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);
  const [originalVoiceCommand, setOriginalVoiceCommand] = useState<string>("");
  
  // 🆕 Ref per permettere a onSendDirectly di usare il planner
  const processVoiceInputRef = useRef<((text: string) => Promise<void>) | null>(null);

  // 🎙️ Stato dialogo guidato creazione cliente
  type ClientCreationStep = 'name' | 'city' | 'street' | 'tipo_locale' | 'phone' | 'email' | 'notes' | 'confirm';
  type ClientData = {
    name: string;
    city: string;
    street: string;
    tipo_locale: string;
    phone: string;
    email: string;
    notes: string;
  };
  const [guidedClientCreation, setGuidedClientCreation] = useState<{
    active: boolean;
    step: ClientCreationStep;
    data: Partial<ClientData>;
  }>({ active: false, step: 'name', data: {} });

  function speakIfEnabled(msg: string) {
    if (voice.speakerEnabled) speakAssistant(msg);
  }

  // === GUIDED CLIENT CREATION LOGIC ===
  
  function startGuidedClientCreation() {
    unlockAudio(); // Unlock audio per TTS
    setGuidedClientCreation({ active: true, step: 'name', data: {} });
    speakIfEnabled("Ok! Come si chiama il locale o il cliente?");
  }

  function closeGuidedClientCreation() {
    setGuidedClientCreation({ active: false, step: 'name', data: {} });
    stopSpeaking();
  }

  async function handleGuidedClientInput(text: string) {
    const { step, data } = guidedClientCreation;
    const trimmed = text.trim();
    
    // Comandi speciali
    if (/^(annulla|stop|basta|esci)$/i.test(trimmed)) {
      speakIfEnabled("Ok, annullato.");
      closeGuidedClientCreation();
      return;
    }

    // Skip per campi opzionali
    const isSkip = /^(skip|salta|no|niente|passa)$/i.test(trimmed);

    const STEP_ORDER: ClientCreationStep[] = ['name', 'city', 'street', 'tipo_locale', 'phone', 'email', 'notes', 'confirm'];
    const currentIndex = STEP_ORDER.indexOf(step);

    // Gestione step by step
    switch (step) {
      case 'name':
        if (!trimmed) {
          speakIfEnabled("Non ho capito il nome. Ripeti per favore.");
          return;
        }
        setGuidedClientCreation(prev => ({
          ...prev,
          step: 'city',
          data: { ...prev.data, name: trimmed }
        }));
        speakIfEnabled(`${trimmed}. In che città si trova?`);
        break;

      case 'city':
        if (!trimmed) {
          speakIfEnabled("Non ho capito la città. Ripeti per favore.");
          return;
        }
        setGuidedClientCreation(prev => ({
          ...prev,
          step: 'street',
          data: { ...prev.data, city: trimmed }
        }));
        speakIfEnabled(`${trimmed}. Qual è l'indirizzo completo?`);
        break;

      case 'street':
        if (isSkip) {
          setGuidedClientCreation(prev => ({ ...prev, step: 'tipo_locale' }));
          speakIfEnabled("Ok, saltiamo l'indirizzo. È un bar, ristorante, hotel o altro?");
        } else {
          setGuidedClientCreation(prev => ({
            ...prev,
            step: 'tipo_locale',
            data: { ...prev.data, street: trimmed }
          }));
          speakIfEnabled(`${trimmed}. È un bar, ristorante, hotel o altro?`);
        }
        break;

      case 'tipo_locale':
        if (isSkip) {
          setGuidedClientCreation(prev => ({ ...prev, step: 'phone' }));
          speakIfEnabled("Ok, saltiamo il tipo. Hai un numero di telefono? Oppure di' salta.");
        } else {
          setGuidedClientCreation(prev => ({
            ...prev,
            step: 'phone',
            data: { ...prev.data, tipo_locale: trimmed }
          }));
          speakIfEnabled(`${trimmed}. Hai un numero di telefono? Oppure di' salta.`);
        }
        break;

      case 'phone':
        if (isSkip) {
          setGuidedClientCreation(prev => ({ ...prev, step: 'email' }));
          speakIfEnabled("Ok, saltiamo il telefono. Hai un indirizzo email? Oppure di' salta.");
        } else {
          setGuidedClientCreation(prev => ({
            ...prev,
            step: 'email',
            data: { ...prev.data, phone: trimmed }
          }));
          speakIfEnabled(`Telefono salvato. Hai un indirizzo email? Oppure di' salta.`);
        }
        break;

      case 'email':
        if (isSkip) {
          setGuidedClientCreation(prev => ({ ...prev, step: 'notes' }));
          speakIfEnabled("Ok, saltiamo l'email. Vuoi aggiungere delle note? Oppure di' no.");
        } else {
          setGuidedClientCreation(prev => ({
            ...prev,
            step: 'notes',
            data: { ...prev.data, email: trimmed }
          }));
          speakIfEnabled("Email salvata. Vuoi aggiungere delle note? Oppure di' no.");
        }
        break;

      case 'notes':
        if (isSkip) {
          setGuidedClientCreation(prev => ({ ...prev, step: 'confirm' }));
          speakRiepilogo({ ...data });
        } else {
          const newData = { ...data, notes: trimmed };
          setGuidedClientCreation(prev => ({
            ...prev,
            step: 'confirm',
            data: newData
          }));
          speakRiepilogo(newData);
        }
        break;

      case 'confirm':
        if (YES_PATTERN.test(trimmed)) {
          speakIfEnabled("Perfetto! Salvo il cliente...");
          await saveGuidedClient(data as ClientData);
        } else if (NO_PATTERN.test(trimmed)) {
          speakIfEnabled("Ok, annullato.");
          closeGuidedClientCreation();
        } else {
          speakIfEnabled("Non ho capito. Di' sì per salvare o no per annullare.");
        }
        break;
    }
  }

  function speakRiepilogo(data: Partial<ClientData>) {
    let recap = "Perfetto! Riepilogo: ";
    if (data.name) recap += `Nome: ${data.name}. `;
    if (data.city) recap += `Città: ${data.city}. `;
    if (data.street) recap += `Indirizzo: ${data.street}. `;
    if (data.tipo_locale) recap += `Tipo: ${data.tipo_locale}. `;
    if (data.phone) recap += `Telefono: ${data.phone}. `;
    if (data.email) recap += `Email: ${data.email}. `;
    if (data.notes) recap += `Note: ${data.notes}. `;
    recap += "Confermi e salvo? Di' sì o no.";
    speakIfEnabled(recap);
  }

  async function saveGuidedClient(data: ClientData) {
    if (!cryptoReady || !crypto) {
      speakIfEnabled("Errore: sistema di cifratura non pronto. Riprova dopo aver sbloccato la sessione.");
      closeGuidedClientCreation();
      return;
    }

    try {
      const accountId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      // Cifra i campi sensibili
      const fieldsToEncrypt: Record<string, string> = { name: data.name };
      if (data.phone) fieldsToEncrypt.phone = data.phone;
      if (data.email) fieldsToEncrypt.email = data.email;
      if (data.notes) fieldsToEncrypt.notes = data.notes;

      const encrypted = await crypto.encryptFields('table:accounts', 'accounts', accountId, fieldsToEncrypt);

      // Blind index per email
      let email_bi: string | undefined;
      if (data.email && typeof crypto.computeBlindIndex === 'function') {
        email_bi = await crypto.computeBlindIndex('table:accounts', data.email);
      }

      // Prepara payload
      const payload: any = {
        id: accountId,
        name_enc: String(encrypted.name_enc),
        name_iv: String(encrypted.name_iv),
      };

      // Blind index per nome (se disponibile)
      if (typeof crypto.computeBlindIndex === 'function') {
        payload.name_bi = await crypto.computeBlindIndex('table:accounts', data.name);
      }

      if (data.city) payload.city = data.city;
      if (data.street) payload.street = data.street;
      if (data.tipo_locale) payload.tipo_locale = data.tipo_locale;

      if (encrypted.phone_enc) {
        payload.phone_enc = String(encrypted.phone_enc);
        payload.phone_iv = String(encrypted.phone_iv);
      }

      if (encrypted.email_enc) {
        payload.email_enc = String(encrypted.email_enc);
        payload.email_iv = String(encrypted.email_iv);
        if (email_bi) payload.email_bi = email_bi;
      }

      if (encrypted.notes_enc) {
        payload.notes_enc = String(encrypted.notes_enc);
        payload.notes_iv = String(encrypted.notes_iv);
      }

      // Salva via API
      const res = await fetch('/api/clients/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
        throw new Error(error.error || 'Errore salvataggio');
      }

      speakIfEnabled(`Perfetto! Cliente ${data.name} salvato con successo. Vuoi aggiungerne un altro?`);
      
      // 🆕 Marca come completato per checklist onboarding
      localStorage.setItem('reping:used_voice_client', 'true');
      
      // Aspetta risposta per eventuale altro cliente
      const waitForAnother = async () => {
        // Timeout 5 secondi per risposta
        await new Promise(resolve => setTimeout(resolve, 5000));
        closeGuidedClientCreation();
      };
      
      // Reset ma aspetta risposta
      setGuidedClientCreation({ active: true, step: 'name', data: {} });
      waitForAnother();

    } catch (e: any) {
      console.error('[GuidedClient] Errore salvataggio:', e);
      speakIfEnabled(`Errore durante il salvataggio: ${e.message || 'errore sconosciuto'}. Riprova.`);
      closeGuidedClientCreation();
    }
  }

  // Ascolta evento per avviare creazione guidata da Dashboard
  useEffect(() => {
    function handleStartGuidedCreation() {
      startGuidedClientCreation();
    }
    window.addEventListener('repping:startGuidedClientCreation', handleStartGuidedCreation);
    return () => window.removeEventListener('repping:startGuidedClientCreation', handleStartGuidedCreation);
  }, []);

  // === END GUIDED CLIENT CREATION LOGIC ===

  function askConfirm(i: Intent) {
    // 🎙️ Se è CLIENT_CREATE, avvia dialogo guidato invece di conferma
    if (i.type === 'CLIENT_CREATE') {
      startGuidedClientCreation();
      return;
    }

    setPendingIntent(i);
    let confirmMessage = "";
    switch (i.type) {
      case "CLIENT_SEARCH": confirmMessage = `Confermi: cerco il cliente ${i.query}?`; break;
      case "CLIENT_UPDATE": confirmMessage = `Confermi: modifico il cliente ${i.name}?`; break;
      case "NOTES_SEARCH": confirmMessage = `Vuoi che cerchi nelle note di ${i.accountHint} se c'è qualcosa su ${i.topic}?`; break;
      default: confirmMessage = "Confermi l'azione?";
    }
    appendAssistantLocal(confirmMessage);
    speakIfEnabled(confirmMessage);
  }

  // ---- Voce (SR nativa)
  const voice = useVoice({
    onTranscriptionToInput: (text) => { conv.setInput(text); },
    onSendDirectly: async (text) => {
      const raw = (text || "").trim();
      if (!raw) return;

      // 🎙️ Se dialogo guidato attivo, intercetta input
      if (guidedClientCreation.active) {
        await handleGuidedClientInput(raw);
        return;
      }

      if (pendingIntent) {
        if (YES_PATTERN.test(raw)) { await handleIntent(pendingIntent); setPendingIntent(null); return; }
        if (NO_PATTERN.test(raw)) { speakIfEnabled("Ok, annullato."); setPendingIntent(null); return; }
      } else {
        const intent = matchIntent(raw);
        if (intent.type !== "NONE") { askConfirm(intent); return; }
      }
      
      // 🆕 Usa processVoiceInput che gestisce il planner direttamente
      if (processVoiceInputRef.current) {
        await processVoiceInputRef.current(raw);
      } else {
        console.warn('[onSendDirectly] processVoiceInputRef not ready, falling back to OpenAI');
        await conv.send(raw);
      }
    },
    onSpeak: (text) => speakAssistant(text),
    createNewSession: async (titleAuto) => {
      try { await conv.createConversation(titleAuto); return conv.currentConv; }
      catch { return null; }
    },
    autoTitleRome: conv.autoTitleRome,
    preferServerSTT: false,
    isTtsSpeaking: isTtsSpeakingFn,
    userName,
  });

  useAutoResize(conv.taRef, conv.input);

  // 🔧 FIX: Riferimento per evitare loop infiniti
  const lastSpokenTextRef = useRef<string>('');

  useEffect(() => {
    if (!lastAssistantText) return;
    // Evita di ripetere lo stesso testo (causa loop!)
    if (lastSpokenTextRef.current === lastAssistantText) return;
    lastSpokenTextRef.current = lastAssistantText;
    
    // 🆕 Traccia per comando "ripeti"
    voice.setLastAssistantResponse(stripMarkdownForTTS(lastAssistantText));
    if (voice.speakerEnabled) {
      speakAssistant(stripMarkdownForTTS(lastAssistantText));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAssistantText, voice.speakerEnabled]);
  // ⚠️ NON includere `voice` o `speakAssistant` - causano loop infinito!

  // 🎙️ Listener per attivazione Dialogo da Dashboard/Drawer
  useEffect(() => {
    const handleActivateDialog = () => {
      // 🔓 Sblocca audio PRIMA di qualsiasi TTS (Chrome autoplay policy)
      unlockAudio();
      
      // Se siamo nella dashboard, passa alla chat
      setHomePageMode('chat');
      // Attiva dialogo
      if (!voice.voiceMode) {
        voice.startDialog();
      }
      // Pulisci il flag
      localStorage.removeItem('activate_dialog_mode');
    };

    window.addEventListener('repping:activateDialog', handleActivateDialog);
    
    // Check flag all'avvio (se utente ha cliccato su Dialogo e poi ricaricato)
    if (localStorage.getItem('activate_dialog_mode') === 'true') {
      handleActivateDialog();
    }

    return () => {
      window.removeEventListener('repping:activateDialog', handleActivateDialog);
    };
  }, [voice]);

  const handleAnyHomeInteraction = useCallback(() => {
    if (leftOpen) closeLeft();
    if (rightOpen) closeRight();
  }, [leftOpen, rightOpen, closeLeft, closeRight]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // ✅ Patch prezzi nelle bolle
  const patchedBubbles = useMemo(() => {
    return (conv.bubbles || []).map((b: any) => {
      if (b?.role !== "assistant" || !b?.content) return b;
      return { ...b, content: patchPriceReply(String(b.content)) };
    });
  }, [conv.bubbles]);

  // ✅ Decripta placeholder [CLIENT:uuid]
  // NOTA: NON usiamo cryptoReady come gate - decryptClientPlaceholders
  // usa window.cryptoSvc direttamente e ha il suo sistema di attesa
  const [decryptedBubbles, setDecryptedBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    // Salta se non ci sono bubble con placeholder
    const hasPlaceholders = patchedBubbles.some(
      b => b?.role === 'assistant' && /\[CLIENT:[a-f0-9-]+/i.test(b?.content || '')
    );
    
    if (!hasPlaceholders) {
      setDecryptedBubbles(patchedBubbles);
      return;
    }

    console.log('[HomeClient] Found placeholders, attempting decryption...');

    async function processPlaceholders() {
      const processed = await Promise.all(
        patchedBubbles.map(async (b: any) => {
          if (b?.role === 'assistant' && b?.content) {
            const decrypted = await decryptClientPlaceholders(b.content);
            return { ...b, content: decrypted };
          }
          return b;
        })
      );
      setDecryptedBubbles(processed);
      console.log('[HomeClient] Decryption completed');
    }
    processPlaceholders();
  }, [patchedBubbles]);

  // --- Stato per bolle locali ---
  const [localUser, setLocalUser] = useState<string[]>([]);
  const [localAssistant, setLocalAssistant] = useState<string[]>([]);

  function appendUserLocal(text: string) { setLocalUser(prev => [...prev, text]); }
  function appendAssistantLocal(text: string) { setLocalAssistant(prev => [...prev, patchPriceReply(text)]); }

  // ✅ Unione bolle
  const mergedBubbles = useMemo((): Bubble[] => {
    const localsUser = localUser.map((t): Bubble => ({ role: "user", content: t }));
    const localsAssistant = localAssistant.map((t): Bubble => ({ role: "assistant", content: t }));
    return [...decryptedBubbles, ...localsUser, ...localsAssistant];
  }, [decryptedBubbles, localUser, localAssistant]);

  // ===================== SUBMIT FROM COMPOSER =====================
  async function submitFromComposer() {
    if (voice.isRecording) await voice.stopMic();
    const txt = conv.input.trim();
    if (!txt) return;
    conv.setInput("");

    // Gestione conferma sì/no per intent pendente
    if (pendingIntent) {
      if (YES_PATTERN.test(txt)) {
        const convId = conv.currentConv?.id;
        if (convId && originalVoiceCommand) {
          await saveIntentConfirmation(convId, txt, true);
        }
        setPendingIntent(null);
        setOriginalVoiceCommand("");
        return;
      }
      
      if (NO_PATTERN.test(txt)) {
        const convId = conv.currentConv?.id;
        if (convId && originalVoiceCommand) {
          await saveIntentConfirmation(convId, txt, false);
        }
        speakIfEnabled("Ok, annullato.");
        setPendingIntent(null);
        setOriginalVoiceCommand("");
        return;
      }
    }

    // ✅ Voice intents check (legacy - per comandi che richiedono conferma)
    const voiceIntent = matchIntent(txt);
    if (voiceIntent.type !== "NONE") {
      setOriginalVoiceCommand(txt);
      askConfirm(voiceIntent);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 PLANNER LOCALE - Gestisce ~70 intent SENZA OpenAI
    // ═══════════════════════════════════════════════════════════════
    try {
      const parsed = parseIntent(txt, nluContextRef.current);
      
      console.debug('[HomeClient] NLU parsed:', {
        input: txt,
        intent: parsed.intent,
        confidence: parsed.confidence,
        entities: parsed.entities
      });

      // Se confidence alta E non è un intent che richiede OpenAI → planner locale
      // NOTA: crypto NON è richiesto per tutte le query (es. client_count non decripta nomi)
      const shouldUseLocal = 
        parsed.confidence >= LOCAL_CONFIDENCE_THRESHOLD && 
        !FORCE_OPENAI_INTENTS.includes(parsed.intent);
      // cryptoReady non più richiesto - il planner gestisce query senza decriptazione

      if (shouldUseLocal) {
        console.debug('[HomeClient] 🆓 Using LOCAL planner (no OpenAI)');
        
        setIsLocalProcessing(true);
        appendUserLocal(txt);
        
        try {
          // Costruisci contesto per il planner
          const plannerCtx = {
            state: {
              scope: 'global' as const,
              topic_attivo: null,
              ultimo_intent: null,
              entita_correnti: null,
              ultimo_risultato: null,
              updated_at: Date.now(),
              nluContext: nluContextRef.current,
            },
            expired: false,
            setScope: () => {},
            remember: (partial: any) => {
              if (partial.nluContext) {
                nluContextRef.current = partial.nluContext;
              }
            },
            reset: () => { nluContextRef.current = createEmptyContext(); },
          };

          // Esegui planner locale
          // Cast crypto per compatibilità con il planner (verifichiamo che decryptFields esista)
          const cryptoForPlanner = crypto && typeof crypto.decryptFields === 'function' 
            ? crypto as any 
            : null;
          const result = await runChatTurn_v2(txt, plannerCtx, cryptoForPlanner, userId ?? undefined);
          
          // Aggiorna contesto NLU
          nluContextRef.current = updateContext(nluContextRef.current, parsed);
          
          // Mostra risposta
          appendAssistantLocal(result.text);
          
          // Salva in DB per persistenza (con metadati RAG)
          const convId = conv.currentConv?.id;
          if (convId) {
            await saveAndReloadMessages(convId, txt, result.text, {
              intent: result.intent,
              confidence: result.confidence,
              source: result.source,
              entities: result.entities,
              account_ids: result.account_ids,
            });
          }
          
          speakIfEnabled(stripMarkdownForTTS(result.text));
          
        } catch (plannerError) {
          console.error('[HomeClient] Planner error, fallback to OpenAI:', plannerError);
          // Fallback a OpenAI in caso di errore
          setLocalUser(prev => prev.filter(t => t !== txt)); // Rimuovi bolla utente
          await conv.send(txt);
        } finally {
          setIsLocalProcessing(false);
        }
        
        return;
      }
      
      // Intent semplici con risposta predefinita (greet, help, thanks, cancel)
      const simpleLocalIntents = ['greet', 'help', 'thanks', 'cancel', 'navigate'];
      if (simpleLocalIntents.includes(parsed.intent) && parsed.confidence >= 0.8) {
        const response = getLocalIntentResponse(parsed.intent, parsed.entities);
        
        if (response) {
          appendUserLocal(txt);
          appendAssistantLocal(response);
          
          const convId = conv.currentConv?.id;
          if (convId) {
            await saveAndReloadMessages(convId, txt, response, {
              intent: parsed.intent,
              confidence: parsed.confidence,
              source: 'local',
              entities: parsed.entities,
            });
          }
          
          speakIfEnabled(stripMarkdownForTTS(response));
          return;
        }
      }
      
    } catch (e) {
      console.error("[HomeClient] NLU error:", e);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🤖 FALLBACK OPENAI - Solo per query complesse/non riconosciute
    // ═══════════════════════════════════════════════════════════════
    console.debug('[HomeClient] 💸 Using OpenAI API (fallback)');
    await conv.send(txt);
  }

  // 🆕 Funzione per processare input vocale con il planner
  async function processVoiceInput(txt: string) {
    console.log('[HomeClient] processVoiceInput:', txt);
    
    // Usa il planner NLU
    try {
      const parsed = parseIntent(txt, nluContextRef.current);
      
      console.debug('[HomeClient] NLU parsed (voice):', {
        input: txt,
        intent: parsed.intent,
        confidence: parsed.confidence,
      });

      const shouldUseLocal = 
        parsed.confidence >= LOCAL_CONFIDENCE_THRESHOLD && 
        !FORCE_OPENAI_INTENTS.includes(parsed.intent);

      if (shouldUseLocal) {
        console.debug('[HomeClient] 🆓 Using LOCAL planner (voice)');
        
        appendUserLocal(txt);
        setIsLocalProcessing(true);
        
        try {
          const plannerCtx = {
            state: {
              scope: 'global' as const,
              topic_attivo: null,
              ultimo_intent: null,
              entita_correnti: null,
              ultimo_risultato: null,
              updated_at: Date.now(),
              nluContext: nluContextRef.current,
            },
            expired: false,
            setScope: () => {},
            remember: (partial: any) => {
              if (partial.nluContext) {
                nluContextRef.current = partial.nluContext;
              }
            },
            reset: () => { nluContextRef.current = createEmptyContext(); },
          };

          const cryptoForPlanner = crypto && typeof crypto.decryptFields === 'function' 
            ? crypto as any 
            : null;
          const result = await runChatTurn_v2(txt, plannerCtx, cryptoForPlanner, userId ?? undefined);

          if (result) {
            // Aggiorna contesto NLU
            nluContextRef.current = updateContext(nluContextRef.current, parsed);
            
            appendAssistantLocal(result.text);
            speakIfEnabled(stripMarkdownForTTS(result.text));
          }
        } finally {
          setIsLocalProcessing(false);
        }
        return;
      }
    } catch (e) {
      console.error('[HomeClient] Voice planner error:', e);
    }

    // Fallback a OpenAI
    console.debug('[HomeClient] 💸 Using OpenAI API (voice fallback)');
    await conv.send(txt);
  }

  // Assegna SUBITO alla ref (non in useEffect, troppo tardi!)
  processVoiceInputRef.current = processVoiceInput;

  // Helper: salva conferma intent e ricarica messaggi
  async function saveIntentConfirmation(convId: string, userText: string, confirmed: boolean) {
    let confirmMessage = "";
    switch (pendingIntent?.type) {
      case "CLIENT_SEARCH": confirmMessage = `Confermi: cerco il cliente ${pendingIntent.query}?`; break;
      case "CLIENT_CREATE": confirmMessage = `Confermi: creo il cliente ${pendingIntent.name ?? "senza nome"}?`; break;
      case "CLIENT_UPDATE": confirmMessage = `Confermi: modifico il cliente ${pendingIntent.name}?`; break;
      case "NOTES_SEARCH": confirmMessage = `Vuoi che cerchi nelle note di ${pendingIntent.accountHint} se c'è qualcosa su ${pendingIntent.topic}?`; break;
      default: confirmMessage = "Confermi l'azione?";
    }

    // Salva comando originale
    await fetch("/api/messages/append", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: convId, userText: originalVoiceCommand, assistantText: confirmMessage }),
    });

    if (confirmed) {
      const result = await handleIntent(pendingIntent!);
      const resultMessage = result.message || "✅ Fatto.";
      await fetch("/api/messages/append", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: convId, userText, assistantText: resultMessage }),
      });
    } else {
      await fetch("/api/messages/append", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: convId, userText, assistantText: "Ok, annullato." }),
      });
    }

    await reloadMessages(convId);
  }

  // Helper: salva messaggio e ricarica
  // 📝 Esteso per supportare metadati RAG (Fase 2)
  async function saveAndReloadMessages(
    convId: string, 
    userText: string, 
    assistantText: string,
    ragMetadata?: {
      intent?: string | null;
      confidence?: number;
      source?: 'local' | 'rag' | 'llm' | 'unknown';
      entities?: Record<string, any>;
      account_ids?: string[];
    }
  ) {
    await fetch("/api/messages/append", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 
        conversationId: convId, 
        userText, 
        assistantText,
        // 📝 Metadati RAG
        intent: ragMetadata?.intent,
        confidence: ragMetadata?.confidence,
        source: ragMetadata?.source,
        entities: ragMetadata?.entities,
        account_ids: ragMetadata?.account_ids,
      }),
    });
    await reloadMessages(convId);
  }

  // Helper: ricarica messaggi
  async function reloadMessages(convId: string) {
    const r = await fetch(`/api/messages/by-conversation?conversationId=${convId}&limit=200`, { cache: "no-store" });
    const j = await r.json();
    conv.setBubbles?.((j.items ?? []).map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
    setLocalUser([]);
    setLocalAssistant([]);
  }

  // ===================== RENDER =====================
  return (
    <>
      {/* TopBar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "var(--bg)", borderBottom: "1px solid var(--ring)" }}>
        <TopBar
          title={homePageMode === 'dashboard' ? 'Dashboard' : (conv.currentConv?.title ?? "")}
          userName={userName}
          onOpenLeft={openLeft}
          onOpenDati={openDati}
          onOpenDocs={openDocs}
          onOpenImpostazioni={openImpostazioni}
          onLogout={logout}
        />
      </div>

      {/* Toggle Dashboard/Chat */}
      <button
        onClick={() => setHomePageMode(homePageMode === 'dashboard' ? 'chat' : 'dashboard')}
        style={{
          position: 'fixed', bottom: 20, left: 20, zIndex: 999,
          padding: '8px 12px', borderRadius: 20, border: '1px solid var(--ring)',
          background: 'var(--bg)', color: 'var(--fg)', fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', opacity: 0.85, transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
        title={homePageMode === 'dashboard' ? 'Passa alla Chat' : 'Passa alla Dashboard'}
      >
        {homePageMode === 'dashboard' ? '💬' : '📊'}
        <span style={{ fontSize: 11 }}>{homePageMode === 'dashboard' ? 'Chat' : 'Dashboard'}</span>
      </button>

      {/* Contenuto condizionale: Dashboard o Chat */}
      {homePageMode === 'dashboard' ? (
        <>
          <div style={{ height: 70 }} />
          <HomeDashboard userName={userName} />
        </>
      ) : (
        <>
          <div onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction} style={{ minHeight: "100vh" }}>
            <div className="container" onMouseDown={handleAnyHomeInteraction} onTouchStart={handleAnyHomeInteraction}>
              <div style={{ height: 70 }} />
              <Thread
                bubbles={mergedBubbles}
                serverError={conv.serverError}
                threadRef={conv.threadRef}
                endRef={conv.endRef}
                onOpenDrawer={openDocs}
                isSending={conv.isSending || isLocalProcessing}
              />
              <Composer
                value={conv.input}
                onChange={(v) => { conv.setInput(v); voice.setLastInputWasVoice?.(false); }}
                onSend={submitFromComposer}
                disabled={voice.isTranscribing}
                taRef={conv.taRef}
                voice={{
                  isRecording: voice.isRecording,
                  isTranscribing: voice.isTranscribing,
                  error: voice.voiceError,
                  onClick: voice.handleVoiceClick,
                  voiceMode: voice.voiceMode,
                  onToggleDialog: () => {
                    if (!voice.voiceMode) unlockAudio(); // 🔓 Sblocca prima di TTS
                    voice.voiceMode ? voice.stopDialog() : voice.startDialog();
                  },
                  speakerEnabled: voice.speakerEnabled,
                  onToggleSpeaker: () => voice.setSpeakerEnabled((s: boolean) => !s),
                  canRepeat: !!lastAssistantText,
                  onRepeat: () => speakAssistant(),
                  ttsSpeaking,
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Debug Panel - COMMENTATO per Beta
      <PassphraseDebugPanel />
      */}

      {/* Drawer con backdrop */}
      <DrawersWithBackdrop
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        rightContent={rightContent}
        onCloseLeft={closeLeft}
        onCloseRight={closeRight}
        onSelectConversation={(c) => {
          setHomePageMode('chat');
          closeLeft();
          conv.handleSelectConv(c);
        }}
      />

      {/* 👋 Welcome Modal (primo accesso) */}
      <WelcomeModal userName={userName} />

      {/* 📋 Onboarding Import Clienti (dopo welcome) */}
      <OnboardingImport userName={userName} />

      {/* 🎙️ Dialogo Guidato Creazione Cliente */}
      <GuidedClientCreationDialog
        active={guidedClientCreation.active}
        currentStep={guidedClientCreation.step}
        clientData={guidedClientCreation.data}
        onClose={closeGuidedClientCreation}
      />

      {/* 🎙️ Dialog Overlay - Modalità hands-free */}
      <DialogOverlay
        active={voice.voiceMode}
        isListening={voice.isRecording}
        isSpeaking={ttsSpeaking}
        transcript={voice.dialogTranscript}
        messages={mergedBubbles}
        onClose={() => {
          stopSpeaking(); // 🔇 Ferma TTS
          voice.stopDialog(); // 🎤 Ferma SR
        }}
      />
    </>
  );
}
