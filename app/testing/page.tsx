// TestingChecklist.tsx
'use client';

import React, { useState, useEffect } from 'react';

type TestAnswer = 'yes' | 'no' | null;
type TestState = Record<string, { answer: TestAnswer; problem?: string }>;

export default function TestingChecklist() {
  const [state, setState] = useState<TestState>({});
  const [groupNotes, setGroupNotes] = useState<Record<string, string>>({});

  // ============================================================================
  // LOCALSTORAGE: Carica all'avvio
  // ============================================================================
  useEffect(() => {
    const saved = localStorage.getItem('reping-testing-checklist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.state) setState(parsed.state);
        if (parsed.groupNotes) setGroupNotes(parsed.groupNotes);
      } catch (e) {
        console.error('Errore caricamento localStorage:', e);
      }
    }
  }, []);

  // ============================================================================
  // LOCALSTORAGE: Salva automaticamente ad ogni modifica
  // ============================================================================
  useEffect(() => {
    const dataToSave = {
      state,
      groupNotes,
      lastSaved: new Date().toISOString(),
    };
    localStorage.setItem('reping-testing-checklist', JSON.stringify(dataToSave));
  }, [state, groupNotes]);
  const [groupNotes, setGroupNotes] = useState<Record<string, string>>({});

  const handleAnswer = (testId: string, answer: TestAnswer) => {
    setState(prev => ({
      ...prev,
      [testId]: { answer, problem: prev[testId]?.problem || '' }
    }));
  };

  const handleProblem = (testId: string, problem: string) => {
    setState(prev => ({
      ...prev,
      [testId]: { ...prev[testId], problem }
    }));
  };

  const resetAnswer = (testId: string) => {
    setState(prev => {
      const newState = { ...prev };
      delete newState[testId];
      return newState;
    });
  };

  const handleGroupNote = (groupId: string, note: string) => {
    setGroupNotes(prev => ({
      ...prev,
      [groupId]: note
    }));
  };

  // ============================================================================
  // EXPORT JSON: Scarica file con tutti i dati
  // ============================================================================
  const exportJSON = () => {
    const dataToExport = {
      state,
      groupNotes,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reping-testing-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ Sessione esportata!');
  };

  // ============================================================================
  // IMPORT JSON: Carica file salvato
  // ============================================================================
  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.state) setState(parsed.state);
          if (parsed.groupNotes) setGroupNotes(parsed.groupNotes);
          alert('✅ Sessione importata!');
        } catch (error) {
          alert('❌ Errore: file non valido');
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  };

  // ============================================================================
  // RESET ALL: Ricomincia da zero
  // ============================================================================
  const resetAll = () => {
    if (!confirm('⚠️ Eliminare TUTTI i dati della checklist?\n\nQuesta azione è irreversibile!')) return;
    
    setState({});
    setGroupNotes({});
    localStorage.removeItem('reping-testing-checklist');
    alert('✅ Checklist resettata!');
  };

  const getStats = () => {
    const answers = Object.values(state);
    const ok = answers.filter(a => a.answer === 'yes').length;
    const ko = answers.filter(a => a.answer === 'no').length;
    const total = testItems.length + layoutChecks.length;
    return { ok, ko, pending: total - ok - ko };
  };

  const exportResults = () => {
    let output = '# 🧪 RISULTATI TEST REPING\n\n';
    output += `Data: ${new Date().toLocaleDateString('it-IT')}\n\n`;
    
    const stats = getStats();
    output += `## 📊 Statistiche\n`;
    output += `- ✅ Test OK: ${stats.ok}\n`;
    output += `- ❌ Test KO: ${stats.ko}\n`;
    output += `- ⏳ Da testare: ${stats.pending}\n\n`;
    output += `---\n\n`;

    // Export per gruppo
    groups.forEach(group => {
      output += `## ${group.icon} ${group.title}\n\n`;
      
      // Layout check
      const layoutCheck = layoutChecks.find(c => c.group === group.id);
      if (layoutCheck) {
        const result = state[layoutCheck.id];
        if (result) {
          const symbol = result.answer === 'yes' ? '✅' : '❌';
          output += `${symbol} **LAYOUT**: ${layoutCheck.question}\n`;
          if (result.answer === 'no' && result.problem) {
            output += `   PROBLEMA: ${result.problem}\n`;
          }
          output += '\n';
        }
      }
      
      // Test items
      testItems
        .filter(test => test.group === group.id)
        .forEach(test => {
          const result = state[test.id];
          if (result) {
            const symbol = result.answer === 'yes' ? '✅' : '❌';
            output += `${symbol} ${test.label}\n`;
            if (result.answer === 'no' && result.problem) {
              output += `   PROBLEMA: ${result.problem}\n`;
            }
            output += '\n';
          }
        });
      
      // Note generali gruppo
      if (groupNotes[group.id]?.trim()) {
        output += `### 📝 Note Generali ${group.id}\n`;
        output += `${groupNotes[group.id]}\n\n`;
      }
      
      output += `---\n\n`;
    });

    navigator.clipboard.writeText(output);
    alert('✅ Risultati copiati negli appunti!');
  };

  const stats = getStats();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20, background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#111827', borderBottom: '3px solid #2563eb', paddingBottom: 10 }}>
        🧪 REPING - Checklist Testing Completa
      </h1>

      {/* Statistiche */}
      <div style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ padding: '8px 16px', borderRadius: 6, background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>
            ✅ OK: {stats.ok}
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
            ❌ KO: {stats.ko}
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 6, background: '#f3f4f6', color: '#374151', fontWeight: 600 }}>
            ⏳ Da testare: {stats.pending}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={exportResults}
            style={{
              background: '#2563eb',
              color: 'white',
              padding: '12px 24px',
              fontSize: 15,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            📋 Copia Risultati
          </button>
          
          <button
            onClick={exportJSON}
            style={{
              background: '#10b981',
              color: 'white',
              padding: '12px 24px',
              fontSize: 15,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            💾 Esporta Sessione
          </button>
          
          <button
            onClick={importJSON}
            style={{
              background: '#f59e0b',
              color: 'white',
              padding: '12px 24px',
              fontSize: 15,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            📂 Importa Sessione
          </button>
          
          <button
            onClick={resetAll}
            style={{
              background: '#ef4444',
              color: 'white',
              padding: '12px 24px',
              fontSize: 15,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🗑️ Reset All
          </button>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#6b7280' }}>
          💾 Salvataggio automatico attivo
        </div>
      </div>

      {/* Gruppi di test */}
      {groups.map(group => (
        <div key={group.id} style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2563eb', marginTop: 0 }}>
            {group.icon} {group.title}
          </h2>

          {/* Layout Check per questo gruppo */}
          {layoutChecks
            .filter(check => check.group === group.id)
            .map(check => (
              <LayoutCheck
                key={check.id}
                check={check}
                state={state[check.id]}
                onAnswer={(answer) => handleAnswer(check.id, answer)}
                onProblem={(problem) => handleProblem(check.id, problem)}
                onReset={() => resetAnswer(check.id)}
              />
            ))}

          {/* Test items per questo gruppo */}
          {testItems
            .filter(test => test.group === group.id)
            .map(test => (
              <TestItem
                key={test.id}
                test={test}
                state={state[test.id]}
                onAnswer={(answer) => handleAnswer(test.id, answer)}
                onProblem={(problem) => handleProblem(test.id, problem)}
                onReset={() => resetAnswer(test.id)}
              />
            ))}

          {/* Note Generali Gruppo */}
          <div style={{
            marginTop: 20,
            paddingTop: 20,
            borderTop: '2px solid #e5e7eb',
          }}>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 8,
            }}>
              📝 Note Generali - Miglioramenti & Osservazioni
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              Qui puoi annotare suggerimenti, modifiche desiderate o osservazioni generali su questo gruppo (anche se non sono errori)
            </div>
            <textarea
              value={groupNotes[group.id] || ''}
              onChange={(e) => handleGroupNote(group.id, e.target.value)}
              placeholder="Es: L'ordine dei bottoni potrebbe essere migliorato, aggiungerei un filtro per..., la sezione è poco visibile..."
              style={{
                width: '100%',
                minHeight: 100,
                padding: 12,
                border: '2px solid #d1d5db',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENTI UI
// ============================================================================

type LayoutCheckProps = {
  check: { id: string; group: string; question: string };
  state?: { answer: TestAnswer; problem?: string };
  onAnswer: (answer: TestAnswer) => void;
  onProblem: (problem: string) => void;
  onReset: () => void;
};

function LayoutCheck({ check, state, onAnswer, onProblem, onReset }: LayoutCheckProps) {
  return (
    <div style={{
      background: '#fffbeb',
      border: '2px solid #fbbf24',
      borderRadius: 6,
      padding: 12,
      marginBottom: 20
    }}>
      <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 8, fontSize: 14 }}>
        ⚙️ LAYOUT: {check.question}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Button
          variant={state?.answer === 'yes' ? 'yes-active' : 'yes'}
          onClick={() => onAnswer('yes')}
        >
          ✅ Sì
        </Button>
        <Button
          variant={state?.answer === 'no' ? 'no-active' : 'no'}
          onClick={() => onAnswer('no')}
        >
          ❌ No
        </Button>
        <Button variant="reset" onClick={onReset}>↻</Button>
      </div>
      {state?.answer === 'no' && (
        <textarea
          value={state?.problem || ''}
          onChange={(e) => onProblem(e.target.value)}
          placeholder="Descrivi il problema di layout..."
          style={{
            width: '100%',
            minHeight: 80,
            padding: 10,
            border: '2px solid #fca5a5',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      )}
    </div>
  );
}

type TestItemProps = {
  test: { id: string; group: string; label: string };
  state?: { answer: TestAnswer; problem?: string };
  onAnswer: (answer: TestAnswer) => void;
  onProblem: (problem: string) => void;
  onReset: () => void;
};

function TestItem({ test, state, onAnswer, onProblem, onReset }: TestItemProps) {
  return (
    <div style={{ borderBottom: '1px solid #e5e7eb', padding: '12px 0' }}>
      <div style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>
        {test.label}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Button
          variant={state?.answer === 'yes' ? 'yes-active' : 'yes'}
          onClick={() => onAnswer('yes')}
        >
          ✅ Sì
        </Button>
        <Button
          variant={state?.answer === 'no' ? 'no-active' : 'no'}
          onClick={() => onAnswer('no')}
        >
          ❌ No
        </Button>
        <Button variant="reset" onClick={onReset}>↻</Button>
      </div>
      {state?.answer === 'no' && (
        <textarea
          value={state?.problem || ''}
          onChange={(e) => onProblem(e.target.value)}
          placeholder="Descrivi il problema (errore console, comportamento atteso vs reale, contesto...)..."
          style={{
            width: '100%',
            minHeight: 80,
            padding: 10,
            border: '2px solid #fca5a5',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      )}
    </div>
  );
}

type ButtonProps = {
  variant: 'yes' | 'yes-active' | 'no' | 'no-active' | 'reset';
  onClick: () => void;
  children: React.ReactNode;
};

function Button({ variant, onClick, children }: ButtonProps) {
  const styles: Record<ButtonProps['variant'], React.CSSProperties> = {
    yes: { background: '#10b981', color: 'white' },
    'yes-active': { background: '#059669', color: 'white', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' },
    no: { background: '#ef4444', color: 'white' },
    'no-active': { background: '#dc2626', color: 'white', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' },
    reset: { background: '#6b7280', color: 'white', fontSize: 11, padding: '4px 10px' },
  };

  return (
    <button
      onClick={onClick}
      style={{
        ...styles[variant],
        padding: '6px 16px',
        borderRadius: 6,
        border: 'none',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: 13,
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ============================================================================
// DATI TEST
// ============================================================================

const groups = [
  { id: 'A', icon: '📱', title: 'GRUPPO A: AUTENTICAZIONE & PROFILO' },
  { id: 'B', icon: '🎛️', title: 'GRUPPO B: NAVIGAZIONE & DRAWER' },
  { id: 'C', icon: '📊', title: 'GRUPPO C: DRAWER GESTIONE - TAB USCITE' },
  { id: 'D', icon: '👥', title: 'GRUPPO D: DRAWER GESTIONE - TAB CLIENTI' },
  { id: 'E', icon: '📦', title: 'GRUPPO E: DRAWER GESTIONE - TAB PRODOTTI' },
  { id: 'F', icon: '📄', title: 'GRUPPO F: DRAWER DOCUMENTI - ACCORDION' },
  { id: 'G', icon: '📌', title: 'GRUPPO G: PROMEMORIA (COMPLETO)' },
  { id: 'H', icon: '📊', title: 'GRUPPO H: STORICO REPORT & GENERAZIONE PDF' },
  { id: 'I', icon: '🗺️', title: 'GRUPPO I: PLANNING VISITE' },
  { id: 'J', icon: '💬', title: 'GRUPPO J: CHAT & AI' },
  { id: 'K', icon: '🎤', title: 'GRUPPO K: VOICE INPUT' },
];

const layoutChecks = [
  { id: 'layout-A', group: 'A', question: 'Pagina Login e TopBar correttamente visualizzati?' },
  { id: 'layout-B', group: 'B', question: 'Drawer sinistro e destro scorrono bene? Backdrop visibile?' },
  { id: 'layout-C', group: 'C', question: 'Tab Gestione ben allineati? Sezione Uscite leggibile?' },
  { id: 'layout-D', group: 'D', question: 'Sezione Clienti ben organizzata? Bottoni chiari?' },
  { id: 'layout-E', group: 'E', question: 'Sezione Prodotti visibile e funzionale?' },
  { id: 'layout-F', group: 'F', question: 'Accordion Documenti chiaro? Sezioni ben separate?' },
  { id: 'layout-G', group: 'G', question: 'Promemoria ben visualizzati? Form chiaro? Widget home leggibile?' },
  { id: 'layout-H', group: 'H', question: 'Storico report ben organizzato? Card documenti chiare?' },
  { id: 'layout-I', group: 'I', question: 'Planning visite ben visualizzato? Liste clienti chiare?' },
  { id: 'layout-J', group: 'J', question: 'Chat leggibile? Messaggi ben distinti? Composer funzionale?' },
  { id: 'layout-K', group: 'K', question: 'Icona microfono visibile? Feedback vocale chiaro?' },
];

const testItems = [
  // GRUPPO A
  { id: 'A1', group: 'A', label: '✅ A.1 - Login con email/password corrette → Accesso riuscito' },
  { id: 'A2', group: 'A', label: '✅ A.2 - Login con credenziali errate → Errore visualizzato' },
  { id: 'A3', group: 'A', label: '✅ A.3 - Logout dall\'app → Redirect a /login' },
  { id: 'A4', group: 'A', label: '✅ A.4 - Nome/Cognome visualizzati in TopBar' },
  { id: 'A5', group: 'A', label: '✅ A.5 - Email corretta visualizzata' },

  // GRUPPO B
  { id: 'B1', group: 'B', label: '✅ B.1 - Click hamburger menu → Drawer sinistro si apre' },
  { id: 'B2', group: 'B', label: '✅ B.2 - Lista sessioni conversazione visibile' },
  { id: 'B3', group: 'B', label: '✅ B.3 - Click su sessione → Carica conversazione' },
  { id: 'B4', group: 'B', label: '✅ B.4 - Bottone ↻ → Ricarica lista' },
  { id: 'B5', group: 'B', label: '✅ B.5 - Click fuori drawer → Drawer si chiude' },
  { id: 'B6', group: 'B', label: '✅ B.6 - Bottone "Chiudi" → Drawer si chiude' },
  { id: 'B7', group: 'B', label: '✅ B.7 - "Crea nuova sessione" → Prompt titolo → Sessione creata' },
  { id: 'B8', group: 'B', label: '✅ B.8 - Click 🗑️ → Conferma → Sessione eliminata' },
  { id: 'B9', group: 'B', label: '✅ B.9 - Click "Gestione" → Drawer destro si apre su Dati' },
  { id: 'B10', group: 'B', label: '✅ B.10 - Click "Documenti" → Drawer destro si apre su Docs' },
  { id: 'B11', group: 'B', label: '✅ B.11 - Click "Impostazioni" → Drawer destro si apre su Impostazioni' },

  // GRUPPO C
  { id: 'C1', group: 'C', label: '✅ C.1 - Apertura drawer Gestione → Tab USCITE aperta di default' },
  { id: 'C2', group: 'C', label: '✅ C.2 - Ordine tab corretto: USCITE | CLIENTI | PRODOTTI' },
  { id: 'C3', group: 'C', label: '✅ C.3 - Click tab CLIENTI → Passa a sezione clienti' },
  { id: 'C4', group: 'C', label: '✅ C.4 - Click tab PRODOTTI → Passa a sezione prodotti' },
  { id: 'C5', group: 'C', label: '✅ C.5 - Click "📅 Visite & Chiamate" → Vai a /visits' },
  { id: 'C6', group: 'C', label: '✅ C.6 - Click "➕ Nuova visita" → Vai a /tools/add-visit' },
  { id: 'C7', group: 'C', label: '✅ C.7 - Click "🗺️ Planning Visite" (verde) → Vai a /planning' },

  // GRUPPO D
  { id: 'D1', group: 'D', label: '✅ D.1 - Click "📋 Lista clienti" → Vai a /clients' },
  { id: 'D2', group: 'D', label: '✅ D.2 - Click "➕ Aggiungi singolo" (blu) → Vai a /tools/quick-add-client' },
  { id: 'D3', group: 'D', label: '✅ D.3 - Click "📥 Importa lista" → Vai a /tools/import-clients' },
  { id: 'D4', group: 'D', label: '✅ D.4 - Form quick-add compilato → Cliente salvato' },
  { id: 'D5', group: 'D', label: '✅ D.5 - Cliente salvato appare in lista clienti' },
  { id: 'D6', group: 'D', label: '✅ D.6 - Dati cliente cifrati (non visibili in DB raw)' },

  // GRUPPO E
  { id: 'E1', group: 'E', label: '✅ E.1 - Sezione Prodotti visibile in tab' },
  { id: 'E2', group: 'E', label: '✅ E.2 - ProductManager (import) visibile' },

  // GRUPPO F
  { id: 'F1', group: 'F', label: '✅ F.1 - Apertura drawer Documenti → Sezione PROMEMORIA aperta di default' },
  { id: 'F2', group: 'F', label: '✅ F.2 - 3 sezioni visibili: PROMEMORIA, STORICO REPORT, GENERA REPORT' },
  { id: 'F3', group: 'F', label: '✅ F.3 - Click header sezione → Apre/chiude (accordion)' },
  { id: 'F4', group: 'F', label: '✅ F.4 - Una sola sezione aperta alla volta' },
  { id: 'F5', group: 'F', label: '✅ F.5 - Icone ▼/▶ cambiano correttamente' },

  // GRUPPO G
  { id: 'G1', group: 'G', label: '✅ G.1 - Bottone "➕ Nuovo Promemoria" visibile in sezione Promemoria' },
  { id: 'G2', group: 'G', label: '✅ G.2 - Click "Nuovo Promemoria" → Form full-screen si apre' },
  { id: 'G3', group: 'G', label: '✅ G.3 - Form: campo Nota funzionante' },
  { id: 'G4', group: 'G', label: '✅ G.4 - Form: toggle Urgente funzionante (rosso/bianco)' },
  { id: 'G5', group: 'G', label: '✅ G.5 - Form: bottone Salva → Promemoria creato' },
  { id: 'G6', group: 'G', label: '✅ G.6 - Form: bottone Annulla → Form si chiude senza salvare' },
  { id: 'G7', group: 'G', label: '✅ G.7 - Promemoria salvato appare in lista' },
  { id: 'G8', group: 'G', label: '✅ G.8 - Lista: due gruppi visibili (🔴 URGENTI e ⚪ NORMALI)' },
  { id: 'G9', group: 'G', label: '✅ G.9 - Lista: promemoria urgenti appaiono in gruppo URGENTI (rosso)' },
  { id: 'G10', group: 'G', label: '✅ G.10 - Lista: promemoria normali appaiono in gruppo NORMALI (bianco)' },
  { id: 'G11', group: 'G', label: '✅ G.11 - Lista: ordinamento corretto (più vecchi prima in ogni gruppo)' },
  { id: 'G12', group: 'G', label: '✅ G.12 - Click su promemoria → Expand inline (mostra testo completo)' },
  { id: 'G13', group: 'G', label: '✅ G.13 - Expanded: bottoni ✏️ Modifica e 🗑️ Elimina visibili' },
  { id: 'G14', group: 'G', label: '✅ G.14 - Click ✏️ Modifica → Form si apre pre-compilato' },
  { id: 'G15', group: 'G', label: '✅ G.15 - Modifica e salva → Promemoria aggiornato in lista' },
  { id: 'G16', group: 'G', label: '✅ G.16 - Click 🗑️ Elimina → Conferma → Promemoria eliminato' },
  { id: 'G17', group: 'G', label: '✅ G.17 - Widget Home: visibile quando thread vuoto' },
  { id: 'G18', group: 'G', label: '✅ G.18 - Widget Home: se ci sono promemoria → Mostra primi 3 più vecchi' },
  { id: 'G19', group: 'G', label: '✅ G.19 - Widget Home: se nessun promemoria → "Nessun promemoria [➕]"' },
  { id: 'G20', group: 'G', label: '✅ G.20 - Widget Home: click "Vedi tutti" → Apre drawer Documenti su Promemoria' },
  { id: 'G21', group: 'G', label: '✅ G.21 - Widget Home: click [➕] quando nessun promemoria → Apre drawer' },

  // GRUPPO H
  { id: 'H1', group: 'H', label: '✅ H.1 - Sezione Storico Report: lista documenti visibile' },
  { id: 'H2', group: 'H', label: '✅ H.2 - Documenti divisi per tipo (Report Planning, Liste Clienti)' },
  { id: 'H3', group: 'H', label: '✅ H.3 - Ogni documento mostra: titolo, data, dimensione file' },
  { id: 'H4', group: 'H', label: '✅ H.4 - Click "📂 Info" su documento → Alert con dettagli' },
  { id: 'H5', group: 'H', label: '✅ H.5 - Click "🗑️" su documento → Conferma → Documento eliminato da lista' },
  { id: 'H6', group: 'H', label: '✅ H.6 - Sezione Genera Report: bottone "Genera Nuovo Report" visibile' },
  { id: 'H7', group: 'H', label: '✅ H.7 - Click "Genera Report" → Modale filtri si apre' },
  { id: 'H8', group: 'H', label: '✅ H.8 - Filtri selezionati → PDF generato e scaricato' },
  { id: 'H9', group: 'H', label: '✅ H.9 - Dopo generazione → Accordion si apre su Storico Report' },
  { id: 'H10', group: 'H', label: '✅ H.10 - Report generato appare in Storico Report' },

  // GRUPPO I
  { id: 'I1', group: 'I', label: '✅ I.1 - Pagina /planning carica correttamente' },
  { id: 'I2', group: 'I', label: '✅ I.2 - Modalità Smart e Avanzata disponibili' },
  { id: 'I3', group: 'I', label: '✅ I.3 - Smart: suggerimenti AI basati su latency, distance, revenue' },
  { id: 'I4', group: 'I', label: '✅ I.4 - Avanzata: selezione manuale clienti + scoring AI' },
  { id: 'I5', group: 'I', label: '✅ I.5 - Planning creato → Lista visite disponibile' },
  { id: 'I6', group: 'I', label: '✅ I.6 - Click "Esegui Planning" → Modal esecuzione sequenziale' },
  { id: 'I7', group: 'I', label: '✅ I.7 - Esecuzione: visite processate una alla volta' },
  { id: 'I8', group: 'I', label: '✅ I.8 - Opzioni: Salta, Posticipa, Completa funzionanti' },
  { id: 'I9', group: 'I', label: '✅ I.9 - PDF report planning generabile' },

  // GRUPPO J
  { id: 'J1', group: 'J', label: '✅ J.1 - Chat: invio messaggio → Risposta AI ricevuta' },
  { id: 'J2', group: 'J', label: '✅ J.2 - Messaggi utente e AI ben distinti visivamente' },
  { id: 'J3', group: 'J', label: '✅ J.3 - Scroll automatico a nuovo messaggio' },
  { id: 'J4', group: 'J', label: '✅ J.4 - Composer: textarea espandibile funzionante' },
  { id: 'J5', group: 'J', label: '✅ J.5 - Bottone invio abilitato solo con testo' },
  { id: 'J6', group: 'J', label: '✅ J.6 - AI: context aware (conosce clienti, visite, planning)' },
  { id: 'J7', group: 'J', label: '✅ J.7 - AI: legge promemoria per suggerimenti contestuali' },

  // GRUPPO K
  { id: 'K1', group: 'K', label: '✅ K.1 - Icona microfono visibile in Composer' },
  { id: 'K2', group: 'K', label: '✅ K.2 - Click microfono → Registrazione parte' },
  { id: 'K3', group: 'K', label: '✅ K.3 - Feedback visivo durante registrazione (rosso pulsante)' },
  { id: 'K4', group: 'K', label: '✅ K.4 - Stop registrazione → Trascrizione ricevuta' },
  { id: 'K5', group: 'K', label: '✅ K.5 - Testo trascritto appare in textarea' },
  { id: 'K6', group: 'K', label: '✅ K.6 - Intent recognition funzionante (es: "chiama cliente X")' },
  { id: 'K7', group: 'K', label: '✅ K.7 - TTS: risposta AI letta ad alta voce (se abilitato)' },
];
