// components/TestCompanionPanel.tsx
// Pannello floating per DEBUG SISTEMATICO - Checklist funzionalità
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════
// 📋 CHECKLIST FUNZIONALITÀ REPING - DEBUG MANUALE SISTEMATICO
// Solo per ruoli: admin, tester
// ═══════════════════════════════════════════════════════════════════════════

type CheckStatus = 'pending' | 'ok' | 'ko' | 'skip';

interface CheckItem {
  id: string;
  category: string;
  name: string;
  flow: string;
  status: CheckStatus;
  note: string;
}

const INITIAL_CHECKLIST: Omit<CheckItem, 'status' | 'note'>[] = [
  // 1. AUTENTICAZIONE
  { id: 'auth-1', category: '🔐 Autenticazione', name: 'Login email/password', flow: '/login → email/password → sync cookie → unlock crypto → redirect home' },
  { id: 'auth-2', category: '🔐 Autenticazione', name: 'Registrazione Beta', flow: 'Codice invito → validazione → nome/cognome → email/password → consensi GDPR → signup' },
  { id: 'auth-3', category: '🔐 Autenticazione', name: 'Sblocco cifratura', flow: 'Password = KEK (PBKDF2) → unwrap Master Key → sessione sbloccata' },
  { id: 'auth-4', category: '🔐 Autenticazione', name: 'Logout', flow: 'Click logout → signOut() → redirect /login' },
  
  // 2. HOME & DASHBOARD
  { id: 'home-1', category: '🏠 Home', name: 'Dashboard KPI', flow: 'Toggle 📊 → KPI aggregati, promemoria, Napoleon' },
  { id: 'home-2', category: '🏠 Home', name: 'Chat view', flow: 'Toggle 💬 → Thread messaggi, Composer, storico' },
  { id: 'home-3', category: '🏠 Home', name: 'Toggle dashboard/chat', flow: 'Bottone floating bottom-left → alterna view' },
  { id: 'home-4', category: '🏠 Home', name: 'Drawer sinistro (conversazioni)', flow: '☰ → Lista conversazioni → click seleziona → carica thread' },
  { id: 'home-5', category: '🏠 Home', name: 'Drawer destro (Dati/Docs/Impost)', flow: 'Icone header → apre drawer corrispondente' },
  
  // 3. CHAT AI
  { id: 'chat-1', category: '🤖 Chat AI', name: 'NLU Locale (no OpenAI)', flow: 'Input → parseIntent() → confidence > 0.75 → runChatTurn_v2()' },
  { id: 'chat-2', category: '🤖 Chat AI', name: 'Fallback OpenAI', flow: 'Confidence < 0.75 → API OpenAI' },
  { id: 'chat-3', category: '🤖 Chat AI', name: 'Intent client_count', flow: '"quanti clienti ho?" → risposta locale' },
  { id: 'chat-4', category: '🤖 Chat AI', name: 'Intent client_search', flow: '"cerca cliente X" → blind index → risultati' },
  { id: 'chat-5', category: '🤖 Chat AI', name: 'Context retention', flow: 'Domanda follow-up → usa contesto precedente' },
  { id: 'chat-6', category: '🤖 Chat AI', name: 'Nuova conversazione', flow: 'Comando o bottone → crea nuova chat' },
  
  // 4. CLIENTI
  { id: 'client-1', category: '👥 Clienti', name: 'Lista clienti', flow: '/clients → fetch → decripta nomi → visualizza' },
  { id: 'client-2', category: '👥 Clienti', name: 'Dettaglio cliente', flow: '/clients/[id] → decripta tutti i campi → mostra' },
  { id: 'client-3', category: '👥 Clienti', name: 'Creazione manuale', flow: '/tools/quick-add-client → form → cifra → salva' },
  { id: 'client-4', category: '👥 Clienti', name: 'Creazione vocale guidata', flow: '"Crea cliente" → dialogo step-by-step → conferma → salva' },
  { id: 'client-5', category: '👥 Clienti', name: 'Ricerca cliente (chat)', flow: '"cerca cliente X" → blind index → decripta risultati' },
  { id: 'client-6', category: '👥 Clienti', name: 'Import CSV', flow: '/tools/import-clients → parse → cifra batch → insert' },
  
  // 5. PROMEMORIA
  { id: 'prom-1', category: '📝 Promemoria', name: 'Lista promemoria', flow: 'Dashboard/Drawer → lista promemoria attivi' },
  { id: 'prom-2', category: '📝 Promemoria', name: 'Crea promemoria', flow: 'Dettaglio cliente → "Aggiungi promemoria" → salva' },
  { id: 'prom-3', category: '📝 Promemoria', name: 'Completa promemoria', flow: 'Click checkbox → marca completato' },
  { id: 'prom-4', category: '📝 Promemoria', name: 'Elimina promemoria', flow: 'Swipe/click elimina → rimuovi' },
  { id: 'prom-5', category: '📝 Promemoria', name: 'Promemoria da chat', flow: '"ricordami di..." → crea promemoria' },
  
  // 6. VISITE
  { id: 'visit-1', category: '📍 Visite', name: 'Registra visita', flow: '/tools/add-visit → seleziona cliente → dettagli → salva' },
  { id: 'visit-2', category: '📍 Visite', name: 'Storico visite', flow: '/visits → lista con filtri' },
  { id: 'visit-3', category: '📍 Visite', name: 'Analytics visite (chat)', flow: '"quante visite questo mese?" → query locale' },
  
  // 7. NAPOLEON
  { id: 'nap-1', category: '🎯 Napoleon', name: 'Suggerimenti proattivi', flow: 'Dashboard → banner suggerimenti → dettaglio' },
  { id: 'nap-2', category: '🎯 Napoleon', name: 'Briefing giornaliero', flow: '"Buongiorno" → briefing con priorità' },
  { id: 'nap-3', category: '🎯 Napoleon', name: 'Azioni suggerimenti', flow: 'Completa / Posticipa / Ignora' },
  
  // 8. VOCE
  { id: 'voice-1', category: '🎙️ Voce', name: 'Push-to-talk', flow: '🎤 click → recording → release → transcription' },
  { id: 'voice-2', category: '🎙️ Voce', name: 'Modalità dialogo', flow: '🎙️ toggle → continuous listening → auto-send' },
  { id: 'voice-3', category: '🎙️ Voce', name: 'TTS risposta', flow: 'Risposta AI → speakAssistant() → audio' },
  { id: 'voice-4', category: '🎙️ Voce', name: 'Driving mode', flow: '/driving → UI semplificata → hands-free' },
  { id: 'voice-5', category: '🎙️ Voce', name: 'Comandi vocali', flow: '"stop", "ripeti", "aiuto" → azione' },
  
  // 9. ADMIN
  { id: 'admin-1', category: '👑 Admin', name: 'Dashboard admin', flow: '/admin → KPI team, top agenti' },
  { id: 'admin-2', category: '👑 Admin', name: 'Gestione utenti', flow: '/admin/users → lista → cambia ruolo' },
  { id: 'admin-3', category: '👑 Admin', name: 'Statistiche uso', flow: '/admin/usage → query/giorno, trend' },
  { id: 'admin-4', category: '👑 Admin', name: 'Token Beta', flow: '/admin/tokens → genera/invalida token' },
  
  // 10. IMPOSTAZIONI
  { id: 'sett-1', category: '⚙️ Impostazioni', name: 'I miei dati', flow: '/settings/my-data → visualizza → export → cancella' },
  { id: 'sett-2', category: '⚙️ Impostazioni', name: 'Preferenze', flow: '/settings/preferences → home mode, tema' },
  { id: 'sett-3', category: '⚙️ Impostazioni', name: 'Consensi GDPR', flow: 'Visualizza/revoca consensi' },
  
  // 11. LEGAL
  { id: 'legal-1', category: '📜 Legal', name: 'Privacy Policy', flow: '/legal/privacy → pagina statica' },
  { id: 'legal-2', category: '📜 Legal', name: 'Terms of Service', flow: '/legal/terms → pagina statica' },
  { id: 'legal-3', category: '📜 Legal', name: 'Cookie Policy', flow: '/legal/cookies → pagina statica' },
  { id: 'legal-4', category: '📜 Legal', name: 'Banner cookie', flow: 'Prima visita → accetta/rifiuta → salva' },
];

const STATUS_CONFIG: Record<CheckStatus, { emoji: string; color: string; bg: string }> = {
  pending: { emoji: '⏳', color: '#6b7280', bg: '#f3f4f6' },
  ok: { emoji: '✅', color: '#16a34a', bg: '#dcfce7' },
  ko: { emoji: '❌', color: '#dc2626', bg: '#fee2e2' },
  skip: { emoji: '⏸️', color: '#f59e0b', bg: '#fef3c7' },
};

export default function TestCompanionPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [checklist, setChecklist] = useState<CheckItem[]>([]);
  const [filter, setFilter] = useState<'all' | CheckStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [canShow, setCanShow] = useState(false); // 🔒 Default: nascosto
  
  // Drag state
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 🔒 Verifica ruolo utente (SOLO admin vede il pannello)
  useEffect(() => {
    async function checkUserRole() {
      try {
        // Verifica anche se c'è il flag manuale in localStorage (per sviluppo)
        const devOverride = localStorage.getItem('reping:testPanelEnabled') === 'true';
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCanShow(false);
          return;
        }
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        // 🔒 SOLO admin vede il pannello (rimosso 'tester')
        const isAdmin = profile?.role === 'admin';
        
        if (isAdmin || devOverride) {
          setCanShow(true);
        } else {
          setCanShow(false);
          // Pulisci localStorage se non è admin
          localStorage.removeItem('reping:testPanelEnabled');
        }
      } catch (e) {
        console.log('[TestPanel] Errore verifica ruolo:', e);
        setCanShow(false);
      }
    }
    
    checkUserRole();
  }, []);

  // Load checklist from localStorage
  useEffect(() => {
    if (!canShow) return; // Non caricare se non può vedere
    
    const saved = localStorage.getItem('reping_debug_checklist');
    if (saved) {
      try {
        setChecklist(JSON.parse(saved));
      } catch {
        initChecklist();
      }
    } else {
      initChecklist();
    }
    
    // Check if enabled
    const localEnabled = localStorage.getItem('test_panel_enabled');
    if (localEnabled === 'false') {
      setIsEnabled(false);
    }
  }, [canShow]);

  function initChecklist() {
    const items: CheckItem[] = INITIAL_CHECKLIST.map(item => ({
      ...item,
      status: 'pending',
      note: '',
    }));
    setChecklist(items);
    localStorage.setItem('reping_debug_checklist', JSON.stringify(items));
  }

  // Save checklist to localStorage
  useEffect(() => {
    if (checklist.length > 0) {
      localStorage.setItem('reping_debug_checklist', JSON.stringify(checklist));
    }
  }, [checklist]);

  // Load position
  useEffect(() => {
    const saved = localStorage.getItem('test_companion_position');
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
      } catch {
        setDefaultPosition();
      }
    } else {
      setDefaultPosition();
    }
  }, []);

  // Listen for pref changes
  useEffect(() => {
    const handlePrefChange = (e: CustomEvent) => {
      if (typeof e.detail.enabled === 'boolean') {
        setIsEnabled(e.detail.enabled);
        if (!e.detail.enabled) setIsOpen(false);
      }
      if (e.detail.open === true && e.detail.enabled !== false) {
        setIsEnabled(true);
        setIsOpen(true);
      }
    };
    window.addEventListener('repping:testPanelChanged', handlePrefChange as EventListener);
    return () => window.removeEventListener('repping:testPanelChanged', handlePrefChange as EventListener);
  }, []);

  function setDefaultPosition() {
    const x = typeof window !== 'undefined' ? window.innerWidth - 420 : 20;
    const y = typeof window !== 'undefined' ? 80 : 80;
    setPosition({ x: Math.max(20, x), y: Math.max(80, y) });
  }

  useEffect(() => {
    if (position.x >= 0) {
      localStorage.setItem('test_companion_position', JSON.stringify(position));
    }
  }, [position]);

  function updateItem(id: string, updates: Partial<CheckItem>) {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }

  function cycleStatus(id: string) {
    const item = checklist.find(i => i.id === id);
    if (!item) return;
    
    const order: CheckStatus[] = ['pending', 'ok', 'ko', 'skip'];
    const currentIdx = order.indexOf(item.status);
    const nextStatus = order[(currentIdx + 1) % order.length];
    updateItem(id, { status: nextStatus });
  }

  function resetAll() {
    if (confirm('Resettare tutta la checklist?')) {
      initChecklist();
    }
  }

  function exportReport() {
    const report = {
      date: new Date().toISOString(),
      summary: {
        total: checklist.length,
        ok: checklist.filter(i => i.status === 'ok').length,
        ko: checklist.filter(i => i.status === 'ko').length,
        skip: checklist.filter(i => i.status === 'skip').length,
        pending: checklist.filter(i => i.status === 'pending').length,
      },
      items: checklist,
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reping-debug-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Drag handlers
  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button, textarea, input, .no-drag')) return;
    
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging || !dragRef.current) return;
      
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      
      setPosition({
        x: Math.max(0, dragRef.current.startPosX + dx),
        y: Math.max(0, dragRef.current.startPosY + dy),
      });
    }

    function handleMouseUp() {
      setIsDragging(false);
      dragRef.current = null;
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Stats
  const stats = {
    total: checklist.length,
    ok: checklist.filter(i => i.status === 'ok').length,
    ko: checklist.filter(i => i.status === 'ko').length,
    skip: checklist.filter(i => i.status === 'skip').length,
    pending: checklist.filter(i => i.status === 'pending').length,
  };

  // Filtered items
  const filteredItems = filter === 'all' 
    ? checklist 
    : checklist.filter(i => i.status === filter);

  // Group by category
  const grouped = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CheckItem[]>);

  // 🔒 Non mostrare se utente non è admin/tester
  if (!canShow || !isEnabled) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 80,
          right: 20,
          zIndex: 99999,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          background: stats.ko > 0 ? '#dc2626' : stats.pending > 0 ? '#1e40af' : '#16a34a',
          color: 'white',
          fontSize: 18,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={`Debug: ${stats.ok}✅ ${stats.ko}❌ ${stats.pending}⏳`}
      >
        🧪
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: position.x >= 0 ? position.x : undefined,
        right: position.x < 0 ? 20 : undefined,
        top: position.y >= 0 ? position.y : 80,
        zIndex: 99999,
        width: isMinimized ? 240 : 400,
        maxHeight: isMinimized ? 'auto' : 'calc(100vh - 100px)',
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        border: '2px solid #1e40af',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#1e40af',
          color: 'white',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'grab',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14 }}>🧪 Debug Checklist</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, opacity: 0.9 }}>
            {stats.ok}✅ {stats.ko}❌ {stats.pending}⏳
          </span>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
          >
            {isMinimized ? '▼' : '▲'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Toolbar */}
          <div style={{ 
            padding: '8px 12px', 
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}>
            {/* Filters */}
            {(['all', 'pending', 'ok', 'ko', 'skip'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: filter === f ? '2px solid #1e40af' : '1px solid #e5e7eb',
                  background: filter === f ? '#dbeafe' : 'white',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                {f === 'all' ? `Tutti (${stats.total})` : `${STATUS_CONFIG[f].emoji} ${f === 'pending' ? stats.pending : f === 'ok' ? stats.ok : f === 'ko' ? stats.ko : stats.skip}`}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={exportReport} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 11 }} title="Esporta report">
              📤
            </button>
            <button onClick={resetAll} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 11 }} title="Reset">
              🔄
            </button>
          </div>

          {/* Checklist */}
          <div className="no-drag" style={{ 
            flex: 1,
            overflow: 'auto',
            padding: '8px 0',
          }}>
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} style={{ marginBottom: 12 }}>
                <div style={{ 
                  padding: '4px 12px', 
                  background: '#f3f4f6', 
                  fontSize: 12, 
                  fontWeight: 600,
                  color: '#374151',
                  position: 'sticky',
                  top: 0,
                }}>
                  {category}
                </div>
                {items.map(item => (
                  <div key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <div 
                      style={{ 
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: STATUS_CONFIG[item.status].bg,
                        cursor: 'pointer',
                      }}
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); cycleStatus(item.id); }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: `2px solid ${STATUS_CONFIG[item.status].color}`,
                          background: 'white',
                          cursor: 'pointer',
                          fontSize: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                        title="Click per cambiare stato"
                      >
                        {STATUS_CONFIG[item.status].emoji}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                          {item.name}
                        </div>
                        {item.note && (
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                            📝 {item.note.substring(0, 50)}{item.note.length > 50 ? '...' : ''}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>
                        {expandedId === item.id ? '▲' : '▼'}
                      </span>
                    </div>
                    
                    {/* Expanded details */}
                    {expandedId === item.id && (
                      <div style={{ padding: '8px 12px', background: '#fafafa', borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
                          <strong>Flow:</strong> {item.flow}
                        </div>
                        <textarea
                          value={item.note}
                          onChange={(e) => updateItem(item.id, { note: e.target.value })}
                          placeholder="Aggiungi nota (bug, osservazione, ecc.)..."
                          style={{
                            width: '100%',
                            minHeight: 60,
                            padding: 8,
                            borderRadius: 6,
                            border: '1px solid #d1d5db',
                            fontSize: 12,
                            resize: 'vertical',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          {(['ok', 'ko', 'skip', 'pending'] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => updateItem(item.id, { status: s })}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: item.status === s ? `2px solid ${STATUS_CONFIG[s].color}` : '1px solid #e5e7eb',
                                background: item.status === s ? STATUS_CONFIG[s].bg : 'white',
                                cursor: 'pointer',
                                fontSize: 11,
                              }}
                            >
                              {STATUS_CONFIG[s].emoji} {s.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#e5e7eb' }}>
              <div style={{ width: `${(stats.ok / stats.total) * 100}%`, background: '#16a34a' }} />
              <div style={{ width: `${(stats.ko / stats.total) * 100}%`, background: '#dc2626' }} />
              <div style={{ width: `${(stats.skip / stats.total) * 100}%`, background: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>
              {Math.round(((stats.ok + stats.ko + stats.skip) / stats.total) * 100)}% completato
            </div>
          </div>
        </>
      )}
    </div>
  );
}
