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
  const { ready: cryptoReady, crypto } = useCrypto();

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

  function speakIfEnabled(msg: string) {
    if (voice.speakerEnabled) speakAssistant(msg);
  }

  function askConfirm(i: Intent) {
    setPendingIntent(i);
    let confirmMessage = "";
    switch (i.type) {
      case "CLIENT_CREATE": confirmMessage = `Confermi: creo il cliente ${i.name ?? "senza nome"}?`; break;
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

      if (pendingIntent) {
        if (YES_PATTERN.test(raw)) { await handleIntent(pendingIntent); setPendingIntent(null); return; }
        if (NO_PATTERN.test(raw)) { speakIfEnabled("Ok, annullato."); setPendingIntent(null); return; }
      } else {
        const intent = matchIntent(raw);
        if (intent.type !== "NONE") { askConfirm(intent); return; }
      }
      await conv.send(raw);
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
      const shouldUseLocal = 
        parsed.confidence >= LOCAL_CONFIDENCE_THRESHOLD && 
        !FORCE_OPENAI_INTENTS.includes(parsed.intent) &&
        cryptoReady; // Serve crypto per query DB

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
          const result = await runChatTurn_v2(txt, plannerCtx, cryptoForPlanner);
          
          // Aggiorna contesto NLU
          nluContextRef.current = updateContext(nluContextRef.current, parsed);
          
          // Mostra risposta
          appendAssistantLocal(result.text);
          
          // Salva in DB per persistenza
          const convId = conv.currentConv?.id;
          if (convId) {
            await saveAndReloadMessages(convId, txt, result.text);
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
            await saveAndReloadMessages(convId, txt, response);
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
  async function saveAndReloadMessages(convId: string, userText: string, assistantText: string) {
    await fetch("/api/messages/append", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: convId, userText, assistantText }),
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
