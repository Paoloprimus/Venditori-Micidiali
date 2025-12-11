// components/TestCompanionPanel.tsx
// Pannello floating per testing funzionale - Solo tester/admin
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

type NoteCategory = 'bug' | 'miglioramento';

type TestNote = {
  id?: string;
  page_url: string;
  page_title: string;
  category: NoteCategory;
  note: string;
  created_at?: string;
  user_id?: string;
};

const CATEGORY_CONFIG: Record<NoteCategory, { emoji: string; label: string; color: string }> = {
  bug: { emoji: '🐛', label: 'Bug', color: '#ef4444' },
  miglioramento: { emoji: '💡', label: 'Miglioramento', color: '#f59e0b' },
};

export default function TestCompanionPanel() {
  // 🧪 Stato: chiuso di default
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<NoteCategory>('bug');
  const [saving, setSaving] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [recentNotes, setRecentNotes] = useState<TestNote[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  
  // 🧪 BETA: Mostra SEMPRE (semplificato per debug)
  const [canShow, setCanShow] = useState(true); // Sempre true per Beta
  const [isEnabled, setIsEnabled] = useState(true);
  
  // Drag state - Posizione default: basso a destra
  const [position, setPosition] = useState({ x: -1, y: -1 }); // -1 = calcola dinamicamente
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Current page info
  const [pageInfo, setPageInfo] = useState({ url: '', title: '' });

  // 🧪 BETA: Verifica preferenze utente (ma mostra sempre di default)
  useEffect(() => {
    checkPreferences();
  }, []);

  async function checkPreferences() {
    try {
      // Controlla solo se l'utente ha disabilitato manualmente
      const localEnabled = localStorage.getItem('test_panel_enabled');
      if (localEnabled === 'false') {
        setIsEnabled(false);
      }
      
      // Log per debug
      console.log('[TestPanel] 🧪 Pannello Beta attivo');
    } catch (e) {
      console.log('[TestPanel] Errore check preferenze:', e);
    }
  }

  // Load position from localStorage, default basso-destra
  useEffect(() => {
    const saved = localStorage.getItem('test_companion_position');
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        setPosition(pos);
      } catch {
        // Default: basso-destra
        setDefaultPosition();
      }
    } else {
      setDefaultPosition();
    }
  }, []);

  // Ascolta cambiamenti preferenza test panel
  useEffect(() => {
    const handlePrefChange = (e: CustomEvent) => {
      setIsEnabled(e.detail.enabled);
      if (!e.detail.enabled) setIsOpen(false);
    };
    window.addEventListener('repping:testPanelChanged', handlePrefChange as EventListener);
    return () => {
      window.removeEventListener('repping:testPanelChanged', handlePrefChange as EventListener);
    };
  }, []);

  function setDefaultPosition() {
    // Posizione default: 20px dal bordo destro e 100px dal fondo
    const x = typeof window !== 'undefined' ? window.innerWidth - 300 : 20;
    const y = typeof window !== 'undefined' ? window.innerHeight - 400 : 100;
    setPosition({ x: Math.max(20, x), y: Math.max(100, y) });
  }

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('test_companion_position', JSON.stringify(position));
  }, [position]);

  // Update page info on route change
  useEffect(() => {
    const updatePageInfo = () => {
      setPageInfo({
        url: window.location.pathname,
        title: document.title || window.location.pathname,
      });
    };
    
    updatePageInfo();
    
    // Listen for route changes (Next.js)
    const observer = new MutationObserver(updatePageInfo);
    observer.observe(document.querySelector('title') || document.head, {
      subtree: true,
      characterData: true,
      childList: true,
    });
    
    return () => observer.disconnect();
  }, []);

  // Load today's note count
  useEffect(() => {
    loadTodayCount();
  }, []);

  async function loadTodayCount() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('test_notes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`);
      
      setTodayCount(count || 0);
    } catch (e) {
      console.log('[TestPanel] Table not ready yet');
    }
  }

  async function loadRecentNotes() {
    try {
      const { data } = await supabase
        .from('test_notes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      setRecentNotes(data || []);
    } catch (e) {
      console.log('[TestPanel] Could not load notes');
    }
  }

  async function handleSave() {
    if (!note.trim()) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const newNote: TestNote = {
        page_url: pageInfo.url,
        page_title: pageInfo.title,
        category,
        note: note.trim(),
        user_id: user?.id,
      };

      const { error } = await supabase
        .from('test_notes')
        .insert(newNote);

      if (error) {
        // If table doesn't exist, save to localStorage as fallback
        if (error.code === '42P01') {
          const localNotes = JSON.parse(localStorage.getItem('test_notes_backup') || '[]');
          localNotes.push({ ...newNote, created_at: new Date().toISOString() });
          localStorage.setItem('test_notes_backup', JSON.stringify(localNotes));
          console.log('[TestPanel] Saved to localStorage (table not found)');
        } else {
          throw error;
        }
      }

      setNote('');
      setTodayCount(prev => prev + 1);
      
      // Visual feedback
      const btn = document.getElementById('test-save-btn');
      if (btn) {
        btn.textContent = '✅ Salvato!';
        setTimeout(() => { btn.textContent = '💾 Salva'; }, 1500);
      }
      
    } catch (e: any) {
      console.error('[TestPanel] Errore:', e);
      alert(`Errore: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Drag handlers
  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || 
        (e.target as HTMLElement).tagName === 'TEXTAREA' ||
        (e.target as HTMLElement).tagName === 'INPUT') return;
    
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

  // 🧪 BETA: Mostra sempre (solo check se disabilitato manualmente)
  if (!isEnabled) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 80, // Sopra la navbar mobile
          right: 20,
          zIndex: 99999,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          background: '#1e40af',
          color: 'white',
          fontSize: 20,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        title="Apri Test Panel"
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
        left: position.x,
        top: position.y,
        zIndex: 99999,
        width: isMinimized ? 200 : 280,
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#1e40af',
          color: 'white',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'grab',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13 }}>🧪 Test Companion</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
            }}
          >
            {isMinimized ? '▼' : '▲'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div style={{ padding: 12 }}>
          {/* Current page */}
          <div
            style={{
              background: '#f3f4f6',
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 11,
              color: '#374151',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>📍</span>
            <span style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {pageInfo.url || '/'}
            </span>
          </div>

          {/* Note input */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Scrivi osservazione..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) {
                handleSave();
              }
            }}
            style={{
              width: '100%',
              minHeight: 60,
              padding: 8,
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 13,
              resize: 'vertical',
              marginBottom: 10,
              cursor: 'text',
            }}
          />

          {/* Category selector */}
          <div style={{ 
            display: 'flex', 
            gap: 4, 
            marginBottom: 10,
            flexWrap: 'wrap',
          }}>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setCategory(key as NoteCategory)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: category === key ? `2px solid ${config.color}` : '1px solid #e5e7eb',
                  background: category === key ? `${config.color}15` : 'white',
                  cursor: 'pointer',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                {config.emoji} {config.label}
              </button>
            ))}
          </div>

          {/* Save button */}
          <button
            id="test-save-btn"
            onClick={handleSave}
            disabled={saving || !note.trim()}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: 'none',
              background: saving || !note.trim() ? '#9ca3af' : '#2563eb',
              color: 'white',
              fontWeight: 600,
              cursor: saving || !note.trim() ? 'not-allowed' : 'pointer',
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            {saving ? '⏳ Salvo...' : '💾 Salva'}
          </button>

          {/* Footer with count */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11, 
            color: '#6b7280',
            borderTop: '1px solid #e5e7eb',
            paddingTop: 8,
          }}>
            <span>📋 {todayCount} note oggi</span>
            <button
              onClick={() => {
                setShowRecent(!showRecent);
                if (!showRecent) loadRecentNotes();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontSize: 11,
                textDecoration: 'underline',
              }}
            >
              {showRecent ? 'Nascondi' : 'Vedi tutte'}
            </button>
          </div>

          {/* Recent notes */}
          {showRecent && (
            <div style={{
              marginTop: 8,
              maxHeight: 200,
              overflow: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
            }}>
              {recentNotes.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                  Nessuna nota salvata
                </div>
              ) : (
                recentNotes.map((n, i) => (
                  <div
                    key={n.id || i}
                    style={{
                      padding: 8,
                      borderBottom: i < recentNotes.length - 1 ? '1px solid #e5e7eb' : 'none',
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
                      <span>{CATEGORY_CONFIG[n.category as NoteCategory]?.emoji || '📝'}</span>
                      <span style={{ color: '#6b7280' }}>{n.page_url}</span>
                    </div>
                    <div style={{ color: '#111827' }}>{n.note}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Shortcut hint */}
          <div style={{ 
            textAlign: 'center', 
            fontSize: 10, 
            color: '#9ca3af',
            marginTop: 6,
          }}>
            ⌘+Enter per salvare veloce
          </div>
        </div>
      )}
    </div>
  );
}

