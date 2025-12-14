// app/admin/broadcast/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type BroadcastMessage = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  target_roles: string[];
  expires_at: string | null;
  created_at: string;
  read_count?: number;
  total_recipients?: number;
};

export default function BroadcastMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [targetRoles, setTargetRoles] = useState<string[]>(['tester']);
  const [expiresIn, setExpiresIn] = useState<number>(7); // giorni
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      const { data, error } = await supabase
        .from('broadcast_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Carica statistiche lettura per ogni messaggio
      const messagesWithStats = await Promise.all(
        (data || []).map(async (msg) => {
          const { count: readCount } = await supabase
            .from('broadcast_messages_read')
            .select('id', { count: 'exact', head: true })
            .eq('message_id', msg.id);

          // Conta potenziali destinatari
          const { count: totalRecipients } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .in('role', msg.target_roles);

          return {
            ...msg,
            read_count: readCount || 0,
            total_recipients: totalRecipients || 0,
          };
        })
      );

      setMessages(messagesWithStats);
    } catch (e) {
      console.error('Errore caricamento messaggi:', e);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!title.trim() || !message.trim()) {
      alert('Titolo e messaggio sono obbligatori');
      return;
    }

    if (targetRoles.length === 0) {
      alert('Seleziona almeno un ruolo destinatario');
      return;
    }

    setSending(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Non autenticato');

      const expiresAt = expiresIn > 0 
        ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('broadcast_messages')
        .insert({
          created_by: user.user.id,
          title,
          message,
          type,
          target_roles: targetRoles,
          expires_at: expiresAt,
        });

      if (error) throw error;

      alert('✅ Messaggio inviato con successo!');
      
      // Reset form
      setTitle('');
      setMessage('');
      setType('info');
      setTargetRoles(['tester']);
      setExpiresIn(7);
      setShowForm(false);

      // Ricarica lista
      loadMessages();
    } catch (e: any) {
      console.error('Errore invio messaggio:', e);
      alert(`❌ Errore: ${e.message}`);
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm('Sei sicuro di voler eliminare questo messaggio?')) return;

    try {
      const { error } = await supabase
        .from('broadcast_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('✅ Messaggio eliminato');
      loadMessages();
    } catch (e: any) {
      alert(`❌ Errore: ${e.message}`);
    }
  }

  const typeColors = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    success: { bg: '#f0fdf4', border: '#10b981', text: '#047857' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  };

  const typeIcons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div>Caricamento...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
            📢 Broadcast Messaggi Beta
          </h1>
          <Link 
            href="/admin" 
            style={{ 
              padding: '8px 16px', 
              background: '#f3f4f6', 
              borderRadius: 8, 
              textDecoration: 'none', 
              color: '#111827',
              fontSize: 14,
            }}
          >
            ← Indietro
          </Link>
        </div>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
          Invia messaggi a tutti i tester per comunicare aggiornamenti, fix e nuove feature
        </p>
      </div>

      {/* Bottone Nuovo Messaggio */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 24,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }}
        >
          ➕ Nuovo Messaggio
        </button>
      )}

      {/* Form Nuovo Messaggio */}
      {showForm && (
        <div style={{ 
          background: 'white', 
          padding: 24, 
          borderRadius: 16, 
          border: '1px solid #e5e7eb',
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>✍️ Nuovo Messaggio</h2>

          {/* Titolo */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Titolo *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es: Nuova feature: Creazione clienti vocale!"
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>

          {/* Messaggio */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Messaggio *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descrivi l'aggiornamento o il fix..."
              rows={4}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Tipo
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['info', 'success', 'warning', 'error'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    padding: '8px 16px',
                    border: type === t ? '2px solid' : '1px solid #d1d5db',
                    borderColor: type === t ? typeColors[t].border : '#d1d5db',
                    background: type === t ? typeColors[t].bg : 'white',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: type === t ? 600 : 400,
                  }}
                >
                  {typeIcons[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Target Ruoli */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Destinatari
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['tester', 'premium', 'business'].map((role) => (
                <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={targetRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTargetRoles([...targetRoles, role]);
                      } else {
                        setTargetRoles(targetRoles.filter(r => r !== role));
                      }
                    }}
                  />
                  <span style={{ fontSize: 14 }}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Scadenza */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Scadenza
            </label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(Number(e.target.value))}
              style={{
                padding: 10,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              <option value={1}>1 giorno</option>
              <option value={3}>3 giorni</option>
              <option value={7}>1 settimana</option>
              <option value={14}>2 settimane</option>
              <option value={30}>1 mese</option>
              <option value={0}>Mai (permanente)</option>
            </select>
          </div>

          {/* Azioni */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={sendMessage}
              disabled={sending}
              style={{
                padding: '12px 24px',
                background: sending ? '#9ca3af' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? '⏳ Invio...' : '📤 Invia Messaggio'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              disabled={sending}
              style={{
                padding: '12px 24px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista Messaggi */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          📋 Messaggi Inviati ({messages.length})
        </h2>

        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div>Nessun messaggio inviato ancora</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg) => {
              const colors = typeColors[msg.type];
              const icon = typeIcons[msg.type];
              const isExpired = msg.expires_at && new Date(msg.expires_at) < new Date();

              return (
                <div
                  key={msg.id}
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: 16,
                    opacity: isExpired ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 20 }}>{icon}</span>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>
                          {msg.title}
                        </h3>
                        {isExpired && (
                          <span style={{ 
                            fontSize: 11, 
                            padding: '2px 8px', 
                            background: '#6b7280', 
                            color: 'white', 
                            borderRadius: 12,
                          }}>
                            SCADUTO
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 14, color: colors.text, margin: '8px 0', whiteSpace: 'pre-wrap' }}>
                        {msg.message}
                      </p>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', marginTop: 12 }}>
                        <span>👥 {msg.target_roles.join(', ')}</span>
                        <span>📊 {msg.read_count}/{msg.total_recipients} letto</span>
                        <span>📅 {new Date(msg.created_at).toLocaleString('it-IT', { 
                          day: '2-digit', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                        {msg.expires_at && (
                          <span>⏰ Scade: {new Date(msg.expires_at).toLocaleDateString('it-IT')}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#fef2f2',
                        border: '1px solid #ef4444',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#991b1b',
                        cursor: 'pointer',
                        marginLeft: 12,
                      }}
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

