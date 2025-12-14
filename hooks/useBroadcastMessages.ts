// hooks/useBroadcastMessages.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

type BroadcastMessage = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
};

export function useBroadcastMessages() {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<BroadcastMessage | null>(null);

  // Carica messaggi non letti
  const loadUnreadMessages = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Ottieni tutti i messaggi broadcast attivi
      const { data: allMessages, error: messagesError } = await supabase
        .from('broadcast_messages')
        .select('id, title, message, type')
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;
      if (!allMessages || allMessages.length === 0) return;

      // Ottieni i messaggi già letti dall'utente
      const { data: readMessages, error: readError } = await supabase
        .from('broadcast_messages_read')
        .select('message_id')
        .eq('user_id', user.id);

      if (readError) throw readError;

      // Filtra messaggi non letti
      const readIds = new Set((readMessages || []).map(r => r.message_id));
      const unread = allMessages.filter(m => !readIds.has(m.id));

      setMessages(unread);

      // Mostra il primo messaggio
      if (unread.length > 0) {
        setCurrentMessage(unread[0]);
      }
    } catch (e) {
      console.error('[Broadcast] Errore caricamento:', e);
    }
  }, []);

  // Marca messaggio come letto
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('broadcast_messages_read')
        .insert({
          message_id: messageId,
          user_id: user.id,
        });

      if (error && !error.message.includes('duplicate')) {
        throw error;
      }

      // Rimuovi messaggio dalla lista
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      // Mostra prossimo messaggio se esiste
      const remaining = messages.filter(m => m.id !== messageId);
      if (remaining.length > 0) {
        setTimeout(() => {
          setCurrentMessage(remaining[0]);
        }, 500);
      } else {
        setCurrentMessage(null);
      }
    } catch (e) {
      console.error('[Broadcast] Errore marca come letto:', e);
    }
  }, [messages]);

  // Carica all'avvio
  useEffect(() => {
    loadUnreadMessages();
  }, [loadUnreadMessages]);

  return {
    currentMessage,
    remainingCount: messages.length,
    markAsRead,
  };
}

