"use client";
import React, { RefObject, useEffect, useState, useRef } from "react";

type Bubble = { role: "user" | "assistant"; content: string };

type Props = {
  bubbles: Bubble[];
  serverError?: string | null;
  threadRef?: RefObject<HTMLDivElement>;
  endRef?: RefObject<HTMLDivElement>;
  onOpenDrawer?: () => void;
  isSending?: boolean;
};

// 🆕 Componente bottone PDF
function PdfDownloadButton({ command }: { command: any }) {
  const handleDownload = async () => {
    try {
      // Dispatch evento per generare PDF
      window.dispatchEvent(new CustomEvent('repping:generatePdf', { 
        detail: command 
      }));
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };
  
  return (
    <button
      onClick={handleDownload}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        marginTop: 8,
      }}
    >
      📥 Scarica PDF
    </button>
  );
}

// 🆕 Semplice parser markdown inline
function renderMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  
  // Controlla se c'è un comando PDF
  const pdfMatch = text.match(/\[PDF_COMMAND:(.+?)\]/);
  let pdfCommand: any = null;
  if (pdfMatch) {
    try {
      pdfCommand = JSON.parse(pdfMatch[1]);
      text = text.replace(pdfMatch[0], ''); // Rimuovi il marker dal testo
    } catch {}
  }
  
  // Split per righe prima
  const lines = text.split('\n');
  
  lines.forEach((line, lineIdx) => {
    // Processa ogni riga per markdown inline
    let processed = line;
    const lineElements: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Regex per bold (**text**), italic (*text*), e link [text](url)
    const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
    let match: RegExpExecArray | null;
    
    while ((match = regex.exec(processed)) !== null) {
      // Aggiungi testo prima del match
      if (match.index > lastIndex) {
        lineElements.push(processed.slice(lastIndex, match.index));
      }
      
      if (match[1]) {
        // Bold: **text**
        lineElements.push(<strong key={`b-${lineIdx}-${match.index}`}>{match[2]}</strong>);
      } else if (match[3]) {
        // Italic: *text*
        lineElements.push(<em key={`i-${lineIdx}-${match.index}`}>{match[4]}</em>);
      } else if (match[5]) {
        // Link: [text](url)
        const linkText = match[6];
        const linkUrl = match[7];
        lineElements.push(
          <a 
            key={`l-${lineIdx}-${match.index}`}
            href={linkUrl}
            style={{ color: 'var(--link, #3b82f6)', textDecoration: 'underline' }}
            onClick={(e) => {
              // Se è link interno, usa navigation
              if (linkUrl.startsWith('/')) {
                e.preventDefault();
                window.location.href = linkUrl;
              }
            }}
          >
            {linkText}
          </a>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Aggiungi resto del testo
    if (lastIndex < processed.length) {
      lineElements.push(processed.slice(lastIndex));
    }
    
    // Se la riga è vuota, aggiungi solo il contenuto
    if (lineElements.length === 0) {
      lineElements.push('');
    }
    
    elements.push(
      <React.Fragment key={`line-${lineIdx}`}>
        {lineElements}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
  
  // Aggiungi bottone PDF se presente
  if (pdfCommand) {
    elements.push(
      <React.Fragment key="pdf-button">
        <br />
        <PdfDownloadButton command={pdfCommand} />
      </React.Fragment>
    );
  }
  
  return elements;
}

// 🆕 Componente per effetto typing progressivo
function TypedMessage({ content, isNew }: { content: string; isNew: boolean }) {
  const [displayedText, setDisplayedText] = useState(isNew ? '' : content);
  const [isTyping, setIsTyping] = useState(isNew);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isNew) {
      setDisplayedText(content);
      return;
    }

    // Reset per nuovo messaggio
    indexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);

    // Typing effect: ~30 caratteri al secondo
    const interval = setInterval(() => {
      if (indexRef.current < content.length) {
        // Aggiungi più caratteri alla volta per velocità
        const charsToAdd = Math.min(3, content.length - indexRef.current);
        setDisplayedText(content.slice(0, indexRef.current + charsToAdd));
        indexRef.current += charsToAdd;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [content, isNew]);

  return (
    <>
      {renderMarkdown(displayedText)}
      {isTyping && <span className="typing-cursor">▋</span>}
      <style jsx>{`
        .typing-cursor {
          animation: blink 0.7s infinite;
          color: #6b7280;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}

export default function Thread({ bubbles, serverError, threadRef, endRef, onOpenDrawer, isSending }: Props) {
  // Traccia l'ultimo messaggio per sapere quali sono "nuovi"
  const lastBubbleCountRef = useRef(0);
  const [newMessageIndex, setNewMessageIndex] = useState<number | null>(null);

  useEffect(() => {
    // Se c'è un nuovo messaggio assistant, segnalo come "nuovo" per il typing effect
    if (bubbles.length > lastBubbleCountRef.current) {
      const lastBubble = bubbles[bubbles.length - 1];
      if (lastBubble?.role === 'assistant') {
        setNewMessageIndex(bubbles.length - 1);
        // Reset dopo che il typing è completato (stima: lunghezza / 150 * 1000 ms)
        const typingDuration = Math.min(5000, (lastBubble.content.length / 150) * 1000 + 500);
        setTimeout(() => setNewMessageIndex(null), typingDuration);
      }
    }
    lastBubbleCountRef.current = bubbles.length;
  }, [bubbles]);

  // Auto-scroll quando arrivano nuovi messaggi o durante typing
  useEffect(() => {
    if (endRef?.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [bubbles, isSending, endRef]);

  return (
    <div className="thread" ref={threadRef}>
      {bubbles.map((m, i) => (
        <div key={i} className={`msg ${m.role === "user" ? "me" : ""}`}>
          {m.role === 'assistant' ? (
            <TypedMessage 
              content={m.content} 
              isNew={i === newMessageIndex} 
            />
          ) : (
            // User messages: mostra subito (con markdown)
            renderMarkdown(m.content)
          )}
        </div>
      ))}

      {/* TYPING INDICATOR (mentre aspetta risposta) */}
      {isSending && (
        <div className="msg" style={{ opacity: 0.7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', gap: 4 }}>
              <span style={{ 
                width: 8, height: 8, borderRadius: '50%', background: '#6b7280',
                animation: 'bounce 1.4s ease-in-out infinite', animationDelay: '0s',
              }} />
              <span style={{ 
                width: 8, height: 8, borderRadius: '50%', background: '#6b7280',
                animation: 'bounce 1.4s ease-in-out infinite', animationDelay: '0.2s',
              }} />
              <span style={{ 
                width: 8, height: 8, borderRadius: '50%', background: '#6b7280',
                animation: 'bounce 1.4s ease-in-out infinite', animationDelay: '0.4s',
              }} />
            </span>
            <span style={{ color: '#6b7280', fontSize: 14 }}>Sto pensando...</span>
          </div>
          <style jsx>{`
            @keyframes bounce {
              0%, 60%, 100% { transform: translateY(0); }
              30% { transform: translateY(-6px); }
            }
          `}</style>
        </div>
      )}

      {serverError && (
        <div className="helper" style={{ 
          color: "#DC2626", background: '#FEF2F2', 
          padding: '12px 16px', borderRadius: 8,
          border: '1px solid #FECACA', marginTop: 8,
        }}>
          ⚠️ {serverError}
        </div>
      )}
      
      <div ref={endRef} style={{ height: 150 }} />
    </div>
  );
}
