// app/admin/users/UserRoleSelector.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = {
  userId: string;
  currentRole: string;
  isCurrentUser: boolean;
};

const roles = [
  { value: 'agente', label: '💼 Agente', color: '#2563eb' },
  { value: 'agente_premium', label: '⭐ Premium', color: '#059669' },
  { value: 'admin', label: '👑 Admin', color: '#7c3aed' },
];

export default function UserRoleSelector({ userId, currentRole, isCurrentUser }: Props) {
  const [role, setRole] = useState(currentRole === 'venditore' ? 'agente' : currentRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newRole: string) {
    if (newRole === role) return;
    
    // Conferma per cambio admin
    if (newRole === 'admin') {
      if (!confirm('Sei sicuro di voler promuovere questo utente ad Admin? Gli admin possono vedere tutti i dati.')) {
        return;
      }
    }
    
    // Non permettere di togliersi admin da soli
    if (isCurrentUser && role === 'admin' && newRole !== 'admin') {
      alert('Non puoi rimuovere il tuo stesso ruolo admin.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (updateError) {
      console.error('Errore cambio ruolo:', updateError);
      setError(updateError.message.includes('admin') ? 'Massimo 2 admin consentiti' : 'Errore nel salvataggio');
      setSaving(false);
      return;
    }

    setRole(newRole);
    setSaving(false);
  }

  const currentRoleData = roles.find(r => r.value === role) || roles[0];

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={role}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          border: `2px solid ${currentRoleData.color}`,
          background: `${currentRoleData.color}15`,
          color: currentRoleData.color,
          fontWeight: 600,
          fontSize: 13,
          cursor: saving ? 'wait' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {roles.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {error && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 4,
          padding: '4px 8px',
          background: '#fef2f2',
          color: '#b91c1c',
          fontSize: 11,
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

