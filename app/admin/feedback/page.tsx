// app/admin/feedback/page.tsx
// Dashboard feedback tester per admin

import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';

type NoteCategory = 'bug' | 'miglioramento';

const CATEGORY_CONFIG: Record<string, { emoji: string; label: string; color: string; bgColor: string }> = {
  bug: { emoji: '🐛', label: 'Bug', color: '#dc2626', bgColor: '#fef2f2' },
  miglioramento: { emoji: '💡', label: 'Miglioramento', color: '#d97706', bgColor: '#fffbeb' },
  // Fallback per vecchie categorie
  ux: { emoji: '🎨', label: 'UX', color: '#7c3aed', bgColor: '#f5f3ff' },
  idea: { emoji: '💡', label: 'Idea', color: '#d97706', bgColor: '#fffbeb' },
  performance: { emoji: '⚡', label: 'Perf', color: '#059669', bgColor: '#ecfdf5' },
  altro: { emoji: '📝', label: 'Altro', color: '#6b7280', bgColor: '#f9fafb' },
};

export default async function AdminFeedbackPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/admin/login');

  const { data: me } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (me?.role !== 'admin') redirect('/');

  // Carica tutte le note di test
  const { data: notes } = await supabase
    .from('test_notes')
    .select('*')
    .order('created_at', { ascending: false });

  // Carica profili per i nomi
  const userIds = [...new Set((notes || []).map(n => n.user_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', userIds);

  const profileMap: Record<string, string> = {};
  (profiles || []).forEach(p => {
    profileMap[p.id] = `${p.first_name} ${p.last_name}`;
  });

  // Statistiche per categoria
  const categoryStats: Record<string, number> = {};
  (notes || []).forEach(n => {
    categoryStats[n.category] = (categoryStats[n.category] || 0) + 1;
  });

  // Statistiche per data (ultimi 7 giorni)
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentNotes = (notes || []).filter(n => new Date(n.created_at) >= weekAgo);

  // Statistiche per pagina
  const pageStats: Record<string, number> = {};
  (notes || []).forEach(n => {
    pageStats[n.page_url] = (pageStats[n.page_url] || 0) + 1;
  });
  const topPages = Object.entries(pageStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>🧪 Feedback Tester</h1>
        <Link href="/admin" style={{ color: '#6b7280', textDecoration: 'none' }}>← Pannello Admin</Link>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#eff6ff', padding: 20, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1e40af' }}>{notes?.length || 0}</div>
          <div style={{ fontSize: 13, color: '#3b82f6' }}>Note Totali</div>
        </div>
        <div style={{ background: '#fef2f2', padding: 20, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#dc2626' }}>{categoryStats['bug'] || 0}</div>
          <div style={{ fontSize: 13, color: '#ef4444' }}>🐛 Bug</div>
        </div>
        <div style={{ background: '#fffbeb', padding: 20, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#d97706' }}>{(categoryStats['miglioramento'] || 0) + (categoryStats['idea'] || 0)}</div>
          <div style={{ fontSize: 13, color: '#f59e0b' }}>💡 Miglioramenti</div>
        </div>
        <div style={{ background: '#ecfdf5', padding: 20, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#059669' }}>{recentNotes.length}</div>
          <div style={{ fontSize: 13, color: '#10b981' }}>Ultimi 7gg</div>
        </div>
      </div>

      {/* Top Pagine */}
      {topPages.length > 0 && (
        <div style={{ background: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>📍 Pagine più segnalate</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {topPages.map(([page, count]) => (
              <span key={page} style={{ 
                background: 'white', 
                padding: '6px 12px', 
                borderRadius: 6, 
                fontSize: 12,
                border: '1px solid #e5e7eb'
              }}>
                <strong>{page}</strong> ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lista Note */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>📋 Tutte le segnalazioni</h2>
        </div>
        
        {(!notes || notes.length === 0) ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p>Nessuna segnalazione ancora</p>
            <p style={{ fontSize: 13 }}>I tester possono usare il pannello 🧪 per inviare feedback</p>
          </div>
        ) : (
          <div style={{ maxHeight: 600, overflow: 'auto' }}>
            {notes.map((note) => {
              const cat = CATEGORY_CONFIG[note.category as NoteCategory] || CATEGORY_CONFIG.altro;
              return (
                <div 
                  key={note.id}
                  style={{ 
                    padding: 16, 
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    gap: 12,
                  }}
                >
                  {/* Badge categoria */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: cat.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}>
                    {cat.emoji}
                  </div>
                  
                  {/* Contenuto */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 600, 
                        color: cat.color,
                        background: cat.bgColor,
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}>
                        {cat.label}
                      </span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        {profileMap[note.user_id] || 'Utente'}
                      </span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>•</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>
                        {new Date(note.created_at).toLocaleString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    {/* Nota */}
                    <p style={{ margin: 0, color: '#111827', fontSize: 14, lineHeight: 1.5 }}>
                      {note.note}
                    </p>
                    
                    {/* Pagina */}
                    <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                      📍 {note.page_url}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info 
      <div style={{ marginTop: 24, padding: 16, background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1e40af' }}>
        💡 <strong>Nota:</strong> Esegui la migrazione <code>2025-12-11_test_notes_admin_access.sql</code> per abilitare la lettura di tutte le note.
      </div> */}
    </div>
  );
}
